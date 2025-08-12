import pytest

from models.menu import Menu
from models.menu_item import MenuItem


class TestMenu:
    """Test suite for the Menu class."""

    def test_menu_initialization_empty(self):
        """Test that Menu initializes correctly with no items."""
        menu = Menu("Test Restaurant")

        assert menu.restaurant_name == "Test Restaurant"
        assert menu.items == set()
        assert len(menu.items) == 0

    def test_menu_initialization_with_items(self):
        """Test that Menu initializes correctly with provided items."""
        item1 = MenuItem("Burger", 10.0, "Beef burger", 500, 25.0, 30.0, 20.0)
        item2 = MenuItem("Salad", 8.0, "Green salad", 150, 5.0, 15.0, 8.0)
        items = {item1, item2}

        menu = Menu("Test Restaurant", items)

        assert menu.restaurant_name == "Test Restaurant"
        assert menu.items == items
        assert len(menu.items) == 2

    def test_calculate_sorted_protein_calorie_ratios_empty_menu(self):
        """Test protein calorie ratios calculation with empty menu."""
        menu = Menu("Empty Restaurant")

        ratios = menu.calculate_sorted_protein_calorie_ratios()

        assert ratios == []

    def test_calculate_sorted_protein_calorie_ratios(self):
        """Test protein calorie ratios calculation and sorting."""
        # Create items with different protein-to-calorie ratios
        high_protein = MenuItem(
            "Protein Shake", 12.0, "High protein", 200, 40.0, 5.0, 2.0
        )  # ratio: 0.2
        medium_protein = MenuItem(
            "Chicken", 15.0, "Grilled chicken", 300, 35.0, 0.0, 12.0
        )  # ratio: ~0.117
        low_protein = MenuItem(
            "Pasta", 14.0, "Pasta dish", 400, 15.0, 60.0, 8.0
        )  # ratio: 0.0375

        menu = Menu("Test Restaurant", {high_protein, medium_protein, low_protein})

        ratios = menu.calculate_sorted_protein_calorie_ratios()

        # Should be sorted in descending order by ratio
        assert len(ratios) == 3
        assert ratios[0][0] == "Protein Shake"  # Highest ratio
        assert ratios[0][1] == 0.2
        assert ratios[1][0] == "Chicken"  # Middle ratio
        assert abs(ratios[1][1] - (35.0 / 300)) < 1e-10
        assert ratios[2][0] == "Pasta"  # Lowest ratio
        assert ratios[2][1] == 0.0375

    def test_calculate_sorted_fat_calorie_ratios_empty_menu(self):
        """Test fat calorie ratios calculation with empty menu."""
        menu = Menu("Empty Restaurant")

        ratios = menu.calculate_sorted_fat_calorie_ratios()

        assert ratios == []

    def test_calculate_sorted_fat_calorie_ratios(self):
        """Test fat calorie ratios calculation and sorting."""
        # Create items with different fat-to-calorie ratios
        high_fat = MenuItem(
            "Avocado Toast", 12.0, "Creamy avocado", 300, 8.0, 20.0, 25.0
        )  # ratio: ~0.083
        medium_fat = MenuItem(
            "Salmon", 18.0, "Grilled salmon", 250, 30.0, 0.0, 15.0
        )  # ratio: 0.06
        low_fat = MenuItem(
            "Rice", 6.0, "Steamed rice", 200, 4.0, 45.0, 2.0
        )  # ratio: 0.01

        menu = Menu("Test Restaurant", {high_fat, medium_fat, low_fat})

        ratios = menu.calculate_sorted_fat_calorie_ratios()

        # Should be sorted in descending order by ratio
        assert len(ratios) == 3
        assert ratios[0][0] == "Avocado Toast"  # Highest ratio
        assert abs(ratios[0][1] - (25.0 / 300)) < 1e-10
        assert ratios[1][0] == "Salmon"  # Middle ratio
        assert ratios[1][1] == 0.06
        assert ratios[2][0] == "Rice"  # Lowest ratio
        assert ratios[2][1] == 0.01

    def test_calculate_sorted_carb_calorie_ratios_empty_menu(self):
        """Test carb calorie ratios calculation with empty menu."""
        menu = Menu("Empty Restaurant")

        ratios = menu.calculate_sorted_carb_calorie_ratios()

        assert ratios == []

    def test_calculate_sorted_carb_calorie_ratios(self):
        """Test carb calorie ratios calculation and sorting."""
        # Create items with different carb-to-calorie ratios
        high_carb = MenuItem(
            "Pasta", 14.0, "Pasta dish", 400, 15.0, 80.0, 8.0
        )  # ratio: 0.2
        medium_carb = MenuItem(
            "Sandwich", 10.0, "Deli sandwich", 350, 20.0, 40.0, 12.0
        )  # ratio: ~0.114
        low_carb = MenuItem(
            "Steak", 25.0, "Grilled steak", 300, 40.0, 5.0, 15.0
        )  # ratio: ~0.017

        menu = Menu("Test Restaurant", {high_carb, medium_carb, low_carb})

        ratios = menu.calculate_sorted_carb_calorie_ratios()

        assert len(ratios) == 3
        assert ratios[0][0] == "Pasta"
        assert ratios[0][1] == 0.2
        assert ratios[1][0] == "Sandwich"
        assert abs(ratios[1][1] - (40.0 / 350)) < 1e-10
        assert ratios[2][0] == "Steak"
        assert abs(ratios[2][1] - (5.0 / 300)) < 1e-10

    def test_menu_with_zero_calorie_items(self):
        """Test menu calculations with items that have zero calories."""
        zero_cal = MenuItem("Water", 0.0, "Plain water", 0, 0.0, 0.0, 0.0)
        normal_item = MenuItem("Apple", 1.0, "Fresh apple", 80, 0.5, 20.0, 0.3)

        menu = Menu("Test Restaurant", {zero_cal, normal_item})

        protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        fat_ratios = menu.calculate_sorted_fat_calorie_ratios()
        carb_ratios = menu.calculate_sorted_carb_calorie_ratios()

        assert len(protein_ratios) == 2
        assert protein_ratios[0][0] == "Apple"
        assert protein_ratios[1][0] == "Water"
        assert protein_ratios[1][1] == 0

        assert len(fat_ratios) == 2
        assert fat_ratios[0][0] == "Apple"
        assert fat_ratios[1][0] == "Water"
        assert fat_ratios[1][1] == 0

        assert len(carb_ratios) == 2
        assert carb_ratios[0][0] == "Apple"
        assert carb_ratios[1][0] == "Water"
        assert carb_ratios[1][1] == 0

    def test_menu_with_duplicate_items(self):
        """Test that menu handles set behavior correctly (no duplicates)."""
        item1 = MenuItem("Burger", 10.0, "Beef burger", 500, 25.0, 30.0, 20.0)
        item2 = MenuItem("Burger", 10.0, "Beef burger", 500, 25.0, 30.0, 20.0)

        menu = Menu("Test Restaurant", {item1, item2})

        assert len(menu.items) == 2

    def test_menu_items_modification(self):
        """Test that we can modify the menu items after creation."""
        menu = Menu("Test Restaurant")

        item1 = MenuItem("Pizza", 12.0, "Cheese pizza", 350, 15.0, 40.0, 12.0)
        item2 = MenuItem("Salad", 8.0, "Caesar salad", 200, 8.0, 10.0, 15.0)

        menu.items.add(item1)
        menu.items.add(item2)

        assert len(menu.items) == 2

        ratios = menu.calculate_sorted_protein_calorie_ratios()
        assert len(ratios) == 2

    @pytest.fixture
    def sample_menu(self):
        """Fixture providing a sample menu for testing."""
        items = {
            MenuItem("High Protein", 15.0, "Protein rich", 200, 40.0, 5.0, 5.0),
            MenuItem("High Fat", 20.0, "Fat rich", 300, 10.0, 10.0, 25.0),
            MenuItem("High Carb", 12.0, "Carb rich", 400, 8.0, 80.0, 5.0),
        }
        return Menu("Sample Restaurant", items)

    def test_all_ratio_methods_consistency(self, sample_menu):
        """Test that all ratio calculation methods work consistently."""
        protein_ratios = sample_menu.calculate_sorted_protein_calorie_ratios()
        fat_ratios = sample_menu.calculate_sorted_fat_calorie_ratios()
        carb_ratios = sample_menu.calculate_sorted_carb_calorie_ratios()

        assert len(protein_ratios) == len(fat_ratios) == len(carb_ratios) == 3

        protein_names = {item[0] for item in protein_ratios}
        fat_names = {item[0] for item in fat_ratios}
        carb_names = {item[0] for item in carb_ratios}

        expected_names = {"High Protein", "High Fat", "High Carb"}
        assert protein_names == fat_names == carb_names == expected_names
