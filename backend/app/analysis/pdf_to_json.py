"""
Extract tables from PDF file.
"""

import hashlib
import json
import os
import re
import time
import unicodedata
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

import camelot
import pandas as pd
import pdfplumber
import requests
from tqdm import tqdm

from ..utils.string_parsing import is_number

warnings.filterwarnings(
    "ignore",
    message="Downcasting behavior in `replace` is deprecated.*",
    category=FutureWarning,
)

try:
    pd.set_option("future.no_silent_downcasting", True)
except pd.errors.OptionError:
    pass

NUTRIENT_KEYS = ("calories", "protein", "carbs", "fat")
AI_ESTIMATE_SOURCE = "ai_estimated"
PDF_SOURCE = "pdf"
CALCULATED_SOURCE = "calculated_from_macros"
AI_ESTIMATES_ENABLED_VALUES = {"1", "true", "yes", "on"}
DEFAULT_AI_ESTIMATE_CACHE_PATH = (
    "app/restaurant_caches/ai_nutrition_estimates_cache.json"
)
AI_ESTIMATE_CACHE_VERSION = 1
AI_ESTIMATE_PROMPT_VERSION = "2026-06-07"
_LOCAL_ENV_LOADED = False

AiNutritionEstimator = Callable[
    [str, str, Dict[str, Optional[float]]], Optional[Dict[str, Any]]
]


@dataclass
class ParsedTable:
    """A normalized table extracted from a PDF page."""

    df: pd.DataFrame
    accuracy: float
    extraction_method: str
    page_number: int


def _download_pdf(url: str, tmp_path: Path) -> None:
    """Download PDF from URL and save to temporary file.

    Args:
        url (str): The URL of the PDF file to download.
        tmp_path (Path): The temporary file path to save the PDF.
    """
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    pdf_bytes = response.content
    if not pdf_bytes:
        raise ValueError(f"Downloaded empty PDF from {url}")
    tmp_path.write_bytes(pdf_bytes)


def _table_accuracy(table: Any) -> float:
    """Return a Camelot table's accuracy across Camelot versions."""
    accuracy = getattr(table, "accuracy", None)
    if accuracy is None:
        parsing_report = getattr(table, "parsing_report", {}) or {}
        accuracy = parsing_report.get("accuracy", 100)

    try:
        return float(accuracy)
    except (TypeError, ValueError):
        return 100.0


def _normalize_whitespace(value: Any) -> str:
    """Normalize whitespace in scraped cells and names."""
    return " ".join(str(value).replace("\xa0", " ").split())


def _dataframe_fingerprint(df: pd.DataFrame) -> Tuple[Tuple[str, ...], ...]:
    """Create a stable fingerprint so fallback extractors do not duplicate tables."""
    rows = []
    for row in df.fillna("").values.tolist():
        rows.append(tuple(_normalize_whitespace(cell) for cell in row))
    return tuple(rows)


def _add_extracted_table(
    tables: List[ParsedTable],
    seen_tables: Set[Tuple[Tuple[str, ...], ...]],
    df: pd.DataFrame,
    accuracy: float,
    extraction_method: str,
    page_number: int,
) -> None:
    """Add a table once, ignoring empty and duplicate extraction results."""
    if df.empty or len(df.columns) < 2:
        return

    fingerprint = _dataframe_fingerprint(df)
    if fingerprint in seen_tables:
        return

    seen_tables.add(fingerprint)
    tables.append(
        ParsedTable(
            df=df.fillna(""),
            accuracy=accuracy,
            extraction_method=extraction_method,
            page_number=page_number,
        )
    )


def _extract_tables_from_pdf(tmp_path: Path) -> List[ParsedTable]:
    """Extract tables from PDF file using camelot and pdfplumber.

    Args:
        tmp_path (Path): Path to the temporary PDF file.

    Returns:
        List[ParsedTable]: Cleaned tables from all available extractors.
    """
    cleaned_pdf_pages: List[ParsedTable] = []
    seen_tables: Set[Tuple[Tuple[str, ...], ...]] = set()

    with pdfplumber.open(tmp_path) as pdf:
        for i, page in enumerate(
            tqdm(pdf.pages, desc="Processing PDF pages", unit="page")
        ):
            page_number = i + 1
            page_table_count = len(cleaned_pdf_pages)
            for flavor in ("lattice", "stream", "hybrid"):
                try:
                    tables = camelot.read_pdf(
                        tmp_path, pages=str(page_number), flavor=flavor
                    )
                except Exception:  # pylint: disable=broad-exception-caught
                    continue

                for table in tables:
                    accuracy = _table_accuracy(table)
                    if accuracy < 80:
                        continue
                    _add_extracted_table(
                        cleaned_pdf_pages,
                        seen_tables,
                        table.df,
                        accuracy,
                        f"camelot:{flavor}",
                        page_number,
                    )

            if len(cleaned_pdf_pages) > page_table_count:
                continue

            extract_tables = getattr(page, "extract_tables", None)
            if not callable(extract_tables):
                continue

            try:
                pdfplumber_tables = extract_tables() or []
            except Exception:  # pylint: disable=broad-exception-caught
                pdfplumber_tables = []

            for rows in pdfplumber_tables:
                if not rows:
                    continue
                _add_extracted_table(
                    cleaned_pdf_pages,
                    seen_tables,
                    pd.DataFrame(rows),
                    0.0,
                    "pdfplumber",
                    page_number,
                )

    return cleaned_pdf_pages


