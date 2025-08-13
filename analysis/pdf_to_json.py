"""
Extract tables from PDF file.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import camelot
import pdfplumber
import requests
from tqdm import tqdm


def _download_pdf(url: str, tmp_path: Path) -> None:
    """Download PDF from URL and save to temporary file.

    Args:
        url (str): The URL of the PDF file to download.
        tmp_path (Path): The temporary file path to save the PDF.
    """
    pdf_bytes = requests.get(url, timeout=30).content
    tmp_path.write_bytes(pdf_bytes)


def _extract_tables_from_pdf(tmp_path: Path) -> Set:
    """Extract tables from PDF file using camelot and pdfplumber.

    Args:
        tmp_path (Path): Path to the temporary PDF file.

    Returns:
        Set: Set of cleaned tables with accuracy >= 80%.
    """
    cleaned_pdf_pages = set()

    with pdfplumber.open(tmp_path) as pdf:
        for i, _ in enumerate(
            tqdm(pdf.pages, desc="Processing PDF pages", unit="page")
        ):
            tables = camelot.read_pdf(tmp_path, pages=str(i + 1), flavor="hybrid")
            for table in tables:
                if table.accuracy < 80:
                    continue
                cleaned_pdf_pages.add(table)

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
        if any(keyword in col_name_lower for keyword in ["cal", "kcal", "energy"]):
            calorie_col_idx = idx
        elif "protein" in col_name_lower:
            protein_col_idx = idx
        elif any(keyword in col_name_lower for keyword in ["carb", "carbohydrate"]):
            carb_col_idx = idx
        elif any(keyword in col_name_lower for keyword in ["fat", "lipid"]):
            fat_col_idx = idx

    return calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx


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

    for row_idx in range(len(df)):
        for col_idx in range(len(df.columns)):
            cell_value = str(df.iloc[row_idx, col_idx]).lower()

            if calorie_col_idx is None and any(
                keyword in cell_value
                for keyword in ["cal", "kcal", "energy", "calories"]
            ):
                calorie_col_idx = col_idx
            elif protein_col_idx is None and "protein" in cell_value:
                protein_col_idx = col_idx
            elif carb_col_idx is None and any(
                keyword in cell_value for keyword in ["carb", "carbohydrate", "carbs"]
            ):
                carb_col_idx = col_idx
            elif fat_col_idx is None and any(
                keyword in cell_value for keyword in ["fat", "lipid", "fats"]
            ):
                has_saturated = any(
                    sat_keyword in cell_value for sat_keyword in ["saturated", "sat"]
                )
                has_cals = any(
                    cal_keyword in cell_value
                    for cal_keyword in ["calories", "kcal", "cal"]
                )
                has_trans = "trans" in cell_value

                if not has_saturated and not has_trans and not has_cals:
                    fat_col_idx = col_idx

    return calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx


def _is_valid_dish_name(dish_name: str) -> bool:
    """Check if the dish name is valid (not a nutrition header).

    Args:
        dish_name (str): The dish name to validate.

    Returns:
        bool: True if valid dish name, False if it's a nutrition header.
    """
    if dish_name is None or str(dish_name).strip() == "":
        return False

    dish_name_lower = str(dish_name).lower()
    nutrition_keywords = [
        "cal",
        "kcal",
        "energy",
        "calories",
        "protein",
        "carb",
        "carbohydrate",
        "carbs",
        "fat",
        "lipid",
        "fats",
        "nutrition",
        "serving",
        "size",
        "portion",
    ]

    return not any(keyword in dish_name_lower for keyword in nutrition_keywords)


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

    return all(
        value is not None and str(value).strip() != "" for value in nutrition_values
    )


def _extract_dish_data(
    df,
    row_idx: int,
    calorie_col_idx: Optional[int],
    protein_col_idx: Optional[int],
    carb_col_idx: Optional[int],
    fat_col_idx: Optional[int],
) -> Dict:
    """Extract dish data from a DataFrame row.

    Args:
        df: DataFrame containing the data.
        row_idx (int): Row index to extract data from.
        calorie_col_idx (Optional[int]): Column index for calories.
        protein_col_idx (Optional[int]): Column index for protein.
        carb_col_idx (Optional[int]): Column index for carbs.
        fat_col_idx (Optional[int]): Column index for fat.

    Returns:
        Dict: Dictionary containing dish name and nutrition data.
    """
    return {
        "dish": str(df.iloc[row_idx, 0]).strip(),
        "calories": (
            df.iloc[row_idx, calorie_col_idx]
            if calorie_col_idx is not None and calorie_col_idx < len(df.columns)
            else None
        ),
        "protein": (
            df.iloc[row_idx, protein_col_idx]
            if protein_col_idx is not None and protein_col_idx < len(df.columns)
            else None
        ),
        "carbs": (
            df.iloc[row_idx, carb_col_idx]
            if carb_col_idx is not None and carb_col_idx < len(df.columns)
            else None
        ),
        "fat": (
            df.iloc[row_idx, fat_col_idx]
            if fat_col_idx is not None and fat_col_idx < len(df.columns)
            else None
        ),
    }


def _process_table_data(tables: Set) -> List[Dict]:
    """Process extracted tables to extract nutrition data.

    Args:
        tables (Set): Set of tables extracted from PDF.

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

            calorie_col_idx = calorie_col_idx or cell_calorie_col_idx
            protein_col_idx = protein_col_idx or cell_protein_col_idx
            carb_col_idx = carb_col_idx or cell_carb_col_idx
            fat_col_idx = fat_col_idx or cell_fat_col_idx

        for row_idx in range(len(df)):
            dish_name = df.iloc[row_idx, 0]

            if not _is_valid_dish_name(dish_name):
                continue

            if not _has_complete_nutrition_data(
                df, row_idx, calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx
            ):
                continue

            dish_data = _extract_dish_data(
                df, row_idx, calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx
            )
            json_data.append(dish_data)

    return json_data


def _save_json_data(json_data: List[Dict], out_json_path: Path) -> None:
    """Save extracted data to JSON file.

    Args:
        json_data (List[Dict]): List of dictionaries containing dish and nutrition data.
        out_json_path (Path): Path to output JSON file.
    """
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f)


def pdf_to_json(url: str, out_json: str):
    """Convert a PDF file to a JSON file.

    Args:
        url (str): The URL of the PDF file to convert.
        out_json (str): The path to the output JSON file.
    """
    out_json_path = Path(out_json)
    tmp_path = out_json_path.with_suffix(".pdf")

    try:
        _download_pdf(url, tmp_path)

        cleaned_pdf_pages = _extract_tables_from_pdf(tmp_path)

        json_data = _process_table_data(cleaned_pdf_pages)

        _save_json_data(json_data, out_json_path)

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
