import string


def is_number(s):
    """Check if the input is a number.

    Args:
        s (str): The input string to check.

    Returns:
        bool: True if the input is a number, False otherwise.
    """
    try:
        float(s)
        return True
    except ValueError:
        return False


def clean_restaurant_name(restaurant_name: str) -> str:
    """
    Takes the restaurant name, turns it all to lowercase, removes extra
    whitespace, and removes all punctuation.
    """

    restaurant_name = restaurant_name.strip().lower()
    restaurant_name = restaurant_name.translate(
        str.maketrans("", "", string.punctuation)
    )
    return restaurant_name