def _find_column_indices_from_headers(
    df,
) -> Tuple[Optional[int], Optional[int], Optional[int], Optional[int]]:
    """Find nutrition column indices from DataFrame column headers.

    Args:
        df: DataFrame to search for column headers.

    Returns:
        Tuple of column indices for calories, protein, carbs, fat
        (or None if not found).
    """
    calorie_col_idx = None
    protein_col_idx = None
    carb_col_idx = None
    fat_col_idx = None

    for idx, col_name in enumerate(df.columns):
        col_name_lower = str(col_name).lower()
        if _looks_like_calorie_header(col_name_lower):
            calorie_col_idx = idx
        elif _looks_like_protein_header(col_name_lower):
            protein_col_idx = idx
        elif _looks_like_carb_header(col_name_lower):
            carb_col_idx = idx
        elif _looks_like_fat_header(col_name_lower):
            fat_col_idx = idx

    return calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx


def _contains_any_word(value: str, words: Tuple[str, ...]) -> bool:
    """Check for whole-word matches, allowing accented PDF text."""
    for word in words:
        if re.search(rf"(^|[^a-zA-ZÀ-ÿ]){re.escape(word)}([^a-zA-ZÀ-ÿ]|$)", value):
            return True
    return False


def _looks_like_calorie_header(value: str) -> bool:
    """Return whether text identifies a calorie/energy column."""
    value = value.lower()
    if "calcium" in value:
        return False
    return _contains_any_word(
        value,
        ("cal", "cals", "kcal", "calorie", "calories", "energy", "energie", "énergie"),
    )


def _looks_like_protein_header(value: str) -> bool:
    """Return whether text identifies a protein column."""
    return _contains_any_word(
        value.lower(),
        (
            "protein",
            "proteins",
            "protein(g)",
            "prot",
            "proteine",
            "proteines",
            "protéine",
            "protéines",
        ),
    )


def _looks_like_carb_header(value: str) -> bool:
    """Return whether text identifies a carbohydrate column."""
    return _contains_any_word(
        value.lower(),
        ("carb", "carbs", "carbohydrate", "carbohydrates", "glucide", "glucides"),
    )


def _looks_like_fat_header(value: str) -> bool:
    """Return whether text identifies a total fat column."""
    value = value.lower()
    if any(keyword in value for keyword in ("saturated", "trans", "calories", "kcal")):
        return False
    return _contains_any_word(
        value,
        ("fat", "fats", "lipid", "lipids", "gras", "lipide", "lipides"),
    )


def _find_column_indices_from_cells(
    df,
) -> Tuple[Optional[int], Optional[int], Optional[int], Optional[int]]:
    """Find nutrition column indices by searching through cell values.

    Args:
        df: DataFrame to search through cell values.

    Returns:
        Tuple of column indices for calories, protein, carbs, fat
        (or None if not found).
    """
    calorie_col_idx = None
    protein_col_idx = None
    carb_col_idx = None
    fat_col_idx = None

    rows_to_scan = min(len(df), 8)
    for row_idx in range(rows_to_scan):
        for col_idx in range(1, len(df.columns)):
            cell_value = str(df.iloc[row_idx, col_idx]).lower()

            if calorie_col_idx is None and _looks_like_calorie_header(cell_value):
                calorie_col_idx = col_idx
            elif protein_col_idx is None and _looks_like_protein_header(cell_value):
                protein_col_idx = col_idx
            elif carb_col_idx is None and _looks_like_carb_header(cell_value):
                carb_col_idx = col_idx
            elif fat_col_idx is None and _looks_like_fat_header(cell_value):
                fat_col_idx = col_idx

    return calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx


def _find_dish_column_index(
    df,
    nutrition_column_indices: Tuple[
        Optional[int], Optional[int], Optional[int], Optional[int]
    ],
) -> int:
    """Choose the most likely dish/name column instead of assuming column 0."""
    nutrition_columns = {idx for idx in nutrition_column_indices if idx is not None}
    best_col_idx = 0
    best_score = -1

    for col_idx in range(len(df.columns)):
        if col_idx in nutrition_columns:
            continue

        score = 0
        rows_to_scan = min(len(df), 25)
        for row_idx in range(rows_to_scan):
            value = df.iloc[row_idx, col_idx]
            if _is_valid_dish_name(value):
                score += 1

        if score > best_score:
            best_score = score
            best_col_idx = col_idx

    return best_col_idx


