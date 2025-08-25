"""
Module for finding restaurant nutrition information links.
"""

from typing import List, Optional, Tuple

from googlesearch import search

from ..utils.string_parsing import clean_restaurant_name


def find_restaurant_links(
    restaurant_name: str, max_links: int = 3
) -> Tuple[List[str], bool]:
    """Finds up to max_links nutrition information PDF links for a given restaurant.

    Args:
        restaurant_name (`str`): The name of the restaurant to search for.
        max_links (`int`): Maximum number of links to return (default: 3).

    Returns:
        `Tuple[List[str], bool]`: Tuple containing list of links and whether an
        error occurred.
    """
    cleaned_name = clean_restaurant_name(restaurant_name)
    search_query = f"{cleaned_name} Nutrition filetype:pdf"
    found_links: list[str] = []

    try:
        search_results = search(search_query, num_results=5)
        for result in search_results:
            if len(found_links) >= max_links:
                break

            if result:
                result_str = str(result)
                if result_str.startswith("/"):
                    result_str = f"https://www.google.com{result_str}"
                if (
                    result_str.startswith(("http://", "https://"))
                    and "pdf" in result_str.lower()
                ):
                    found_links.append(result_str)

        return found_links, False

    except Exception as e:  # pylint: disable=broad-exception-caught
        print(f"Error searching for {cleaned_name}: {e}")
        return [], True


def find_restaurant_link(restaurant_name: str) -> Optional[str]:
    """Finds the link to the nutrition information PDF for a given restaurant.
    (Maintained for backward compatibility - returns first link found)

    Args:
        restaurant_name (`str`): The name of the restaurant to search for.

    Returns:
        `None`: If no link is found.\n
        `str`: The link to the nutrition information PDF if found.
    """
    cleaned_name = clean_restaurant_name(restaurant_name)
    links, error_occurred = find_restaurant_links(restaurant_name, max_links=1)
    if not links and not error_occurred:
        print(f"No valid PDF URL found for {cleaned_name}")
        return None
    return links[0] if links else None


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
