import os

from .analysis.json_to_menu import json_to_macro_caches
from .analysis.pdf_to_json import pdf_to_json
from .scraping.find_restaurant_link import clean_restaurant_name, find_restaurant_link


def create_restaurant_json(restaurant_name):
    restaurant_name = clean_restaurant_name(restaurant_name)
    if os.path.exists(f"app/restaurant_caches/{restaurant_name}_output.json"):
        print(f"Found cached data for {restaurant_name}.")
        return
    url = find_restaurant_link(restaurant_name)
    if url is None:
        print(f"No PDF URL found for {restaurant_name}")
        return
    pdf_to_json(
        url, f"app/restaurant_caches/{restaurant_name}_output.json", restaurant_name
    )
    print(f"Extracted tables from {url} into {restaurant_name}_output.json")


def main():
    restaurant_name = input("Enter a restaurant name: ")
    restaurant_name = clean_restaurant_name(restaurant_name)
    create_restaurant_json(restaurant_name)

    json_to_macro_caches(f"app/restaurant_caches/{restaurant_name}_output.json")


if __name__ == "__main__":
    main()
