import { useEffect, useMemo, useState } from "react";
import { MenuItem } from "../components/MacronutrientTable";
import findSortedMenuItems from "../utils/findSortedMenuItems";

interface UseFindMenuItemsProps {
  restaurantName: string;
}

export default function useFindSortedMenuItems({
  restaurantName,
}: UseFindMenuItemsProps) {
  const [proteinCalorieRatioOrder, setProteinCalorieRatioOrder] = useState<
    string[]
  >([]);
  const [fatCalorieRatioOrder, setFatCalorieRatioOrder] = useState<string[]>(
    []
  );
  const [carbsCalorieRatioOrder, setCarbsCalorieRatioOrder] = useState<
    string[]
  >([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMenuItems() {
      if (!restaurantName) return;

      try {
        setLoading(true);

        const [
          proteinCalorieJSON,
          fatCalorieJSON,
          carbsCalorieJSON,
          menuItemsJSON,
        ] = await Promise.all([
          fetch(
            `/restaurant_caches/highest_lowest_protein/${restaurantName}_protein_cache.json`
          ),
          fetch(
            `/restaurant_caches/highest_lowest_fat/${restaurantName}_fat_cache.json`
          ),
          fetch(
            `/restaurant_caches/highest_lowest_carbs/${restaurantName}_carbs_cache.json`
          ),
          fetch(`/restaurant_caches/${restaurantName}_output.json`),
        ]);

        const [
          proteinCalorieData,
          fatCalorieData,
          carbsCalorieData,
          menuItemsData,
        ] = await Promise.all([
          proteinCalorieJSON.json(),
          fatCalorieJSON.json(),
          carbsCalorieJSON.json(),
          menuItemsJSON.json(),
        ]);

        setProteinCalorieRatioOrder(proteinCalorieData.menu);
        setFatCalorieRatioOrder(fatCalorieData.menu);
        setCarbsCalorieRatioOrder(carbsCalorieData.menu);
        setMenuItems(menuItemsData.menu_items);
      } catch (error) {
        console.error("Error loading menu items:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMenuItems();
  }, [restaurantName]);

  const sortedItems = useMemo(() => {
    if (!menuItems.length || !proteinCalorieRatioOrder.length) {
      return {
        proteinCalorieRatioSorted: [],
        fatCalorieRatioSorted: [],
        carbsCalorieRatioSorted: [],
      };
    }

    return findSortedMenuItems({
      proteinCalorieRatioOrder,
      fatCalorieRatioOrder,
      carbsCalorieRatioOrder,
      menuItems,
    });
  }, [
    proteinCalorieRatioOrder,
    fatCalorieRatioOrder,
    carbsCalorieRatioOrder,
    menuItems,
  ]);

  return {
    sortedItems,
    loading,
    hasData: menuItems.length > 0,
  };
}
