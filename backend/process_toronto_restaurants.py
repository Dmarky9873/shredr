#!/usr/bin/env python3
"""
Script to process 100 most popular restaurants in Toronto.

This script automatically runs through the list of restaurants and processes
each one using the main.py functionality.

Requirements:
    pip install tqdm

The script includes a progress bar with time estimation.
"""

import json
import os
import time

from tqdm import tqdm

from app.analysis.json_to_menu import json_to_macro_caches
from app.analysis.pdf_to_json import pdf_to_json
from app.scraping.find_restaurant_link import (
    clean_restaurant_name,
    find_restaurant_link,
)

# List of 100 most popular restaurants in Toronto
TORONTO_RESTAURANTS = [
    "McDonald's",
    "Tim Hortons",
    "Starbucks",
    "Subway",
    "A&W",
    "Burger King",
    "Wendy's",
    "Popeyes",
    "KFC",
    "Pizza Pizza",
    "Domino's Pizza",
    "Harvey's",
    "Chipotle",
    "Five Guys",
    "Freshii",
    "Booster Juice",
    "Second Cup",
    "Mr. Sub",
    "Thai Express",
    "Jimmy the Greek",
    "Panera Bread",
    "Osmow's",
    "Paramount Fine Foods",
    "Shawarma Palace",
    "Mary Brown's Chicken",
    "Chungchun Rice Dog",
    "Chatime",
    "Gong Cha",
    "CoCo Fresh Tea & Juice",
    "Bubble Lee",
    "The Alley",
    "David's Tea",
    "Jollibee",
    "Pho Hung",
    "Pho Xe Lua",
    "Banh Mi Boys",
    "Pita Pit",
    "Hero Certified Burgers",
    "Shawarma King",
    "Mandarin",
    "Swiss Chalet",
    "Boston Pizza",
    "Jack Astor's",
    "Milestones",
    "The Keg",
    "Earls",
    "Cactus Club Cafe",
    "Joey",
    "Moxies",
    "Scaddabush",
    "La Carnita",
    "El Catrin",
    "Baro",
    "Planta",
    "Kupfert & Kim",
    "Impact Kitchen",
    "Salad King",
    "Pai",
    "Khao San Road",
    "Sukhothai",
    "Banh Mi Nguyen Huong",
    "Ding Tai Fung",
    "Sansotei Ramen",
    "Kinton Ramen",
    "Hokkaido Ramen Santouka",
    "Ichiban Sushi House",
    "Sushi Kaji",
    "Miku Toronto",
    "JaBistro",
    "Kinka Izakaya",
    "Gyubee Japanese Grill",
    "Yakiniku King",
    "Rol San",
    "Dim Sum King",
    "Crown Princess Fine Dining",
    "Dragon Pearl Buffet",
    "Congee Queen",
    "Congee Wong",
    "Ho Lee Chow",
    "Mother's Dumplings",
    "New Ho King",
    "Chinatown BBQ",
    "Swatow",
    "Richmond Station",
    "Alo",
    "Canoe",
    "Buca",
    "Terroni",
    "Gusto 101",
    "Pizzeria Libretto",
    "Maker Pizza",
    "North of Brooklyn Pizzeria",
    "Pizza Nova",
    "Frank's Pizza House",
    "Matt's Burger Lab",
    "Holy Chuck",
    "Big Smoke Burger",
    "Burger Priest",
    "Rudy",
    "Shake Shack (Toronto location)",
    "St. Louis Bar & Grill",
    "Hooters",
    "Wing Machine",
    "Smoke's Poutinerie",
    "Poutini's House of Poutine",
    "The Rec Room",
    "Sneaky Dee's",
    "El Furniture Warehouse",
    "Queen Mother Café",
    "The Rivoli",
]


def create_restaurant_json(
    restaurant_name: str, show_detailed_output: bool = True
) -> bool:
    """
    Create restaurant JSON data (same as main.py functionality).

    Args:
        restaurant_name: Name of the restaurant to process
        show_detailed_output: Whether to show detailed console output

    Returns:
        True if successful, False if failed
    """
    try:
        clean_name = clean_restaurant_name(restaurant_name)

        # Check if already cached
        cache_file = f"app/restaurant_caches/{clean_name}_output.json"
        if os.path.exists(cache_file):
            if show_detailed_output:
                print(f"✓ Found cached data for {restaurant_name} ({clean_name})")
            return True

        # Find restaurant URL
        if show_detailed_output:
            print(f"🔍 Searching for {restaurant_name}...")
        url = find_restaurant_link(clean_name)
        if url is None:
            if show_detailed_output:
                print(f"❌ No PDF URL found for {restaurant_name}")
            return False

        # Extract PDF to JSON
        if show_detailed_output:
            print(f"📄 Extracting PDF data from {url}...")
        pdf_to_json(url, cache_file, clean_name)
        if show_detailed_output:
            print(f"✓ Extracted tables from {url} into {clean_name}_output.json")

        return True

    except (FileNotFoundError, json.JSONDecodeError, IOError) as e:
        if show_detailed_output:
            print(f"❌ Error processing {restaurant_name}: {e}")
        return False


