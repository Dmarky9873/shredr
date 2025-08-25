import json
import os

from .analysis.json_to_menu import json_to_macro_caches
from .analysis.pdf_to_json import has_menu_items, pdf_to_json
from .scraping.find_restaurant_link import clean_restaurant_name, find_restaurant_links


def create_restaurant_json(restaurant_name):
    restaurant_name = clean_restaurant_name(restaurant_name)
    output_path = f"app/restaurant_caches/{restaurant_name}_output.json"

    if os.path.exists(output_path):
        print(f"Found cached data for {restaurant_name}.")
        return

    urls, error_occurred = find_restaurant_links(restaurant_name, max_links=3)
    if not urls:
        if not error_occurred:
            print(f"No PDF URLs found for {restaurant_name}")
        return

    successful_extraction = False

    for i, url in enumerate(urls, 1):
        print(f"Trying URL {i}/{len(urls)}: {url}")

        try:
            json_data = pdf_to_json(url, output_path, restaurant_name)

            if has_menu_items(json_data):
                print(
                    f"Successfully extracted {len(json_data['menu_items'])} "
                    f"menu items from {url}"
                )
                successful_extraction = True
                break
            else:
                print(f"No menu items found in URL {i}, trying next...")
                # Remove the file if no menu items were found, so we can try the
                # next URL
                if os.path.exists(output_path):
                    os.remove(output_path)

        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"Error processing URL {i}: {e}")
            # Remove the file if there was an error, so we can try the next URL
            if os.path.exists(output_path):
                os.remove(output_path)
            continue

    if not successful_extraction:
        print(
            f"Failed to extract menu items from any of the {len(urls)} URLs "
            f"for {restaurant_name}"
        )
    else:
        print(f"Extracted tables into {restaurant_name}_output.json")


def main():
    restaurant_name = input("Enter a restaurant name: ")
    restaurant_name = clean_restaurant_name(restaurant_name)
    create_restaurant_json(restaurant_name)

    output_path = f"app/restaurant_caches/{restaurant_name}_output.json"
    if os.path.exists(output_path):
        json_to_macro_caches(output_path)
        with open(
            "app/restaurant_caches/list_of_cached_restaurants.json",
            "r+",
            encoding="utf-8",
        ) as f:
            data = json.load(f)
            if restaurant_name not in data:
                data.append(restaurant_name)
                f.seek(0)
                json.dump(data, f, ensure_ascii=False, indent=4)
                f.truncate()
    else:
        print(
            f"No valid data was extracted for {restaurant_name}. "
            f"Skipping cache creation."
        )


if __name__ == "__main__":
    main()