def _is_valid_dish_name(dish_name: str) -> bool:
    """Check if the dish name is valid (not a nutrition header or just numbers).

    Args:
        dish_name (str): The dish name to validate.

    Returns:
        bool: True if valid dish name, False if it's a nutrition header or just numbers.
    """
    if dish_name is None or str(dish_name).strip() == "":
        return False

    dish_name_str = _normalize_whitespace(dish_name)
    dish_name_lower = dish_name_str.lower()

    if dish_name_str.replace(" ", "").replace(",", "").replace(".", "").isdigit():
        return False

    normalized = re.sub(r"[^a-zA-ZÀ-ÿ]+", " ", dish_name_lower).strip()
    header_phrases = {
        "cal",
        "kcal",
        "energy",
        "energie",
        "énergie",
        "calories",
        "protein",
        "proteins",
        "protein g",
        "protéine",
        "protéines",
        "carb",
        "carbohydrate",
        "carbohydrates",
        "carbs",
        "fat",
        "fats",
        "lipid",
        "lipids",
        "nutrition",
        "nutrition facts",
        "nutritional information",
        "serving",
        "serving size",
        "portion",
        "portion size",
        "amount per serving",
        "menu item",
        "item",
        "description",
    }
    if normalized in header_phrases:
        return False

    words = normalized.split()
    header_words = {
        "cal",
        "kcal",
        "energy",
        "energie",
        "énergie",
        "calories",
        "protein",
        "proteins",
        "protéine",
        "protéines",
        "carb",
        "carbohydrate",
        "carbohydrates",
        "carbs",
        "fat",
        "fats",
        "lipid",
        "lipids",
        "nutrition",
        "serving",
        "portion",
        "size",
        "grams",
        "gram",
        "g",
    }
    if words and all(word in header_words for word in words):
        return False

    return True


def _coerce_nutrition_value(value: Any) -> Optional[float]:
    """Extract a numeric nutrition value from a scraped cell."""
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, (int, float)):
        return _normalize_numeric_value(float(value))

    value_str = str(value).strip()
    if not value_str:
        return None

    normalized = value_str.lower().replace(",", "")
    if normalized in {"-", "--", "—", "n/a", "na", "not available"}:
        return None

    if is_number(normalized):
        return _normalize_numeric_value(float(normalized))

    numbers = re.findall(r"[-+]?\d+(?:\.\d+)?", normalized)
    if not numbers:
        return None

    numeric_values = [float(number) for number in numbers]
    if normalized.lstrip().startswith("<"):
        return (
            0.5
            if numeric_values[0] <= 1
            else _normalize_numeric_value(numeric_values[0])
        )

    if len(numeric_values) >= 2 and re.search(r"\d\s*(?:-|to)\s*\d", normalized):
        return _normalize_numeric_value(sum(numeric_values[:2]) / 2)

    return _normalize_numeric_value(numeric_values[0])


def _normalize_numeric_value(value: float) -> float:
    """Keep integer-looking values as ints for stable JSON output."""
    rounded = round(value, 2)
    if float(rounded).is_integer():
        return int(rounded)
    return rounded


def _has_complete_nutrition_data(
    df,
    row_idx: int,
    calorie_col_idx: Optional[int],
    protein_col_idx: Optional[int],
    carb_col_idx: Optional[int],
    fat_col_idx: Optional[int],
) -> bool:
    """Check if a row has complete nutrition data.

    Args:
        df: DataFrame containing the data.
        row_idx (int): Row index to check.
        calorie_col_idx (Optional[int]): Column index for calories.
        protein_col_idx (Optional[int]): Column index for protein.
        carb_col_idx (Optional[int]): Column index for carbs.
        fat_col_idx (Optional[int]): Column index for fat.

    Returns:
        bool: True if all nutrition data is present and not empty.
    """
    if any(
        col_idx is None
        for col_idx in [calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx]
    ):
        return False

    nutrition_values = [
        df.iloc[row_idx, calorie_col_idx],
        df.iloc[row_idx, protein_col_idx],
        df.iloc[row_idx, carb_col_idx],
        df.iloc[row_idx, fat_col_idx],
    ]

    return all(_coerce_nutrition_value(value) is not None for value in nutrition_values)


