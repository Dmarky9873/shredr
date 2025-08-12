import pytest

from models.menu_item import MenuItem


class TestMenuItem:
    """Test suite for the MenuItem class."""

    def test_menu_item_initialization(self):
        """Test that MenuItem initializes correctly with all parameters."""
        item = MenuItem(
            name="Grilled Chicken",
            price=15.99,
            description="Tender grilled chicken breast",
            calories=300,
            protein=35.0,
            carbs=5.0,
            fat=12.0,
        )

        assert item.name == "Grilled Chicken"
        assert item.price == 15.99
        assert item.description == "Tender grilled chicken breast"
        assert item.calories == 300
        assert item.protein == 35.0
        assert item.carbs == 5.0
        assert item.fat == 12.0

    def test_protein_calorie_ratio_normal_case(self):
        """Test protein to calorie ratio calculation with normal values."""
        item = MenuItem(
            name="Test Item",
            price=10.0,
            description="Test",
            calories=200,
            protein=20.0,
            carbs=10.0,
            fat=5.0,
        )

        expected_ratio = 20.0 / 200  # 0.1
        assert item.protein_calorie_ratio() == expected_ratio

    def test_protein_calorie_ratio_zero_calories(self):
        """Test protein to calorie ratio when calories are zero."""
        item = MenuItem(
            name="Zero Cal Item",
            price=0.0,
            description="No calories",
            calories=0,
            protein=10.0,
            carbs=0.0,
            fat=0.0,
        )

        assert item.protein_calorie_ratio() == 0

    def test_fat_calorie_ratio_normal_case(self):
        """Test fat to calorie ratio calculation with normal values."""
        item = MenuItem(
            name="Test Item",
            price=10.0,
            description="Test",
            calories=400,
            protein=20.0,
            carbs=30.0,
            fat=15.0,
        )

        expected_ratio = 15.0 / 400  # 0.0375
        assert item.fat_calorie_ratio() == expected_ratio

    def test_fat_calorie_ratio_zero_calories(self):
        """Test fat to calorie ratio when calories are zero."""
        item = MenuItem(
            name="Zero Cal Item",
            price=0.0,
            description="No calories",
            calories=0,
            protein=0.0,
            carbs=0.0,
            fat=5.0,
        )

        assert item.fat_calorie_ratio() == 0

    def test_carb_calorie_ratio_normal_case(self):
        """Test carbohydrate to calorie ratio calculation with normal values."""
        item = MenuItem(
            name="Test Item",
            price=10.0,
            description="Test",
            calories=300,
            protein=15.0,
            carbs=45.0,
            fat=10.0,
        )

        expected_ratio = 45.0 / 300  # 0.15
        assert item.carb_calorie_ratio() == expected_ratio

    def test_carb_calorie_ratio_zero_calories(self):
        """Test carbohydrate to calorie ratio when calories are zero."""
        item = MenuItem(
            name="Zero Cal Item",
            price=0.0,
            description="No calories",
            calories=0,
            protein=0.0,
            carbs=20.0,
            fat=0.0,
        )

        assert item.carb_calorie_ratio() == 0

    def test_all_ratios_with_high_protein_item(self):
        """Test all ratio calculations with a high-protein item."""
        item = MenuItem(
            name="Protein Shake",
            price=8.99,
            description="High protein shake",
            calories=150,
            protein=30.0,
            carbs=5.0,
            fat=2.0,
        )

        assert item.protein_calorie_ratio() == 30.0 / 150  # 0.2
        assert item.carb_calorie_ratio() == 5.0 / 150  # ~0.033
        assert item.fat_calorie_ratio() == 2.0 / 150  # ~0.013

    def test_menu_item_with_decimal_values(self):
        """Test MenuItem with decimal protein, carbs, and fat values."""
        item = MenuItem(
            name="Mixed Salad",
            price=12.50,
            description="Fresh mixed greens",
            calories=180,
            protein=8.5,
            carbs=15.7,
            fat=11.2,
        )

        assert abs(item.protein_calorie_ratio() - (8.5 / 180)) < 1e-10
        assert abs(item.carb_calorie_ratio() - (15.7 / 180)) < 1e-10
        assert abs(item.fat_calorie_ratio() - (11.2 / 180)) < 1e-10

    @pytest.mark.parametrize(
        "calories,protein,expected",
        [
            (100, 10, 0.1),
            (200, 25, 0.125),
            (500, 40, 0.08),
            (0, 15, 0),  # Zero calories case
        ],
    )
    def test_protein_calorie_ratio_parametrized(self, calories, protein, expected):
        """Test protein calorie ratio with various parameter combinations."""
        item = MenuItem(
            name="Test Item",
            price=10.0,
            description="Test",
            calories=calories,
            protein=protein,
            carbs=10.0,
            fat=5.0,
        )

        assert item.protein_calorie_ratio() == expected

    def test_menu_item_string_representation(self):
        """Test that MenuItem can be used in string contexts (for debugging)."""
        item = MenuItem(
            name="Burger",
            price=14.99,
            description="Beef burger",
            calories=650,
            protein=28.0,
            carbs=45.0,
            fat=35.0,
        )

        # This test ensures the object can be converted to string without errors
        # Useful for debugging and logging
        str_repr = str(item)
        assert "MenuItem" in str_repr or "Burger" in str(item.__dict__)
