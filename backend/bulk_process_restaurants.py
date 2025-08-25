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
import logging
import os
import time
import warnings

from tqdm import tqdm

from app.analysis.json_to_menu import json_to_macro_caches
from app.analysis.pdf_to_json import has_menu_items, pdf_to_json
from app.scraping.find_restaurant_link import (
    clean_restaurant_name,
    find_restaurant_links,
)

# List of 100 most popular restaurants in Toronto
RESTAURANTS = [
    "Dairy Queen",
    "Orange Julius",
    "Baskin-Robbins",
    "Cold Stone Creamery",
    "Menchie's Frozen Yogurt",
    "Marble Slab Creamery",
    "Ben & Jerry's",
    "Haagen-Dazs Shop",
    "Yogen Früz",
    "Pret A Manger",
    "Taco Bell",
    "Quesada Burritos & Tacos",
    "BarBurrito",
    "Mucho Burrito",
    "Chili's",
    "TGI Fridays",
    "Olive Garden",
    "Red Lobster",
    "The Cheesecake Factory",
    "PF Chang's",
    "Benihana",
    "Nando's",
    "Perkins Restaurant & Bakery",
    "Denny's",
    "IHOP",
    "Waffle House",
    "Cracker Barrel",
    "The Works Gourmet Burger Bistro",
    "South St. Burger",
    "Fuddruckers",
    "Fatburger",
    "Johnny Rockets",
    "Shake Shack (U.S. mainstream)",
    "Carl's Jr.",
    "Hardee's",
    "In-N-Out Burger",
    "Checkers",
    "Church's Chicken",
    "Wingstop",
    "Buffalo Wild Wings",
    "Quiznos",
    "Firehouse Subs",
    "Jersey Mike's Subs",
    "Jimmy John's",
    "Pretzelmaker",
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

        # Find restaurant URLs (up to 3)
        if show_detailed_output:
            print(f"🔍 Searching for {restaurant_name}...")
        urls, error_occurred = find_restaurant_links(clean_name, max_links=3)
        if not urls:
            if show_detailed_output:
                if not error_occurred:
                    print(f"❌ No PDF URLs found for {restaurant_name}")
                else:
                    print(f"❌ Error occurred while searching for {restaurant_name}")
            return False

        # Try each URL until we find one with valid menu items
        successful_extraction = False
        for i, url in enumerate(urls, 1):
            if show_detailed_output:
                print(f"📄 Trying URL {i}/{len(urls)}: {url}")

            try:
                json_data = pdf_to_json(url, cache_file, clean_name)

                if has_menu_items(json_data):
                    if show_detailed_output:
                        print(
                            f"✓ Successfully extracted {len(json_data['menu_items'])} "
                            f"menu items from URL {i}"
                        )
                    successful_extraction = True
                    break
                else:
                    if show_detailed_output:
                        print(f"⚠️  No menu items found in URL {i}, trying next...")
                    # Remove the file if no menu items were found, so we can try
                    # the next URL
                    if os.path.exists(cache_file):
                        os.remove(cache_file)

            except Exception as e:
                error_msg = str(e)
                if show_detailed_output:
                    print(f"❌ Error processing URL {i}: {error_msg}")
                # Remove the file if there was an error, so we can try the next URL
                if os.path.exists(cache_file):
                    os.remove(cache_file)
                continue

        if not successful_extraction:
            if show_detailed_output:
                print(
                    f"❌ Failed to extract menu items from any of the {len(urls)} "
                    f"URLs for {restaurant_name}"
                )
            return False

        if show_detailed_output:
            print(f"✓ Extracted tables into {clean_name}_output.json")

        return True

    except (FileNotFoundError, json.JSONDecodeError, IOError) as e:
        if show_detailed_output:
            print(f"❌ File/IO error processing {restaurant_name}: {e}")
        return False
    except Exception as e:
        # Handle PDF parsing errors and other unexpected errors
        error_msg = str(e)
        if "PDF" in error_msg or "pdfplumber" in error_msg or "pdfminer" in error_msg:
            if show_detailed_output:
                print(f"❌ Invalid PDF for {restaurant_name}: {error_msg}")
        else:
            if show_detailed_output:
                print(f"❌ Unexpected error processing {restaurant_name}: {error_msg}")
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

        if create_restaurant_json(restaurant_name, show_detailed_output):
            results["json_created"] = True

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

            if update_restaurant_list(clean_name, show_detailed_output):
                results["list_updated"] = True

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
            print(f"❌ File/IO error processing {restaurant_name}: {e}")
    except Exception as e:
        error_msg = str(e)
        if show_detailed_output:
            print(f"❌ Unexpected error processing {restaurant_name}: {error_msg}")

    return results


def main():
    """
    Main function to process all restaurants.
    """
    warnings.filterwarnings("ignore", message=".*wrong pointing object.*")
    warnings.filterwarnings("ignore", message=".*Ignoring wrong pointing object.*")

    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    logging.getLogger("pdfplumber").setLevel(logging.ERROR)

    print("🍽️  Starting Restaurant Processing")
    print(f"📋 Processing {len(RESTAURANTS)} restaurants")
    print(f"⏰ Started at {time.strftime('%Y-%m-%d %H:%M:%S')}")

    os.makedirs("app/restaurant_caches", exist_ok=True)
    os.makedirs("app/restaurant_caches/highest_lowest_protein", exist_ok=True)
    os.makedirs("app/restaurant_caches/highest_lowest_fat", exist_ok=True)
    os.makedirs("app/restaurant_caches/highest_lowest_carbs", exist_ok=True)

    all_results = []
    successful_count = 0
    failed_count = 0
    skipped_count = 0
    pdf_error_count = 0

    with tqdm(
        total=len(RESTAURANTS),
        desc="Processing restaurants",
        unit="restaurant",
        ncols=120,
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, "
        "{rate_fmt}]",
    ) as pbar:
        for i, restaurant in enumerate(RESTAURANTS, 1):
            pbar.set_description(f"Processing: {restaurant[:25]}...")

            try:
                results = process_restaurant(restaurant, show_detailed_output=False)
                all_results.append(results)

                if results["success"]:
                    successful_count += 1
                    status = "✅"
                elif results["json_created"]:
                    failed_count += 1
                    status = "⚠️"
                else:
                    skipped_count += 1
                    status = "⏭️"

                pbar.set_postfix(
                    {
                        "✅": successful_count,
                        "⚠️": failed_count,
                        "⏭️": skipped_count,
                        "Status": status,
                    }
                )

            except Exception as e:
                # Handle any critical errors that might crash the entire process
                error_msg = str(e)
                if "PDF" in error_msg:
                    pdf_error_count += 1
                    skipped_count += 1
                else:
                    failed_count += 1

                # Create a failed result entry
                results = {
                    "restaurant": restaurant,
                    "clean_name": clean_restaurant_name(restaurant),
                    "json_created": False,
                    "macro_caches_created": False,
                    "list_updated": False,
                    "success": False,
                    "error": error_msg,
                }
                all_results.append(results)

                pbar.set_postfix(
                    {
                        "✅": successful_count,
                        "⚠️": failed_count,
                        "⏭️": skipped_count,
                        "Status": "❌",
                    }
                )

            pbar.update(1)

    # Print final summary
    print(f"\n{'='*60}")
    print("🎉 PROCESSING COMPLETE!")
    print(f"{'='*60}")
    print(f"✅ Successfully processed: {successful_count}")
    print(f"⚠️  Failed to process: {failed_count}")
    print(f"⏭️  Skipped (no PDF found): {skipped_count}")
    if pdf_error_count > 0:
        print(f"📄 PDF parsing errors: {pdf_error_count}")
    print(f"📊 Total restaurants: {len(RESTAURANTS)}")
    print(f"⏰ Finished at {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Save detailed results
    results_file = "RESTAURANTS_processing_results.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "summary": {
                    "total": len(RESTAURANTS),
                    "successful": successful_count,
                    "failed": failed_count,
                    "skipped": skipped_count,
                    "pdf_errors": pdf_error_count,
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