def _extract_dish_data(
    df,
    row_idx: int,
    dish_col_idx: int,
    calorie_col_idx: Optional[int],
    protein_col_idx: Optional[int],
    carb_col_idx: Optional[int],
    fat_col_idx: Optional[int],
) -> Dict:
    """Extract dish data from a DataFrame row.

    Args:
        df: DataFrame containing the data.
        row_idx (int): Row index to extract data from.
        dish_col_idx (int): Column index for the dish name.
        calorie_col_idx (Optional[int]): Column index for calories.
        protein_col_idx (Optional[int]): Column index for protein.
        carb_col_idx (Optional[int]): Column index for carbs.
        fat_col_idx (Optional[int]): Column index for fat.

    Returns:
        Dict: Dictionary containing dish name and nutrition data.
    """
    return {
        "dish": _clean_dish_display_name(df.iloc[row_idx, dish_col_idx]),
        "calories": _coerce_nutrition_value(
            df.iloc[row_idx, calorie_col_idx]
            if calorie_col_idx is not None and calorie_col_idx < len(df.columns)
            else None
        ),
        "protein": _coerce_nutrition_value(
            df.iloc[row_idx, protein_col_idx]
            if protein_col_idx is not None and protein_col_idx < len(df.columns)
            else None
        ),
        "carbs": _coerce_nutrition_value(
            df.iloc[row_idx, carb_col_idx]
            if carb_col_idx is not None and carb_col_idx < len(df.columns)
            else None
        ),
        "fat": _coerce_nutrition_value(
            df.iloc[row_idx, fat_col_idx]
            if fat_col_idx is not None and fat_col_idx < len(df.columns)
            else None
        ),
    }


FRENCH_MENU_WORDS = {
    "ail",
    "au",
    "aux",
    "avec",
    "beignet",
    "beignets",
    "bifteck",
    "blanc",
    "boeuf",
    "bœuf",
    "cafe",
    "café",
    "caramel",
    "chaud",
    "chocolat",
    "chou",
    "classique",
    "cote",
    "côte",
    "crevette",
    "crevettes",
    "de",
    "des",
    "du",
    "et",
    "fleur",
    "fromage",
    "glace",
    "glacé",
    "glacée",
    "gratine",
    "gratiné",
    "gratinée",
    "grille",
    "grillé",
    "grillée",
    "haut",
    "homard",
    "lait",
    "miel",
    "oignon",
    "pain",
    "panachee",
    "panachée",
    "petoncles",
    "pétoncles",
    "pommes",
    "poulet",
    "queue",
    "salade",
    "sans",
    "soupe",
    "surlonge",
    "thé",
    "thon",
    "trempette",
    "vanille",
    "vert",
    "vinaigrette",
}

SERVING_SIZE_WORDS = {
    "bottle",
    "bowl",
    "can",
    "cup",
    "cups",
    "fl",
    "g",
    "gallon",
    "gallons",
    "gram",
    "grams",
    "kg",
    "l",
    "lb",
    "lbs",
    "liter",
    "litre",
    "ml",
    "oz",
    "ounce",
    "ounces",
    "pc",
    "pcs",
    "piece",
    "pieces",
    "serving",
    "size",
}

NUMBER_WORDS = {
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
}


def _strip_accents(value: str) -> str:
    """Remove accents for duplicate comparison while preserving display text."""
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(char)
    )


def _tokenize_name(value: str) -> List[str]:
    """Tokenize a menu name for language and duplicate checks."""
    ascii_value = _strip_accents(value.lower())
    return re.findall(r"[a-z0-9]+", ascii_value)


def _french_language_score(value: str) -> int:
    """Estimate whether a dish name is likely French."""
    tokens = _tokenize_name(value)
    score = sum(1 for token in tokens if token in FRENCH_MENU_WORDS)
    if re.search(r"[éèêàâçôûùîïœÉÈÊÀÂÇÔÛÙÎÏŒ]", value):
        score += 2
    return score


def _is_likely_french_name(value: str) -> bool:
    """Return whether a display name appears to be French."""
    return _french_language_score(value) >= 2


def _is_serving_size_segment(value: str) -> bool:
    """Avoid treating serving-size slashes like '(20 oz / bone-in)' as bilingual."""
    tokens = _tokenize_name(value)
    if not tokens:
        return False

    has_number = any(token.isdigit() for token in tokens)
    has_serving_word = any(token in SERVING_SIZE_WORDS for token in tokens)
    return has_number and has_serving_word and len(tokens) <= 4


def _is_likely_bilingual_segments(segments: List[str]) -> bool:
    """Return whether slash/newline segments look like English/French labels."""
    if len(segments) < 2:
        return False

    if any(_is_serving_size_segment(segment) for segment in segments):
        return False

    french_scores = [_french_language_score(segment) for segment in segments]
    return max(french_scores) >= 2 and min(french_scores) == 0


def _clean_dish_display_name(raw_name: Any) -> str:
    """Clean a scraped dish name and prefer English from bilingual labels."""
    dish_name = str(raw_name).replace("\n", " / ")
    dish_name = _normalize_whitespace(dish_name)
    dish_name = re.sub(r"\s+([,;)])", r"\1", dish_name)
    dish_name = re.sub(r"([([])\s+", r"\1", dish_name)
    dish_name = dish_name.strip(" -*•")

    segments = [
        segment.strip(" -*•")
        for segment in re.split(r"\s+/\s+|\s+\|\s+", dish_name)
        if segment.strip(" -*•")
    ]
    if _is_likely_bilingual_segments(segments):
        dish_name = min(
            enumerate(segments),
            key=lambda indexed_segment: (
                _french_language_score(indexed_segment[1]),
                indexed_segment[0],
            ),
        )[1]

    return _normalize_whitespace(dish_name)


