"""
Unit tests for the PDF to JSON conversion module.
"""

import json
import os

import pandas as pd
import pytest

import app.analysis.pdf_to_json as mod


def test_find_column_indices_from_headers():
    """Test finding column indices from headers."""
    df = pd.DataFrame(
        columns=["Dish", "Calories (kcal)", "Protein (g)", "Carbs (g)", "Fat (g)"]
    )
    # pylint: disable=protected-access
    cal, pro, carb, fat = mod._find_column_indices_from_headers(df)
    assert (cal, pro, carb, fat) == (1, 2, 3, 4)


def test_find_column_indices_from_cells():
    """Test finding column indices from cell values."""
    df = pd.DataFrame(
        [
            [
                "Burger",
                "Energy 500 kcal",
                "Protein 30 g",
                "Carbohydrate 40 g",
                "Fat 10 g",
            ]
        ],
        columns=["Item", "A", "B", "C", "D"],
    )
    # pylint: disable=protected-access
    cal, pro, carb, fat = mod._find_column_indices_from_cells(df)
    assert (cal, pro, carb, fat) == (1, 2, 3, 4)


@pytest.mark.parametrize(
    "name, expected",
    [
        ("Grilled Chicken", True),
        ("Protein Shake", True),
        ("Protein", False),
        ("Calories", False),
        ("", False),
        (None, False),
    ],
)
def test_is_valid_dish_name(name, expected):
    """Test if a dish name is valid.

    Args:
        name (str): The dish name to validate.
        expected (bool): The expected validity of the dish name.
    """
    assert mod._is_valid_dish_name(name) is expected  # pylint: disable=protected-access


def test_process_table_data_keeps_only_complete_and_valid_rows():
    """Test that only complete and valid rows are kept."""

    class FakeTable:
        """Fake table for testing."""

        def __init__(self, accuracy, df):
            self.accuracy = accuracy
            self.df = df

    df = pd.DataFrame(
        [
            ["Calories", "kcal", "protein", "carbs", "fat"],
            ["Chicken", 400, 45, 0, 8],
            ["Mystery", None, 12, None, 5],
        ],
        columns=["Dish", "CAL", "PROTEIN", "CARBS", "FAT"],
    )
    # pylint: disable=protected-access
    data = mod._process_table_data({FakeTable(accuracy=95, df=df)})
    assert len(data) == 1
    assert data[0]["dish"] == "Chicken"
    assert data[0]["calories"] == 400
    assert data[0]["protein"] == 45
    assert data[0]["carbs"] == 0
    assert data[0]["fat"] == 8
    assert data[0]["nutrition_source"] == "pdf"
    assert data[0]["field_sources"] == {
        "calories": "pdf",
        "protein": "pdf",
        "carbs": "pdf",
        "fat": "pdf",
    }


def test_process_table_data_calculates_missing_calories_from_macros():
    """Test fallback calorie calculation from protein/carbs/fat grams."""

    class FakeTable:
        """Fake table for testing."""

        def __init__(self, accuracy, df):
            self.accuracy = accuracy
            self.df = df

    df = pd.DataFrame(
        [["Macro Plate", "", 20, 30, 10]],
        columns=["Dish", "Calories", "Protein", "Carbs", "Fat"],
    )

    # pylint: disable=protected-access
    data = mod._process_table_data([FakeTable(accuracy=95, df=df)])

    assert len(data) == 1
    assert data[0]["dish"] == "Macro Plate"
    assert data[0]["calories"] == 290
    assert data[0]["nutrition_source"] == "calculated"
    assert data[0]["estimated_fields"] == ["calories"]
    assert data[0]["field_sources"]["calories"] == "calculated_from_macros"


def test_process_table_data_uses_ai_estimator_for_missing_fields():
    """Test explicit AI fallback for fields that cannot be parsed from the PDF."""

    class FakeTable:
        """Fake table for testing."""

        def __init__(self, accuracy, df):
            self.accuracy = accuracy
            self.df = df

    df = pd.DataFrame(
        [["Tofu Bowl", 500, "", 64, 18]],
        columns=["Dish", "Calories", "Protein", "Carbs", "Fat"],
    )

    def fake_ai_estimator(dish_name, restaurant_name, known_values):
        assert dish_name == "Tofu Bowl"
        assert restaurant_name == "Test Restaurant"
        assert known_values["protein"] is None
        return {"protein": 22}

    # pylint: disable=protected-access
    data = mod._process_table_data(
        [FakeTable(accuracy=95, df=df)],
        restaurant_name="Test Restaurant",
        ai_estimator=fake_ai_estimator,
    )

    assert len(data) == 1
    assert data[0]["protein"] == 22
    assert data[0]["nutrition_source"] == "ai_estimated"
    assert data[0]["estimated_fields"] == ["protein"]
    assert data[0]["field_sources"]["protein"] == "ai_estimated"


