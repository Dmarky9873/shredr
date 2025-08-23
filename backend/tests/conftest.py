"""
Shared pytest fixtures and configuration for the test suite.
"""

import pytest

from app.models.menu import Menu
from app.models.menu_item import MenuItem


@pytest.fixture
def sample_menu_item():
    """Fixture providing a sample menu item for testing."""
    return MenuItem(
        name="Sample Item",
        price=12.99,
        description="A sample menu item for testing",
        calories=250,
        protein=20.0,
        carbs=15.0,
        fat=10.0,
    )


@pytest.fixture
def zero_calorie_item():
    """Fixture providing a zero-calorie menu item for testing."""
    return MenuItem(
        name="Zero Cal Item",
        price=0.0,
        description="No calories",
        calories=0,
        protein=5.0,
        carbs=0.0,
        fat=0.0,
    )


@pytest.fixture
def diverse_menu_items():
    """Fixture providing a diverse set of menu items for testing."""
    return [
        MenuItem("High Protein Shake", 8.99, "Protein shake", 150, 30.0, 5.0, 2.0),
        MenuItem("Pasta Carbonara", 16.99, "Creamy pasta", 650, 20.0, 75.0, 35.0),
        MenuItem("Grilled Salmon", 22.99, "Fresh salmon", 400, 35.0, 0.0, 20.0),
        MenuItem("Caesar Salad", 11.99, "Romaine lettuce", 200, 8.0, 15.0, 12.0),
        MenuItem("Chocolate Cake", 7.99, "Rich chocolate", 450, 6.0, 60.0, 18.0),
    ]


@pytest.fixture
def restaurant_menu(diverse_menu_items):  # pylint: disable=redefined-outer-name
    """Fixture providing a complete restaurant menu for testing."""
    return Menu("Test Restaurant", set(diverse_menu_items))


@pytest.fixture
def empty_menu():
    """Fixture providing an empty menu for testing."""
    return Menu("Empty Restaurant")
