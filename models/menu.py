from models.menu_item import MenuItem


class Menu:
    """Represents a menu for a restaurant."""

    def __init__(self, restaurant_name: str, items: set[MenuItem] = None):
        self.restaurant_name = restaurant_name
        self.items = items if items is not None else set()

    def calculate_sorted_protein_calorie_ratios(self):
        """Calculate the protein to calorie ratios for all menu items.

        Returns:
            list: A list of tuples containing the item name and its protein to calorie ratio,
                  sorted in descending order by the ratio.
        """
        return sorted(
            [(item.name, item.protein_calorie_ratio()) for item in self.items],
            key=lambda x: x[1],
            reverse=True,
        )

    def calculate_sorted_fat_calorie_ratios(self):
        """Calculate the fat to calorie ratios for all menu items.

        Returns:
            list: A list of tuples containing the item name and its fat to calorie ratio,
                  sorted in descending order by the ratio.
        """
        return sorted(
            [(item.name, item.fat_calorie_ratio()) for item in self.items],
            key=lambda x: x[1],
            reverse=True,
        )

    def calculate_sorted_carb_calorie_ratios(self):
        """Calculate the carbohydrate to calorie ratios for all menu items.

        Returns:
            list: A list of tuples containing the item name and its carbohydrate to calorie ratio,
                  sorted in descending order by the ratio.
        """
        return sorted(
            [(item.name, item.carb_calorie_ratio()) for item in self.items],
            key=lambda x: x[1],
            reverse=True,
        )
