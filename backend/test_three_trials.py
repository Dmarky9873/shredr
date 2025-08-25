#!/usr/bin/env python3
"""
Simple test script to demonstrate the three-trial mechanism.
"""

from app.scraping.find_restaurant_link import find_restaurant_links


def test_three_trials():
    """Test the three-trial mechanism for finding restaurant links."""

    print("Testing three-trial mechanism...")
    print("=" * 50)

    # Test with a restaurant that should have multiple URLs
    restaurant_name = "McDonald's"
    urls, error_occurred = find_restaurant_links(restaurant_name, max_links=3)

    print(f"Restaurant: {restaurant_name}")
    print(f"Found {len(urls)} URLs:")
    for i, url in enumerate(urls, 1):
        print(f"  {i}. {url}")

    if error_occurred:
        print("❌ Error occurred during search")
    else:
        print(f"✅ Successfully found {len(urls)} potential PDFs")

    print("\n" + "=" * 50)

    # Test with a non-existent restaurant
    restaurant_name = "NonExistentRestaurantXYZ123"
    urls, error_occurred = find_restaurant_links(restaurant_name, max_links=3)

    print(f"Restaurant: {restaurant_name}")
    print(f"Found {len(urls)} URLs:")
    for i, url in enumerate(urls, 1):
        print(f"  {i}. {url}")

    if error_occurred:
        print("❌ Error occurred during search")
    else:
        print(f"✅ Search completed, found {len(urls)} URLs")


if __name__ == "__main__":
    test_three_trials()
