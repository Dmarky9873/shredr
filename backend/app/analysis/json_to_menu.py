"""This module provides functionality to convert a JSON file into a Menu object."""

import json

from app.models.menu import Menu
from app.models.menu_item import MenuItem


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