def _normalize_dish_name_for_dedupe(dish_name: str) -> str:
    """Normalize display names for stable exact duplicate removal."""
    normalized = _strip_accents(dish_name.lower())
    tokens = re.findall(r"[a-z0-9]+", normalized)
    tokens = [NUMBER_WORDS.get(token, token) for token in tokens]
    return " ".join(tokens)


def _nutrition_signature(
    item: Dict[str, Any],
) -> Optional[Tuple[float, float, float, float]]:
    """Return comparable nutrition values when all fields are present."""
    values = []
    for key in NUTRIENT_KEYS:
        value = _coerce_nutrition_value(item.get(key))
        if value is None:
            return None
        values.append(float(value))
    return tuple(values)  # type: ignore[return-value]


def _is_zero_nutrition_signature(signature: Tuple[float, float, float, float]) -> bool:
    """Zero-calorie drinks often share values but are not duplicate dishes."""
    return all(value == 0 for value in signature)


def _is_probable_translation_duplicate(
    existing_item: Dict[str, Any],
    candidate_item: Dict[str, Any],
) -> bool:
    """Detect English/French duplicate rows with identical nutrition."""
    existing_signature = _nutrition_signature(existing_item)
    candidate_signature = _nutrition_signature(candidate_item)
    if (
        existing_signature is None
        or candidate_signature is None
        or existing_signature != candidate_signature
    ):
        return False

    if _is_zero_nutrition_signature(existing_signature):
        return False

    existing_name = str(existing_item.get("dish", ""))
    candidate_name = str(candidate_item.get("dish", ""))
    existing_tokens = _tokenize_name(existing_name)
    candidate_tokens = _tokenize_name(candidate_name)
    if min(len(existing_tokens), len(candidate_tokens)) < 2:
        return False

    return _is_likely_french_name(existing_name) != _is_likely_french_name(
        candidate_name
    )


def _item_quality_score(item: Dict[str, Any]) -> Tuple[int, int, int]:
    """Prefer PDF-derived English rows over generated or translated duplicates."""
    field_sources = item.get("field_sources", {})
    pdf_fields = sum(1 for source in field_sources.values() if source == PDF_SOURCE)
    non_french = 0 if _is_likely_french_name(str(item.get("dish", ""))) else 1
    not_ai = 0 if item.get("nutrition_source") == AI_ESTIMATE_SOURCE else 1
    return (non_french, not_ai, pdf_fields)


def _choose_better_duplicate(
    existing_item: Dict[str, Any], candidate_item: Dict[str, Any]
) -> Dict[str, Any]:
    """Pick the better item when two rows represent the same dish."""
    if _item_quality_score(candidate_item) > _item_quality_score(existing_item):
        return candidate_item
    return existing_item


def _macro_calorie_estimate(values: Dict[str, Optional[float]]) -> Optional[int]:
    """Estimate calories from macros when PDFs omit calories but include grams."""
    protein = values.get("protein")
    carbs = values.get("carbs")
    fat = values.get("fat")
    if protein is None or carbs is None or fat is None:
        return None
    return int(round((protein * 4) + (carbs * 4) + (fat * 9)))


def _parse_env_line(line: str) -> Optional[Tuple[str, str]]:
    """Parse a simple KEY=VALUE env file line."""
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None

    if stripped.startswith("export "):
        stripped = stripped[len("export ") :].strip()

    key, value = stripped.split("=", 1)
    key = key.strip()
    value = value.strip().strip("'\"")
    if not key:
        return None
    return key, value


def _load_local_env() -> None:
    """Load ignored local env files once without overriding real environment vars."""
    global _LOCAL_ENV_LOADED  # pylint: disable=global-statement
    if _LOCAL_ENV_LOADED:
        return

    candidate_paths = [
        Path(".env"),
        Path("backend/.env"),
        Path(__file__).resolve().parents[3] / ".env",
        Path(__file__).resolve().parents[2] / ".env",
    ]
    seen_paths = set()

    for env_path in candidate_paths:
        resolved_path = env_path.resolve()
        if resolved_path in seen_paths or not resolved_path.exists():
            continue
        seen_paths.add(resolved_path)

        try:
            for line in resolved_path.read_text(encoding="utf-8").splitlines():
                parsed = _parse_env_line(line)
                if parsed is None:
                    continue
                key, value = parsed
                os.environ.setdefault(key, value)
        except OSError:
            continue

    _LOCAL_ENV_LOADED = True


def _ai_estimate_cache_path() -> Path:
    """Return the configured AI estimate cache path."""
    _load_local_env()
    return Path(
        os.environ.get("SHREDR_AI_ESTIMATE_CACHE_PATH", DEFAULT_AI_ESTIMATE_CACHE_PATH)
    )


