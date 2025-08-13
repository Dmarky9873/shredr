import json
import os
from pathlib import Path

import camelot
import pdfplumber
import requests
from tqdm import tqdm


def pdf_to_json(url: str, out_json: str):
    """Convert a PDF file to a JSON file.

    Args:
        url (str): The URL of the PDF file to convert.
        out_json (str): The path to the output JSON file.
    """
    pdf_bytes = requests.get(url, timeout=30).content
    out_json_path = Path(out_json)
    tmp_path = out_json_path.with_suffix(".pdf")
    tmp_path.write_bytes(pdf_bytes)
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

    if os.path.exists(tmp_path):
        os.remove(tmp_path)

    json_data = []
    for table in cleaned_pdf_pages:
        df = table.df

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

        if None in [calorie_col_idx, protein_col_idx, carb_col_idx, fat_col_idx]:
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
                        keyword in cell_value
                        for keyword in ["carb", "carbohydrate", "carbs"]
                    ):
                        carb_col_idx = col_idx
                    elif fat_col_idx is None and any(
                        keyword in cell_value for keyword in ["fat", "lipid", "fats"]
                    ):
                        has_saturated = any(
                            sat_keyword in cell_value
                            for sat_keyword in ["saturated", "sat"]
                        )
                        has_trans = "trans" in cell_value

                        if not has_saturated and not has_trans:
                            fat_col_idx = col_idx

        for row_idx in range(len(df)):
            dish_name = df.iloc[row_idx, 0]
            if dish_name is None or str(dish_name).strip() == "":
                continue

            if any(
                col_idx is None
                for col_idx in [
                    calorie_col_idx,
                    protein_col_idx,
                    carb_col_idx,
                    fat_col_idx,
                ]
            ):
                continue

            if (
                df.iloc[row_idx, calorie_col_idx] is None
                or df.iloc[row_idx, calorie_col_idx] == ""
                or df.iloc[row_idx, protein_col_idx] is None
                or df.iloc[row_idx, protein_col_idx] == ""
                or df.iloc[row_idx, carb_col_idx] is None
                or df.iloc[row_idx, carb_col_idx] == ""
                or df.iloc[row_idx, fat_col_idx] is None
                or df.iloc[row_idx, fat_col_idx] == ""
            ):
                continue

            dish_name_lower = str(dish_name).lower()
            if any(
                keyword in dish_name_lower
                for keyword in [
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
                ]
            ):
                continue

            json_data.append(
                {
                    "dish": str(dish_name).strip(),
                    "calories": (
                        df.iloc[row_idx, calorie_col_idx]
                        if calorie_col_idx is not None
                        and calorie_col_idx < len(df.columns)
                        else None
                    ),
                    "protein": (
                        df.iloc[row_idx, protein_col_idx]
                        if protein_col_idx is not None
                        and protein_col_idx < len(df.columns)
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
            )

    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f)
