import os

from analysis.pdf_to_json import pdf_to_json
from scraping.find_restaurant_link import clean_restaurant_name, find_restaurant_link


def main():
    restaurant_name = clean_restaurant_name(input("Enter a restaurant name: "))
    if os.path.exists(f"./restaurant_caches/{restaurant_name}_output.json"):
        print(f"Found cached data for {restaurant_name}.")
        return
    url = find_restaurant_link(restaurant_name)
    if url is None:
        print(f"No PDF URL found for {restaurant_name}")
        return
    pdf_to_json(url, f"./restaurant_caches/{restaurant_name}_output.json")
    print(f"Extracted tables from {url} into {restaurant_name}_output.json")


if __name__ == "__main__":
    main()
