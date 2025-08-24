#!/usr/bin/env python3
"""
Script to remove a cached restaurant and all its associated files.

This script removes:
- Main restaurant output JSON file
- Protein cache file
- Fat cache file
- Carbs cache file
- Updates the list of cached restaurants

Usage:
    python remove_restaurant.py <restaurant_name>

Example:
    python remove_restaurant.py "mcdonalds"
"""

import argparse
import json
import sys
from pathlib import Path


def remove_restaurant_files(restaurant_name: str, cache_dir: Path) -> dict:
    """
    Remove all files associated with a restaurant.

    Args:
        restaurant_name: Name of the restaurant to remove
        cache_dir: Path to the restaurant_caches directory

    Returns:
        Dictionary with status of each file removal
    """
    results = {
        "main_file": False,
        "protein_cache": False,
        "fat_cache": False,
        "carbs_cache": False,
        "list_updated": False,
    }

    # Define file paths
    main_file = cache_dir / f"{restaurant_name}_output.json"
    protein_file = (
        cache_dir / "highest_lowest_protein" / f"{restaurant_name}_protein_cache.json"
    )
    fat_file = cache_dir / "highest_lowest_fat" / f"{restaurant_name}_fat_cache.json"
    carbs_file = (
        cache_dir / "highest_lowest_carbs" / f"{restaurant_name}_carbs_cache.json"
    )
    list_file = cache_dir / "list_of_cached_restaurants.json"

    # Remove main output file
    if main_file.exists():
        try:
            main_file.unlink()
            results["main_file"] = True
            print(f"✓ Removed main file: {main_file}")
        except (OSError, PermissionError) as e:
            print(f"✗ Failed to remove main file: {e}")
    else:
        print(f"! Main file not found: {main_file}")

    # Remove protein cache file
    if protein_file.exists():
        try:
            protein_file.unlink()
            results["protein_cache"] = True
            print(f"✓ Removed protein cache: {protein_file}")
        except (OSError, PermissionError) as e:
            print(f"✗ Failed to remove protein cache: {e}")
    else:
        print(f"! Protein cache not found: {protein_file}")

    # Remove fat cache file
    if fat_file.exists():
        try:
            fat_file.unlink()
            results["fat_cache"] = True
            print(f"✓ Removed fat cache: {fat_file}")
        except (OSError, PermissionError) as e:
            print(f"✗ Failed to remove fat cache: {e}")
    else:
        print(f"! Fat cache not found: {fat_file}")

    # Remove carbs cache file
    if carbs_file.exists():
        try:
            carbs_file.unlink()
            results["carbs_cache"] = True
            print(f"✓ Removed carbs cache: {carbs_file}")
        except (OSError, PermissionError) as e:
            print(f"✗ Failed to remove carbs cache: {e}")
    else:
        print(f"! Carbs cache not found: {carbs_file}")

    # Update list of cached restaurants
    if list_file.exists():
        try:
            with open(list_file, "r", encoding="utf-8") as f:
                restaurant_list = json.load(f)

            if restaurant_name in restaurant_list:
                restaurant_list.remove(restaurant_name)

                with open(list_file, "w", encoding="utf-8") as f:
                    json.dump(restaurant_list, f, indent=4)

                results["list_updated"] = True
                print(f"✓ Updated restaurant list: removed '{restaurant_name}'")
            else:
                print(f"! Restaurant '{restaurant_name}' not found in list")
                results["list_updated"] = True  # Not an error if not in list

        except (OSError, PermissionError, json.JSONDecodeError) as e:
            print(f"✗ Failed to update restaurant list: {e}")
    else:
        print(f"✗ Restaurant list file not found: {list_file}")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Remove a cached restaurant and all its associated files"
    )
    parser.add_argument(
        "restaurant_name", help="Name of the restaurant to remove (e.g., 'mcdonalds')"
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path(__file__).parent / "app" / "restaurant_caches",
        help="Path to the restaurant_caches directory",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be removed without actually removing files",
    )

    args = parser.parse_args()

    # Validate cache directory
    if not args.cache_dir.exists():
        print(f"Error: Cache directory does not exist: {args.cache_dir}")
        sys.exit(1)

    restaurant_name = args.restaurant_name.lower().strip()

    if not restaurant_name:
        print("Error: Restaurant name cannot be empty")
        sys.exit(1)

    print(f"Removing restaurant: '{restaurant_name}'")
    print(f"Cache directory: {args.cache_dir}")
    print("-" * 50)

    if args.dry_run:
        print("DRY RUN - No files will actually be removed")
        print("-" * 50)

        # Show what would be removed
        main_file = args.cache_dir / f"{restaurant_name}_output.json"
        protein_file = (
            args.cache_dir
            / "highest_lowest_protein"
            / f"{restaurant_name}_protein_cache.json"
        )
        fat_file = (
            args.cache_dir / "highest_lowest_fat" / f"{restaurant_name}_fat_cache.json"
        )
        carbs_file = (
            args.cache_dir
            / "highest_lowest_carbs"
            / f"{restaurant_name}_carbs_cache.json"
        )

        files_to_check = [
            ("Main file", main_file),
            ("Protein cache", protein_file),
            ("Fat cache", fat_file),
            ("Carbs cache", carbs_file),
        ]

        for file_type, file_path in files_to_check:
            if file_path.exists():
                print(f"Would remove {file_type}: {file_path}")
            else:
                print(f"Not found {file_type}: {file_path}")

        # Check if in restaurant list
        list_file = args.cache_dir / "list_of_cached_restaurants.json"
        if list_file.exists():
            try:
                with open(list_file, "r", encoding="utf-8") as f:
                    restaurant_list = json.load(f)
                if restaurant_name in restaurant_list:
                    print(f"Would remove '{restaurant_name}' from restaurant list")
                else:
                    print(f"'{restaurant_name}' not found in restaurant list")
            except (OSError, json.JSONDecodeError) as e:
                print(f"Error reading restaurant list: {e}")

        return

    # Perform actual removal
    results = remove_restaurant_files(restaurant_name, args.cache_dir)

    print("-" * 50)
    print("Summary:")

    # Count successful operations
    successful_ops = sum(results.values())
    total_ops = len(results)

    if successful_ops == total_ops:
        print(f"✓ Successfully removed all files for '{restaurant_name}'")
    elif successful_ops > 0:
        print(
            f"⚠ Partially removed '{restaurant_name}' "
            f"({successful_ops}/{total_ops} operations successful)"
        )
    else:
        print(f"✗ Failed to remove '{restaurant_name}' (no operations successful)")

    # Also copy the updated files to frontend if they exist
    frontend_cache_dir = (
        Path(__file__).parent.parent / "frontend" / "public" / "restaurant_caches"
    )
    if frontend_cache_dir.exists():
        try:
            # Copy updated restaurant list to frontend
            source_list = args.cache_dir / "list_of_cached_restaurants.json"
            target_list = frontend_cache_dir / "list_of_cached_restaurants.json"

            if source_list.exists():
                import shutil

                shutil.copy2(source_list, target_list)
                print("✓ Updated frontend restaurant list")

        except (OSError, PermissionError) as e:
            print(f"⚠ Failed to update frontend cache: {e}")


if __name__ == "__main__":
    main()
