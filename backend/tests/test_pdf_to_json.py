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
            ["Mystery", None, 12, 10, 5],
        ],
        columns=["Dish", "CAL", "PROTEIN", "CARBS", "FAT"],
    )
    # pylint: disable=protected-access
    data = mod._process_table_data({FakeTable(accuracy=95, df=df)})
    assert data == [
        {"dish": "Chicken", "calories": 400, "protein": 45, "carbs": 0, "fat": 8}
    ]


def test_pdf_to_json_end_to_end(tmp_path, monkeypatch):
    """
    End-to-end: downloads PDF, scans 2 pages, extracts tables, writes JSON, removes
    temp PDF.
    """

    class FakeResp:
        """Fake response for testing."""

        content = b"%PDF-FAKE%"

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
                "carbs 5",
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
    result_sorted = sorted(menu_items, key=lambda x: x["dish"])
    expected_sorted = sorted(
        [
            {
                "dish": "Beef Carpaccio",
                "calories": 320,
                "protein": 28,
                "carbs": 2,
                "fat": 14,
            },
        ],
        key=lambda x: x["dish"],
    )

    assert result_sorted == expected_sorted

    tmp_pdf = out_json.with_suffix(".pdf")
    assert not os.path.exists(tmp_pdf)