def _empty_ai_estimate_cache() -> Dict[str, Any]:
    """Return an empty cache payload."""
    return {"version": AI_ESTIMATE_CACHE_VERSION, "responses": {}}


def _load_ai_estimate_cache(cache_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the AI estimate cache from disk."""
    path = cache_path or _ai_estimate_cache_path()
    if not path.exists():
        return _empty_ai_estimate_cache()

    try:
        cache_data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return _empty_ai_estimate_cache()

    if not isinstance(cache_data, dict) or not isinstance(
        cache_data.get("responses"), dict
    ):
        return _empty_ai_estimate_cache()

    cache_data.setdefault("version", AI_ESTIMATE_CACHE_VERSION)
    return cache_data


def _save_ai_estimate_cache(
    cache_data: Dict[str, Any], cache_path: Optional[Path] = None
) -> None:
    """Persist the AI estimate cache to disk."""
    path = cache_path or _ai_estimate_cache_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(f"{path.suffix}.tmp")
    tmp_path.write_text(
        json.dumps(cache_data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    tmp_path.replace(path)


def _normalized_known_values(
    known_values: Dict[str, Optional[float]],
) -> Dict[str, Optional[float]]:
    """Normalize known values for stable cache keys."""
    return {
        key: _coerce_nutrition_value(known_values.get(key)) for key in NUTRIENT_KEYS
    }


def _ai_estimate_cache_key(
    dish_name: str,
    restaurant_name: str,
    known_values: Dict[str, Optional[float]],
) -> str:
    """Create a stable cache key for an AI nutrition estimate request."""
    cache_payload = {
        "prompt_version": AI_ESTIMATE_PROMPT_VERSION,
        "restaurant_name": _normalize_whitespace(restaurant_name).lower(),
        "dish_name": _normalize_whitespace(dish_name).lower(),
        "known_values": _normalized_known_values(known_values),
    }
    serialized = json.dumps(cache_payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _estimate_nutrition_with_cache(
    dish_name: str,
    restaurant_name: str,
    known_values: Dict[str, Optional[float]],
    estimator: AiNutritionEstimator,
    cache_path: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """Use cached AI nutrition output before calling the underlying estimator."""
    cache_data = _load_ai_estimate_cache(cache_path)
    cache_key = _ai_estimate_cache_key(dish_name, restaurant_name, known_values)
    cached_entry = cache_data.get("responses", {}).get(cache_key)

    if isinstance(cached_entry, dict) and isinstance(
        cached_entry.get("response"), dict
    ):
        return cached_entry["response"]

    response = estimator(dish_name, restaurant_name, known_values)
    if response is None:
        return None

    response_data = {
        key: _coerce_nutrition_value(response.get(key)) for key in NUTRIENT_KEYS
    }
    if any(value is None for value in response_data.values()):
        return None

    cache_data.setdefault("responses", {})[cache_key] = {
        "restaurant_name": restaurant_name,
        "dish_name": dish_name,
        "known_values": _normalized_known_values(known_values),
        "response": response_data,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    _save_ai_estimate_cache(cache_data, cache_path)

    return response_data


def _ai_estimates_enabled() -> bool:
    """Return whether network AI estimates are explicitly enabled."""
    _load_local_env()
    return (
        os.environ.get("SHREDR_ENABLE_AI_ESTIMATES", "").strip().lower()
        in AI_ESTIMATES_ENABLED_VALUES
    )


def _extract_response_text(response_data: Dict[str, Any]) -> str:
    """Extract text from an OpenAI Responses API payload."""
    output_text = response_data.get("output_text")
    if isinstance(output_text, str):
        return output_text

    text_parts = []
    for output_item in response_data.get("output", []) or []:
        for content in output_item.get("content", []) or []:
            if isinstance(content, dict):
                text = content.get("text")
                if isinstance(text, str):
                    text_parts.append(text)
    return "\n".join(text_parts)


def _openai_nutrition_estimator(
    dish_name: str,
    restaurant_name: str,
    known_values: Dict[str, Optional[float]],
) -> Optional[Dict[str, Any]]:
    """Estimate missing nutrition values using OpenAI when explicitly configured."""
    _load_local_env()
    if not _ai_estimates_enabled():
        return None

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.environ.get("SHREDR_OPENAI_MODEL", "gpt-4o-mini")
    prompt = {
        "restaurant": restaurant_name,
        "dish": dish_name,
        "known_values": known_values,
        "instructions": (
            "Estimate nutrition for this restaurant menu item when official "
            "PDF extraction is incomplete. Preserve known values exactly. "
            "Estimate only missing or null fields. Return JSON only with "
            "numeric calories, protein, carbs, and fat. Calories must be kcal. "
            "Protein, carbs, and fat must be grams. Use realistic restaurant "
            "serving sizes and keep estimates conservative and internally "
            "consistent."
        ),
    }
    payload = {
        "model": model,
        "input": [
            {
                "role": "system",
                "content": (
                    "You estimate restaurant menu nutrition when official PDF "
                    "extraction is incomplete. Return JSON only. No markdown, "
                    "no prose. Preserve any known_values exactly. Estimate "
                    "only missing or null fields. If calories are known, make "
                    "protein, carbs, and fat roughly compatible with that "
                    "calorie total using 4 kcal/g protein, 4 kcal/g carbs, "
                    "and 9 kcal/g fat. If calories are missing but all macros "
                    "are known, calculate calories from macros. Use numbers "
                    "only, not ranges or strings."
                ),
            },
            {"role": "user", "content": json.dumps(prompt)},
        ],
        "temperature": 0.2,
    }

    try:
        response = requests.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        response_text = _extract_response_text(response.json())
        return json.loads(response_text)
    except Exception:  # pylint: disable=broad-exception-caught
        return None


def _configured_ai_estimator() -> Optional[AiNutritionEstimator]:
    """Return the configured AI estimator, if the environment enables it."""
    _load_local_env()
    if _ai_estimates_enabled() and os.environ.get("OPENAI_API_KEY"):
        return lambda dish_name, restaurant_name, known_values: (
            _estimate_nutrition_with_cache(
                dish_name,
                restaurant_name,
                known_values,
                _openai_nutrition_estimator,
            )
        )
    return None


def _complete_nutrition_data(
    dish_data: Dict[str, Any],
    restaurant_name: str,
    ai_estimator: Optional[AiNutritionEstimator],
) -> Optional[Dict[str, Any]]:
    """Fill missing nutrition values using deterministic and AI fallbacks."""
    values: Dict[str, Optional[float]] = {
        key: _coerce_nutrition_value(dish_data.get(key)) for key in NUTRIENT_KEYS
    }
    field_sources = {
        key: PDF_SOURCE for key, value in values.items() if value is not None
    }
    estimated_fields: List[str] = []

    if values["calories"] is None:
        calories_from_macros = _macro_calorie_estimate(values)
        if calories_from_macros is not None:
            values["calories"] = calories_from_macros
            field_sources["calories"] = CALCULATED_SOURCE
            estimated_fields.append("calories")

    missing_fields = [key for key, value in values.items() if value is None]
    if missing_fields and ai_estimator is not None:
        ai_values = ai_estimator(
            str(dish_data.get("dish", "")),
            restaurant_name,
            values,
        )
        if ai_values:
            for key in missing_fields:
                ai_value = _coerce_nutrition_value(ai_values.get(key))
                if ai_value is not None:
                    values[key] = ai_value
                    field_sources[key] = AI_ESTIMATE_SOURCE
                    estimated_fields.append(key)

    if any(values[key] is None for key in NUTRIENT_KEYS):
        return None

    completed = dish_data.copy()
    for key in NUTRIENT_KEYS:
        completed[key] = values[key]

    completed["field_sources"] = field_sources
    completed["estimated_fields"] = sorted(set(estimated_fields))
    if any(source == AI_ESTIMATE_SOURCE for source in field_sources.values()):
        completed["nutrition_source"] = AI_ESTIMATE_SOURCE
    elif estimated_fields:
        completed["nutrition_source"] = "calculated"
    else:
        completed["nutrition_source"] = PDF_SOURCE

    return completed


def clean_dish_data(dish_data: Dict[str, Any]) -> Dict[str, Any]:
    """Clean dish data by removing repeated dishes.

    Args:
        dish_data (Dict[str, Any]): The dish data to clean.

    Returns:
        Dict[str, Any]: The cleaned dish data.
    """
    cleaned_data = dish_data.copy()

    if "menu_items" not in cleaned_data:
        return cleaned_data

    menu_items = cleaned_data["menu_items"]

    seen_dishes: Dict[str, int] = {}
    unique_menu_items: List[Dict[str, Any]] = []

    for item in menu_items:
        if "dish" not in item:
            continue

        dish_name = _clean_dish_display_name(item["dish"])
        if not _is_valid_dish_name(dish_name):
            continue

        normalized_dish_name = _normalize_dish_name_for_dedupe(dish_name)
        item_copy = item.copy()
        item_copy["dish"] = dish_name

        if normalized_dish_name in seen_dishes:
            existing_idx = seen_dishes[normalized_dish_name]
            unique_menu_items[existing_idx] = _choose_better_duplicate(
                unique_menu_items[existing_idx], item_copy
            )
            continue

        duplicate_idx = None
        for idx, existing_item in enumerate(unique_menu_items):
            if _is_probable_translation_duplicate(existing_item, item_copy):
                duplicate_idx = idx
                break

        if duplicate_idx is not None:
            better_item = _choose_better_duplicate(
                unique_menu_items[duplicate_idx], item_copy
            )
            old_key = _normalize_dish_name_for_dedupe(
                str(unique_menu_items[duplicate_idx].get("dish", ""))
            )
            new_key = _normalize_dish_name_for_dedupe(str(better_item.get("dish", "")))
            unique_menu_items[duplicate_idx] = better_item
            seen_dishes.pop(old_key, None)
            seen_dishes[new_key] = duplicate_idx
            continue

        seen_dishes[normalized_dish_name] = len(unique_menu_items)
        unique_menu_items.append(item_copy)

    cleaned_data["menu_items"] = unique_menu_items
    cleaned_data["uses_ai_estimates"] = any(
        item.get("nutrition_source") == AI_ESTIMATE_SOURCE
        for item in cleaned_data["menu_items"]
    )
    cleaned_data["estimated_item_count"] = sum(
        1
        for item in cleaned_data["menu_items"]
        if item.get("nutrition_source") == AI_ESTIMATE_SOURCE
    )

    return cleaned_data


def _process_table_data(
    tables: List[Any],
    restaurant_name: str = "",
    ai_estimator: Optional[AiNutritionEstimator] = None,
) -> List[Dict]:
    """Process extracted tables to extract nutrition data.

    Args:
        tables (List[Any]): Tables extracted from PDF.
        restaurant_name (str): Restaurant name for AI-estimation context.
        ai_estimator (Optional[AiNutritionEstimator]): Optional fallback estimator.

    Returns:
        List[Dict]: List of dictionaries containing dish and nutrition data.
    """
    json_data = []

    for table in tables:
        df = table.df

        calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx = (
            _find_column_indices_from_headers(df)
        )

        if None in [calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx]:
            (
                cell_calorie_col_idx,
                cell_protein_col_idx,
                cell_carb_col_idx,
                cell_fat_col_idx,
            ) = _find_column_indices_from_cells(df)

            if calorie_col_idx is None:
                calorie_col_idx = cell_calorie_col_idx
            if protein_col_idx is None:
                protein_col_idx = cell_protein_col_idx
            if carb_col_idx is None:
                carb_col_idx = cell_carb_col_idx
            if fat_col_idx is None:
                fat_col_idx = cell_fat_col_idx

        nutrition_indices = (
            calorie_col_idx,
            protein_col_idx,
            carb_col_idx,
            fat_col_idx,
        )
        if all(col_idx is None for col_idx in nutrition_indices):
            continue

        dish_col_idx = _find_dish_column_index(df, nutrition_indices)

        for row_idx in range(len(df)):
            dish_name = df.iloc[row_idx, dish_col_idx]

            if not _is_valid_dish_name(dish_name):
                continue

            dish_data = _extract_dish_data(
                df,
                row_idx,
                dish_col_idx,
                calorie_col_idx,
                protein_col_idx,
                carb_col_idx,
                fat_col_idx,
            )
            completed_dish_data = _complete_nutrition_data(
                dish_data,
                restaurant_name,
                ai_estimator,
            )
            if completed_dish_data is not None:
                json_data.append(completed_dish_data)

    return json_data


def _save_json_data(json_data: Dict[str, Any], out_json_path: Path) -> None:
    """Save extracted data to JSON file.

    Args:
        json_data (Dict[str, Any]): Dictionary containing restaurant data
            including menu items.
        out_json_path (Path): Path to output JSON file.
    """
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f)


def pdf_to_json(
    url: str,
    out_json: str,
    restaurant_name: str,
    ai_estimator: Optional[AiNutritionEstimator] = None,
) -> Dict[str, Any]:
    """Convert a PDF file to a JSON file and return the extracted data.

    Args:
        url (str): The URL of the PDF file to convert.
        out_json (str): The path to the output JSON file.
        restaurant_name (str): The name of the restaurant.
        ai_estimator (Optional[AiNutritionEstimator]): Fallback estimator for
            missing nutrition fields. If omitted, an OpenAI estimator is used only
            when SHREDR_ENABLE_AI_ESTIMATES and OPENAI_API_KEY are configured.

    Returns:
        Dict[str, Any]: The extracted restaurant data including menu items.
    """
    out_json_path = Path(out_json)
    tmp_path = out_json_path.with_suffix(".pdf")
    estimator = ai_estimator if ai_estimator is not None else _configured_ai_estimator()

    try:
        _download_pdf(url, tmp_path)

        cleaned_pdf_pages = _extract_tables_from_pdf(tmp_path)

        json_data = {
            "restaurant_name": restaurant_name,
            "url": url,
            "date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "menu_items": _process_table_data(
                cleaned_pdf_pages,
                restaurant_name=restaurant_name,
                ai_estimator=estimator,
            ),
        }

        json_data = clean_dish_data(json_data)

        _save_json_data(json_data, out_json_path)

        return json_data

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def has_menu_items(json_data: Dict[str, Any]) -> bool:
    """Check if the extracted data contains valid menu items.

    Args:
        json_data (Dict[str, Any]): The extracted restaurant data.

    Returns:
        bool: True if menu items are present and non-empty, False otherwise.
    """
    return (
        "menu_items" in json_data
        and isinstance(json_data["menu_items"], list)
        and len(json_data["menu_items"]) > 0
    )
