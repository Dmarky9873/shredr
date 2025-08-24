"""This module provides functionality to convert a JSON file into a Menu object."""

import json

from ..models.menu import Menu
from ..models.menu_item import MenuItem


def json_to_menu(json_file_location: str) -> Menu:
    """Takes a json file and returns the file in a Menu object

    Args:
        json_file_location (str): The location where the file is located

    Returns:
        Menu: Returns the JSON file in a Menu object
    """
    with open(json_file_location, "r", encoding="utf-8") as f:
        data = json.load(f)
    menu_items = set()
    for item in data["menu_items"]:
        menu_items.add(
            MenuItem(
                name=item["dish"],
                calories=int(item["calories"]),
                protein=float(item["protein"]),
                carbs=float(item["carbs"]),
                fat=float(item["fat"]),
            )
        )

    menu = Menu(data["restaurant_name"], menu_items)

    return menu


def json_to_macro_caches(json_file_location: str) -> None:
    """Takes a json file and creates the carbs, fat, and protein sorted caches.

    Args:
        json_file_location (str): The location of the restaurnat json file cache it will
        use
    """

    menu = json_to_menu(json_file_location)

    highest_lowest_carbs = {
        "name": menu.restaurant_name,
        "menu": [item[0] for item in menu.calculate_sorted_carb_calorie_ratios()],
    }
    highest_lowest_fat = {
        "name": menu.restaurant_name,
        "menu": [item[0] for item in menu.calculate_sorted_fat_calorie_ratios()],
    }
    highest_lowest_protein = {
        "name": menu.restaurant_name,
        "menu": [item[0] for item in menu.calculate_sorted_protein_calorie_ratios()],
    }

    protein_cache_path = (
        f"app/restaurant_caches/highest_lowest_protein/"
        f"{menu.restaurant_name}_protein_cache.json"
    )
    with open(
        protein_cache_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            highest_lowest_protein,
            f,
            ensure_ascii=False,
            indent=4,
        )
    carbs_cache_path = (
        f"app/restaurant_caches/highest_lowest_carbs/"
        f"{menu.restaurant_name}_carbs_cache.json"
    )
    with open(
        carbs_cache_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            highest_lowest_carbs,
            f,
            ensure_ascii=False,
            indent=4,
        )
    fat_cache_path = (
        f"app/restaurant_caches/highest_lowest_fat/"
        f"{menu.restaurant_name}_fat_cache.json"
    )
    with open(
        fat_cache_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            highest_lowest_fat,
            f,
            ensure_ascii=False,
            indent=4,
        )
