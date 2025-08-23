"""
Module for finding restaurant nutrition information links.
"""

from typing import Optional

from googlesearch import search

from ..utils.string_parsing import clean_restaurant_name


def find_restaurant_link(restaurant_name: str) -> Optional[str]:
    """Finds the link to the nutrition information PDF for a given restaurant.

    Args:
        restaurant_name (`str`): The name of the restaurant to search for.

    Returns:
        `None`: If no link is found.\n
        `str`: The link to the nutrition information PDF if found.
    """
    cleaned_name = clean_restaurant_name(restaurant_name)
    search_query = f"{cleaned_name} Nutrition filetype:pdf"
    try:
        search_results = search(search_query, num_results=5)
        for result in search_results:
            if result:
                result_str = str(result)
                if result_str.startswith("/"):
                    result_str = f"https://www.google.com{result_str}"
                if (
                    result_str.startswith(("http://", "https://"))
                    and "pdf" in result_str.lower()
                ):
                    return result_str

        print(f"No valid PDF URL found for {cleaned_name}")
        return None

    except Exception as e:  # pylint: disable=broad-exception-caught
        print(f"Error searching for {cleaned_name}: {e}")
        return None


def main():
    """
    Main function to find the nutrition link for a restaurant (for testing purposes).
    """
    link = find_restaurant_link(input("Enter a restaurant name: "))
    if link:
        print(f"Found link: {link}")
    else:
        print("No link found.")


if __name__ == "__main__":

    main()
