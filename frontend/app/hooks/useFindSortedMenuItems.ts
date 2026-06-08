import { useEffect, useMemo, useState } from "react";
import { MenuItem } from "../components/MacronutrientTable";
import findSortedMenuItems from "../utils/findSortedMenuItems";

interface UseFindMenuItemsProps {
  restaurantName: string;
}

interface RestaurantMetadata {
  restaurant_name: string;
  url: string;
  date: string;
  uses_ai_estimates?: boolean;
  estimated_item_count?: number;
  source?: "official" | "ai_estimated";
  cache_status?: "hit" | "miss";
}

interface RestaurantNutritionResponse {
  restaurant_name: string;
  url: string;
  date: string;
  menu_items: MenuItem[];
  uses_ai_estimates?: boolean;
  estimated_item_count?: number;
  sort_orders?: {
    protein?: string[];
    fat?: string[];
    carbs?: string[];
  };
  source?: "official" | "ai_estimated";
  cache_status?: "hit" | "miss";
}

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

function ratioFor(item: MenuItem, macro: "protein" | "fat" | "carbs") {
  const calories = Number(item.calories);
  if (!Number.isFinite(calories) || calories <= 0) {
    return 0;
  }

  const macroValue = Number(item[macro]);
  if (!Number.isFinite(macroValue)) {
    return 0;
  }

  return macroValue / calories;
}

function fallbackOrder(menuItems: MenuItem[], macro: "protein" | "fat" | "carbs") {
  return [...menuItems]
    .sort((a, b) => ratioFor(b, macro) - ratioFor(a, macro))
    .map((item) => item.dish);
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
  const [restaurantMetadata, setRestaurantMetadata] =
    useState<RestaurantMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMenuItems() {
      if (!restaurantName) {
        // Clear data when no restaurant is selected
        setProteinCalorieRatioOrder([]);
        setFatCalorieRatioOrder([]);
        setCarbsCalorieRatioOrder([]);
        setMenuItems([]);
        setRestaurantMetadata(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Clear previous data immediately when starting to load new restaurant
        setProteinCalorieRatioOrder([]);
        setFatCalorieRatioOrder([]);
        setCarbsCalorieRatioOrder([]);
        setMenuItems([]);
        setRestaurantMetadata(null);

        const menuItemsData = await fetchJsonOrNull<RestaurantNutritionResponse>(
          `/api/restaurants/nutrition?restaurantName=${encodeURIComponent(
            restaurantName
          )}`
        );

        const nextMenuItems = menuItemsData?.menu_items ?? [];
        const hasAiEstimatedItems =
          Boolean(menuItemsData?.uses_ai_estimates) ||
          menuItemsData?.source === "ai_estimated" ||
          nextMenuItems.some(
            (item) =>
              item.nutrition_source === "ai_estimated" ||
              Object.values(item.field_sources ?? {}).includes("ai_estimated")
          );

        setProteinCalorieRatioOrder(
          menuItemsData?.sort_orders?.protein ??
            fallbackOrder(nextMenuItems, "protein")
        );
        setFatCalorieRatioOrder(
          menuItemsData?.sort_orders?.fat ?? fallbackOrder(nextMenuItems, "fat")
        );
        setCarbsCalorieRatioOrder(
          menuItemsData?.sort_orders?.carbs ??
            fallbackOrder(nextMenuItems, "carbs")
        );
        setMenuItems(nextMenuItems);
        setRestaurantMetadata({
          restaurant_name: menuItemsData?.restaurant_name ?? restaurantName,
          url: menuItemsData?.url ?? "",
          date: menuItemsData?.date ?? "",
          uses_ai_estimates: hasAiEstimatedItems,
          estimated_item_count:
            menuItemsData?.estimated_item_count ??
            nextMenuItems.filter(
              (item) =>
                item.nutrition_source === "ai_estimated" ||
                Object.values(item.field_sources ?? {}).includes("ai_estimated")
            ).length,
          source: menuItemsData?.source,
          cache_status: menuItemsData?.cache_status,
        });
      } catch (error) {
        console.error("Error loading menu items:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMenuItems();
  }, [restaurantName]);

  const sortedItems = useMemo(() => {
    if (!menuItems.length) {
      return {
        proteinCalorieRatioSorted: [],
        fatCalorieRatioSorted: [],
        carbsCalorieRatioSorted: [],
        caloriesSorted: [],
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
    menuItems,
    loading,
    hasData: menuItems.length > 0,
    restaurantMetadata,
  };
}
