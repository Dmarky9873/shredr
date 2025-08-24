import { MenuItem } from "../components/MacronutrientTable";

interface FindSortedMenuItemsProps {
  proteinCalorieRatioOrder: string[];
  fatCalorieRatioOrder: string[];
  carbsCalorieRatioOrder: string[];
  menuItems: MenuItem[];
}

export default function findSortedMenuItems({
  proteinCalorieRatioOrder,
  fatCalorieRatioOrder,
  carbsCalorieRatioOrder,
  menuItems,
}: FindSortedMenuItemsProps) {
  const proteinCalorieRatioSorted: MenuItem[] = [];
  const fatCalorieRatioSorted: MenuItem[] = [];
  const carbsCalorieRatioSorted: MenuItem[] = [];

  for (const itemName of proteinCalorieRatioOrder) {
    const menuItem = menuItems.find((item) => item.dish === itemName);
    if (menuItem) {
      proteinCalorieRatioSorted.push(menuItem);
    }
  }

  for (const itemName of fatCalorieRatioOrder) {
    const menuItem = menuItems.find((item) => item.dish === itemName);
    if (menuItem) {
      fatCalorieRatioSorted.push(menuItem);
    }
  }

  for (const itemName of carbsCalorieRatioOrder) {
    const menuItem = menuItems.find((item) => item.dish === itemName);
    if (menuItem) {
      carbsCalorieRatioSorted.push(menuItem);
    }
  }

  return {
    proteinCalorieRatioSorted,
    fatCalorieRatioSorted,
    carbsCalorieRatioSorted,
  };
}
