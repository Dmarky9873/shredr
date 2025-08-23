"""
Integration tests that test the interaction between Menu and MenuItem classes.
"""

import pytest

from app.models.menu import Menu
from app.models.menu_item import MenuItem


class TestMenuIntegration:
    """Integration tests for Menu and MenuItem classes working together."""

    def test_complete_menu_workflow(self):
        """Test a complete workflow of creating a menu and analyzing it."""
        burger = MenuItem(
            "Burger", 750, 30.0, 45.0, 40.0, 14.99, "Beef burger with fries"
        )
        salad = MenuItem(
            "Greek Salad", 350, 12.0, 25.0, 20.0, 11.99, "Fresh Greek salad"
        )
        protein_shake = MenuItem(
            "Protein Shake", 180, 35.0, 8.0, 3.0, 7.99, "Whey protein shake"
        )
        pizza = MenuItem(
            "Margherita Pizza", 600, 25.0, 70.0, 22.0, 13.99, "Classic pizza"
        )

        menu = Menu("Healthy Eats", {burger, salad, protein_shake, pizza})

        protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        assert len(protein_ratios) == 4
        assert protein_ratios[0][0] == "Protein Shake"

        fat_ratios = menu.calculate_sorted_fat_calorie_ratios()
        assert len(fat_ratios) == 4

        carb_ratios = menu.calculate_sorted_carb_calorie_ratios()
        assert len(carb_ratios) == 4
        assert carb_ratios[0][0] == "Margherita Pizza"

    def test_menu_item_ratio_consistency(self):
        """Test that individual MenuItem ratios match Menu calculation results."""
        item = MenuItem("Test Item", 200, 20.0, 30.0, 10.0, 10.0, "Test")
        menu = Menu("Test Menu", {item})

        protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        fat_ratios = menu.calculate_sorted_fat_calorie_ratios()
        carb_ratios = menu.calculate_sorted_carb_calorie_ratios()

        assert protein_ratios[0][1] == item.protein_calorie_ratio()
        assert fat_ratios[0][1] == item.fat_calorie_ratio()
        assert carb_ratios[0][1] == item.carb_calorie_ratio()

    def test_real_world_restaurant_scenario(self):
        """Test with realistic restaurant menu items."""
        menu_items = {
            MenuItem(
                "Pancakes", 520, 8.0, 85.0, 12.0, 8.99, "Fluffy pancakes with syrup"
            ),
            MenuItem("Omelette", 380, 28.0, 4.0, 26.0, 12.99, "Three-egg omelette"),
            MenuItem(
                "Club Sandwich", 680, 32.0, 48.0, 38.0, 11.99, "Triple-decker sandwich"
            ),
            MenuItem(
                "Soup & Salad",
                290,
                12.0,
                35.0,
                8.0,
                9.99,
                "Tomato soup with side salad",
            ),
            MenuItem(
                "Ribeye Steak",
                580,
                52.0,
                8.0,
                38.0,
                28.99,
                "12oz ribeye with vegetables",
            ),
            MenuItem(
                "Grilled Chicken",
                420,
                48.0,
                6.0,
                18.0,
                18.99,
                "Herb-crusted chicken breast",
            ),
            MenuItem(
                "Cheesecake", 410, 8.0, 32.0, 28.0, 6.99, "New York style cheesecake"
            ),
        }

        restaurant = Menu("Grandma's Kitchen", menu_items)

        protein_analysis = restaurant.calculate_sorted_protein_calorie_ratios()
        top_protein_items = [item[0] for item in protein_analysis[:3]]

        assert "Grilled Chicken" in top_protein_items
        assert "Ribeye Steak" in top_protein_items

        carb_analysis = restaurant.calculate_sorted_carb_calorie_ratios()
        assert carb_analysis[0][0] == "Pancakes"

        assert len(protein_analysis) == len(menu_items)
        assert len(carb_analysis) == len(menu_items)

    def test_menu_with_edge_case_items(self):
        """Test menu behavior with edge case menu items."""
        edge_case_items = {
            MenuItem("Zero Cal Water", 0, 0.0, 0.0, 0.0, 2.99, "Flavored water"),
            MenuItem("Pure Protein", 120, 30.0, 0.0, 0.0, 15.99, "Protein powder"),
            MenuItem("Pure Fat", 250, 0.0, 0.0, 28.0, 12.99, "Avocado oil"),
            MenuItem("Pure Carbs", 200, 0.0, 50.0, 0.0, 8.99, "Sugar cube collection"),
            MenuItem(
                "Balanced Item", 300, 25.0, 25.0, 17.0, 14.99, "Perfectly balanced"
            ),
        }

        menu = Menu("Edge Case Cafe", edge_case_items)

        protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        assert protein_ratios[0][0] == "Pure Protein"

        zero_protein_items = [item[0] for item in protein_ratios if item[1] == 0]
        assert "Zero Cal Water" in zero_protein_items
        assert "Pure Fat" in zero_protein_items
        assert "Pure Carbs" in zero_protein_items

        fat_ratios = menu.calculate_sorted_fat_calorie_ratios()
        assert fat_ratios[0][0] == "Pure Fat"

        carb_ratios = menu.calculate_sorted_carb_calorie_ratios()
        assert carb_ratios[0][0] == "Pure Carbs"

    def test_menu_modification_effects(self):
        """Test how menu modifications affect analysis results."""
        initial_item = MenuItem(
            "Initial Item", 300, 15.0, 30.0, 12.0, 10.0, "First item"
        )
        menu = Menu("Dynamic Menu", {initial_item})

        initial_protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        assert len(initial_protein_ratios) == 1
        assert initial_protein_ratios[0][0] == "Initial Item"

        high_protein_item = MenuItem(
            "Protein Bomb", 200, 40.0, 5.0, 3.0, 20.0, "High protein"
        )
        menu.items.add(high_protein_item)

        updated_protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        assert len(updated_protein_ratios) == 2
        assert updated_protein_ratios[0][0] == "Protein Bomb"
        assert updated_protein_ratios[1][0] == "Initial Item"

        menu.items.remove(initial_item)

        final_protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        assert len(final_protein_ratios) == 1
        assert final_protein_ratios[0][0] == "Protein Bomb"

    @pytest.mark.parametrize(
        "restaurant_name,expected_behavior",
        [
            ("Fast Food Joint", "should handle typical fast food items"),
            ("Fine Dining", "should handle gourmet items"),
            ("Health Food Store", "should handle healthy options"),
            ("", "should handle empty restaurant name"),
        ],
    )
    def test_different_restaurant_types(self, restaurant_name, expected_behavior):
        """Test menu behavior with different types of restaurants."""
        _ = expected_behavior

        typical_item = MenuItem(
            "Typical Item", 350, 20.0, 25.0, 15.0, 12.99, "Standard item"
        )
        menu = Menu(restaurant_name, {typical_item})

        assert menu.restaurant_name == restaurant_name
        assert len(menu.items) == 1

        protein_ratios = menu.calculate_sorted_protein_calorie_ratios()
        fat_ratios = menu.calculate_sorted_fat_calorie_ratios()
        carb_ratios = menu.calculate_sorted_carb_calorie_ratios()

        assert len(protein_ratios) == len(fat_ratios) == len(carb_ratios) == 1
