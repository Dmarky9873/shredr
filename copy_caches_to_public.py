#!/usr/bin/env python3
"""
Script to copy restaurant cache files from backend to frontend public directory.
This makes the restaurant data accessible to the frontend application.
"""

import json
import os
import shutil
from pathlib import Path


def copy_restaurant_caches():
    """Copy restaurant cache files from backend to frontend public directory."""

    # Define source and destination paths
    backend_cache_dir = Path("backend/app/restaurant_caches")
    frontend_public_dir = Path("frontend/public/")

    # Ensure the destination directory exists
    frontend_public_dir.mkdir(parents=True, exist_ok=True)

    # Create restaurant caches subdirectory in frontend
    restaurant_cache_dest = frontend_public_dir / "restaurant_caches"
    restaurant_cache_dest.mkdir(exist_ok=True)

    # Copy the main restaurant list file
    list_file = backend_cache_dir / "list_of_cached_restaurants.json"
    if list_file.exists():
        shutil.copy2(list_file, restaurant_cache_dest)
        print(f"Copied {list_file.name}")
    else:
        print(f"Warning: {list_file} not found")
        return

    # Read the list of cached restaurants
    with open(list_file, "r", encoding="utf-8") as f:
        restaurants = json.load(f)

    # Copy each restaurant's output file
    for restaurant in restaurants:
        restaurant_file = backend_cache_dir / f"{restaurant}_output.json"
        if restaurant_file.exists():
            shutil.copy2(restaurant_file, restaurant_cache_dest)
            print(f"Copied {restaurant_file.name}")
        else:
            print(f"Warning: {restaurant_file} not found")

    # Copy nutrition ranking cache directories
    nutrition_dirs = [
        "highest_lowest_carbs",
        "highest_lowest_fat",
        "highest_lowest_protein",
    ]

    for nutrition_dir in nutrition_dirs:
        source_nutrition_dir = backend_cache_dir / nutrition_dir
        dest_nutrition_dir = restaurant_cache_dest / nutrition_dir

        if source_nutrition_dir.exists():
            # Create destination directory
            dest_nutrition_dir.mkdir(exist_ok=True)

            # Copy all JSON files in the nutrition directory
            for json_file in source_nutrition_dir.glob("*.json"):
                shutil.copy2(json_file, dest_nutrition_dir)
                print(f"Copied {nutrition_dir}/{json_file.name}")
        else:
            print(f"Warning: {source_nutrition_dir} not found")

    print(f"\nAll restaurant cache files copied to {restaurant_cache_dest}")


def clean_old_caches():
    """Remove old cache files from frontend to ensure clean state."""

    frontend_cache_dir = Path("frontend/public/datasets/restaurant_caches")

    if frontend_cache_dir.exists():
        print("Cleaning old cache files...")
        shutil.rmtree(frontend_cache_dir)
        print("Old cache files removed")


def main():
    """Main function to execute the cache copying process."""

    # Change to the repository root directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)

    print("Starting restaurant cache copy process...")
    print(f"Working directory: {os.getcwd()}")

    # Verify source directory exists
    backend_cache_dir = Path("backend/app/restaurant_caches")
    if not backend_cache_dir.exists():
        print(f"Error: Source directory {backend_cache_dir} does not exist")
        return 1

    # Verify frontend directory exists
    frontend_dir = Path("frontend/public")
    if not frontend_dir.exists():
        print(f"Error: Frontend directory {frontend_dir} does not exist")
        return 1

    try:
        # Clean old caches first
        clean_old_caches()

        # Copy new caches
        copy_restaurant_caches()

        print("\n✅ Restaurant cache copy completed successfully!")
        return 0

    except (OSError, IOError, json.JSONDecodeError) as e:
        print(f"❌ Error during cache copy: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
