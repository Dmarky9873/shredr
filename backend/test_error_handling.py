#!/usr/bin/env python3
"""
Test script to verify error handling in process_toronto_restaurants.py
"""

import os
import sys

# Add the backend directory to the path
sys.path.insert(0, "/Users/danielmarkusson/Documents/GitHub/shredr/backend")

from process_toronto_restaurants import process_restaurant


def test_error_handling():
    """Test that the error handling works properly"""

    print("🧪 Testing error handling...")

    # Test with a restaurant that likely won't have a PDF
    test_restaurant = "Nonexistent Restaurant XYZ123"

    try:
        result = process_restaurant(test_restaurant, show_detailed_output=True)

        print(f"✅ Error handling test completed")
        print(f"Result: {result}")

        if not result["success"]:
            print("✅ Correctly handled restaurant with no PDF")
        else:
            print("⚠️  Unexpected success for nonexistent restaurant")

    except Exception as e:
        print(f"❌ Error handling failed: {e}")
        return False

    return True


if __name__ == "__main__":
    test_error_handling()