def test_estimate_nutrition_with_cache_reuses_stored_response(tmp_path):
    """Test AI estimates are cached and reused for repeated restaurant dishes."""

    cache_path = tmp_path / "ai_cache.json"
    calls = []

    def fake_estimator(dish_name, restaurant_name, known_values):
        calls.append((dish_name, restaurant_name, known_values.copy()))
        return {"calories": 500, "protein": 22, "carbs": 64, "fat": 18}

    known_values = {"calories": 500, "protein": None, "carbs": 64, "fat": 18}

    # pylint: disable=protected-access
    first = mod._estimate_nutrition_with_cache(
        "Tofu Bowl",
        "Test Restaurant",
        known_values,
        fake_estimator,
        cache_path=cache_path,
    )
    second = mod._estimate_nutrition_with_cache(
        "Tofu Bowl",
        "Test Restaurant",
        known_values,
        fake_estimator,
        cache_path=cache_path,
    )

    assert first == {"calories": 500, "protein": 22, "carbs": 64, "fat": 18}
    assert second == first
    assert len(calls) == 1

    cache_data = json.loads(cache_path.read_text(encoding="utf-8"))
    assert cache_data["version"] == mod.AI_ESTIMATE_CACHE_VERSION
    assert len(cache_data["responses"]) == 1
    cached_entry = next(iter(cache_data["responses"].values()))
    assert cached_entry["restaurant_name"] == "Test Restaurant"
    assert cached_entry["dish_name"] == "Tofu Bowl"
    assert cached_entry["response"] == first


def test_configured_openai_estimator_uses_env_and_cache(tmp_path, monkeypatch):
    """Test configured OpenAI fallback reads env settings and caches responses."""

    cache_path = tmp_path / "openai_cache.json"
    monkeypatch.setenv("SHREDR_ENABLE_AI_ESTIMATES", "1")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("SHREDR_OPENAI_MODEL", "test-model")
    monkeypatch.setenv("SHREDR_AI_ESTIMATE_CACHE_PATH", str(cache_path))
    monkeypatch.setattr(mod, "_LOCAL_ENV_LOADED", False)

    post_calls = []

    class FakeOpenAIResponse:
        """Fake OpenAI Responses API response."""

        def raise_for_status(self):
            return None

        def json(self):
            return {
                "output_text": json.dumps(
                    {"calories": 500, "protein": 22, "carbs": 64, "fat": 18}
                )
            }

    def fake_post(url, headers, json, timeout):  # pylint: disable=redefined-outer-name
        post_calls.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
                "timeout": timeout,
            }
        )
        return FakeOpenAIResponse()

    monkeypatch.setattr(mod.requests, "post", fake_post)

    # pylint: disable=protected-access
    estimator = mod._configured_ai_estimator()
    assert estimator is not None

    known_values = {"calories": 500, "protein": None, "carbs": 64, "fat": 18}
    first = estimator("Tofu Bowl", "Test Restaurant", known_values)
    second = estimator("Tofu Bowl", "Test Restaurant", known_values)

    assert first == {"calories": 500, "protein": 22, "carbs": 64, "fat": 18}
    assert second == first
    assert len(post_calls) == 1
    assert post_calls[0]["url"] == "https://api.openai.com/v1/responses"
    assert post_calls[0]["headers"]["Authorization"] == "Bearer test-key"
    assert post_calls[0]["json"]["model"] == "test-model"
    assert cache_path.exists()


def test_load_local_env_reads_ignored_env_files(tmp_path, monkeypatch):
    """Test local .env files can configure AI estimates without overriding env."""

    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "SHREDR_ENABLE_AI_ESTIMATES=1",
                "OPENAI_API_KEY=from-file",
                "SHREDR_OPENAI_MODEL='env-model'",
                "EXISTING_VALUE=from-file",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SHREDR_ENABLE_AI_ESTIMATES", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("SHREDR_OPENAI_MODEL", raising=False)
    monkeypatch.setenv("EXISTING_VALUE", "already-set")
    monkeypatch.setattr(mod, "_LOCAL_ENV_LOADED", False)

    # pylint: disable=protected-access
    mod._load_local_env()

    assert os.environ["SHREDR_ENABLE_AI_ESTIMATES"] == "1"
    assert os.environ["OPENAI_API_KEY"] == "from-file"
    assert os.environ["SHREDR_OPENAI_MODEL"] == "env-model"
    assert os.environ["EXISTING_VALUE"] == "already-set"


def test_clean_dish_data_removes_bilingual_duplicates():
    """Test English/French duplicates are collapsed and bilingual names are cleaned."""

    dish_data = {
        "restaurant_name": "the keg",
        "menu_items": [
            {
                "dish": "French Onion Soup",
                "calories": 350,
                "protein": 22,
                "carbs": 19,
                "fat": 20,
            },
            {
                "dish": "Soupe à l’oignon gratinée",
                "calories": 350,
                "protein": 22,
                "carbs": 19,
                "fat": 20,
            },
            {
                "dish": "Coffee / Café",
                "calories": 5,
                "protein": 0,
                "carbs": 1,
                "fat": 0,
            },
            {
                "dish": "Diet Root Beer, 1/2 Gallon",
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
            },
        ],
    }

    cleaned = mod.clean_dish_data(dish_data)
    dish_names = [item["dish"] for item in cleaned["menu_items"]]

    assert "French Onion Soup" in dish_names
    assert "Soupe à l’oignon gratinée" not in dish_names
    assert "Coffee" in dish_names
    assert "Coffee / Café" not in dish_names
    assert "Diet Root Beer, 1/2 Gallon" in dish_names