def update_restaurant_list(
    restaurant_name: str, show_detailed_output: bool = True
) -> bool:
    """
    Update the list of cached restaurants.

    Args:
        restaurant_name: Clean restaurant name to add to list
        show_detailed_output: Whether to show detailed console output

    Returns:
        True if successful, False if failed
    """
    try:
        list_file = "app/restaurant_caches/list_of_cached_restaurants.json"

        # Read existing list
        if os.path.exists(list_file):
            with open(list_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = []

        # Add restaurant if not already in list
        if restaurant_name not in data:
            data.append(restaurant_name)

            # Write updated list
            with open(list_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

            if show_detailed_output:
                print(f"✓ Added {restaurant_name} to restaurant list")

        return True

    except (FileNotFoundError, json.JSONDecodeError, IOError) as e:
        if show_detailed_output:
            print(f"❌ Error updating restaurant list for {restaurant_name}: {e}")
        return False


def process_restaurant(restaurant_name: str, show_detailed_output: bool = True) -> dict:
    """
    Process a single restaurant through the full pipeline.

    Args:
        restaurant_name: Name of the restaurant to process
        show_detailed_output: Whether to show detailed console output

    Returns:
        Dictionary with processing results
    """
    if show_detailed_output:
        print(f"\n{'='*60}")
        print(f"Processing: {restaurant_name}")
        print(f"{'='*60}")

    results = {
        "restaurant": restaurant_name,
        "clean_name": "",
        "json_created": False,
        "macro_caches_created": False,
        "list_updated": False,
        "success": False,
    }

    try:
        # Clean restaurant name
        clean_name = clean_restaurant_name(restaurant_name)
        results["clean_name"] = clean_name

        # Step 1: Create restaurant JSON
        if create_restaurant_json(restaurant_name, show_detailed_output):
            results["json_created"] = True

            # Step 2: Create macro caches
            try:
                cache_file = f"app/restaurant_caches/{clean_name}_output.json"
                if show_detailed_output:
                    print(f"📊 Creating macro caches for {restaurant_name}...")
                json_to_macro_caches(cache_file)
                results["macro_caches_created"] = True
                if show_detailed_output:
                    print(f"✓ Created macro caches for {restaurant_name}")
            except (FileNotFoundError, json.JSONDecodeError, IOError) as e:
                if show_detailed_output:
                    print(f"❌ Error creating macro caches: {e}")

            # Step 3: Update restaurant list
            if update_restaurant_list(clean_name, show_detailed_output):
                results["list_updated"] = True

        # Determine overall success
        results["success"] = (
            results["json_created"]
            and results["macro_caches_created"]
            and results["list_updated"]
        )

        if show_detailed_output:
            if results["success"]:
                print(f"✅ Successfully processed {restaurant_name}")
            else:
                print(f"⚠️  Partially processed {restaurant_name}")

    except (FileNotFoundError, json.JSONDecodeError, IOError) as e:
        if show_detailed_output:
            print(f"❌ Failed to process {restaurant_name}: {e}")

    return results


def main():
    """
    Main function to process all Toronto restaurants.
    """
    print("🍽️  Starting Toronto Restaurant Processing")
    print(f"📋 Processing {len(TORONTO_RESTAURANTS)} restaurants")
    print(f"⏰ Started at {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Create cache directory if it doesn't exist
    os.makedirs("app/restaurant_caches", exist_ok=True)
    os.makedirs("app/restaurant_caches/highest_lowest_protein", exist_ok=True)
    os.makedirs("app/restaurant_caches/highest_lowest_fat", exist_ok=True)
    os.makedirs("app/restaurant_caches/highest_lowest_carbs", exist_ok=True)

    # Track results
    all_results = []
    successful_count = 0
    failed_count = 0
    skipped_count = 0

    # Process each restaurant
    with tqdm(
        total=len(TORONTO_RESTAURANTS),
        desc="Processing restaurants",
        unit="restaurant",
        ncols=100,
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, "
        "{rate_fmt}]",
    ) as pbar:
        for i, restaurant in enumerate(TORONTO_RESTAURANTS, 1):
            pbar.set_description(f"Processing: {restaurant[:30]}...")

            # Add delay between requests to be respectful
            if i > 1:
                time.sleep(2)  # 2 second delay between restaurants

            results = process_restaurant(restaurant, show_detailed_output=False)
            all_results.append(results)

            if results["success"]:
                successful_count += 1
                pbar.set_postfix(
                    {"✅": successful_count, "❌": failed_count, "⏭️": skipped_count}
                )
            elif results["json_created"]:
                failed_count += 1
                pbar.set_postfix(
                    {"✅": successful_count, "❌": failed_count, "⏭️": skipped_count}
                )
            else:
                skipped_count += 1
                pbar.set_postfix(
                    {"✅": successful_count, "❌": failed_count, "⏭️": skipped_count}
                )

            pbar.update(1)

    # Print final summary
    print(f"\n{'='*60}")
    print("🎉 PROCESSING COMPLETE!")
    print(f"{'='*60}")
    print(f"✅ Successfully processed: {successful_count}")
    print(f"❌ Failed to process: {failed_count}")
    print(f"⏭️  Skipped (no PDF found): {skipped_count}")
    print(f"📊 Total restaurants: {len(TORONTO_RESTAURANTS)}")
    print(f"⏰ Finished at {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Save detailed results
    results_file = "toronto_restaurants_processing_results.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "summary": {
                    "total": len(TORONTO_RESTAURANTS),
                    "successful": successful_count,
                    "failed": failed_count,
                    "skipped": skipped_count,
                    "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                },
                "detailed_results": all_results,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"📝 Detailed results saved to {results_file}")

    # Show which restaurants were successfully processed
    if successful_count > 0:
        print("\n✅ Successfully processed restaurants:")
        for result in all_results:
            if result["success"]:
                print(f"  - {result['restaurant']} ({result['clean_name']})")

    # Show which restaurants failed
    if failed_count > 0:
        print("\n❌ Failed to fully process:")
        for result in all_results:
            if result["json_created"] and not result["success"]:
                print(f"  - {result['restaurant']} ({result['clean_name']})")

    # Show which restaurants were skipped
    if skipped_count > 0:
        print("\n⏭️  Skipped (no PDF found):")
        for result in all_results:
            if not result["json_created"]:
                print(f"  - {result['restaurant']}")


if __name__ == "__main__":
    main()
