from typing import Optional


class MenuItem:
    """Represents a menu item in a restaurant."""

    def __init__(
        self,
        name: str,
        calories: int,
        protein: float,
        carbs: float,
        fat: float,
        price: Optional[float] = None,
        description: str = "",
    ):
        self.name = name
        self.price = price
        self.description = description
        self.calories = calories
        self.protein = protein
        self.carbs = carbs
        self.fat = fat

    def protein_calorie_ratio(self):
        """Calculate the protein to calorie ratio of the menu item.

        Returns:
            float: The protein to calorie ratio, or 0 if calories are 0.
        """
        if self.calories == 0:
            return 0
        return self.protein / self.calories

    def fat_calorie_ratio(self):
        """Calculate the fat to calorie ratio of the menu item.

        Returns:
            float: The fat to calorie ratio, or 0 if calories are 0.
        """
        if self.calories == 0:
            return 0
        return self.fat / self.calories

    def carb_calorie_ratio(self):
        """Calculate the carbohydrate to calorie ratio of the menu item.

        Returns:
            float: The carbohydrate to calorie ratio, or 0 if calories are 0.
        """
        if self.calories == 0:
            return 0
        return self.carbs / self.calories