def test_extract_tables_from_pdf_falls_back_to_pdfplumber(tmp_path, monkeypatch):
    """Test pdfplumber table extraction runs when Camelot cannot read a page."""

    pdf_path = tmp_path / "menu.pdf"
    pdf_path.write_bytes(b"%PDF-FAKE%")

    def fake_read_pdf(*args, **kwargs):  # pylint: disable=unused-argument
        raise RuntimeError("camelot unavailable")

    monkeypatch.setattr(mod.camelot, "read_pdf", fake_read_pdf)

    class FakePage:
        """Fake pdfplumber page."""

        def extract_tables(self):
            return [
                [
                    ["Dish", "Calories", "Protein", "Carbs", "Fat"],
                    ["Soup", "100", "5", "10", "2"],
                ]
            ]

    class FakePDF:
        """Fake PDF for testing."""

        def __init__(self, _):
            self.pages = [FakePage()]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(mod.pdfplumber, "open", FakePDF)

    def fake_tqdm(*args, **kwargs):  # pylint: disable=unused-argument
        return args[0]

    monkeypatch.setattr(mod, "tqdm", fake_tqdm)

    # pylint: disable=protected-access
    tables = mod._extract_tables_from_pdf(pdf_path)

    assert len(tables) == 1
    assert tables[0].extraction_method == "pdfplumber"
    assert tables[0].df.iloc[1, 0] == "Soup"


def test_pdf_to_json_end_to_end(tmp_path, monkeypatch):
    """
    End-to-end: downloads PDF, scans 2 pages, extracts tables, writes JSON, removes
    temp PDF.
    """

    class FakeResp:
        """Fake response for testing."""

        content = b"%PDF-FAKE%"

        def raise_for_status(self):
            return None

    def fake_get(*args, **kwargs):  # pylint: disable=unused-argument
        return FakeResp()

    monkeypatch.setattr(mod.requests, "get", fake_get)

    class FakePDF:
        """Fake PDF for testing."""

        def __init__(self, _):
            self.pages = ["p1", "p2"]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(mod.pdfplumber, "open", FakePDF)

    class FakeTable:
        """Fake table for testing."""

        def __init__(self, acc, df):
            self.accuracy = acc
            self.df = df

    page1_df = pd.DataFrame(
        [
            [
                "SERVING SIZE",
                "CALORIES (KCAL)",
                "PROTEIN (G)",
                "CARBS (G)",
                "FAT (G)",
            ],
            ["Beef Carpaccio", 320, 28, 2, 14],
            [
                "Calories",
                "kcal",
                "protein",
                "carbs",
                "fat",
            ],
        ],
        columns=["Dish", "Cals", "Prot", "Carbs", "Fat"],
    )

    page2_df = pd.DataFrame(
        [
            ["Chicken Salad", "calories 400", "protein 35", "carbohydrate 8", "fat 12"],
            [
                "Blank",
                "",
                "protein 10",
                "",
                "fat 2",
            ],
        ],
        columns=["Item", "A", "B", "C", "D"],
    )

    def fake_read_pdf(path, pages, flavor):  # pylint: disable=unused-argument
        if pages == "1":
            return [
                FakeTable(90, page1_df),
                FakeTable(50, page1_df),
            ]
        if pages == "2":
            return [FakeTable(95, page2_df)]
        return []

    monkeypatch.setattr(mod.camelot, "read_pdf", fake_read_pdf)

    def fake_tqdm(*args, **kwargs):  # pylint: disable=unused-argument
        return args[0]

    monkeypatch.setattr(mod, "tqdm", fake_tqdm)

    out_json = tmp_path / "out.json"

    mod.pdf_to_json("https://example.com/menu.pdf", str(out_json), "Test Restaurant")

    result = json.loads(out_json.read_text(encoding="utf-8"))

    # The JSON now has a structure with restaurant_name, date, and menu_items
    assert "restaurant_name" in result
    assert "date" in result
    assert "menu_items" in result
    assert result["restaurant_name"] == "Test Restaurant"

    menu_items = result["menu_items"]
    menu_items_by_name = {item["dish"]: item for item in menu_items}

    assert set(menu_items_by_name) == {"Beef Carpaccio", "Chicken Salad"}
    assert {
        key: menu_items_by_name["Beef Carpaccio"][key]
        for key in ["calories", "protein", "carbs", "fat"]
    } == {"calories": 320, "protein": 28, "carbs": 2, "fat": 14}
    assert {
        key: menu_items_by_name["Chicken Salad"][key]
        for key in ["calories", "protein", "carbs", "fat"]
    } == {"calories": 400, "protein": 35, "carbs": 8, "fat": 12}
    assert result["uses_ai_estimates"] is False

    tmp_pdf = out_json.with_suffix(".pdf")
    assert not os.path.exists(tmp_pdf)
