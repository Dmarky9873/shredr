"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getQueryFromSearchParams } from "../utils/url";
import Button from "../components/Button";
import RestaurantInput from "../components/RestaurantInput";
import MacronutrientTable, { MenuItem } from "../components/MacronutrientTable";
import useFindRestaurantName from "../hooks/useFindRestaurantName";
import useFindSortedMenuItems from "../hooks/useFindSortedMenuItems";

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>("");
  const [internalRestaurantName, setInternalRestaurantName] = useState("");

  const { searchRestaurantName } = useFindRestaurantName();
  const { sortedItems, loading, hasData } = useFindSortedMenuItems({
    restaurantName: internalRestaurantName,
  });

  useEffect(() => {
    const queryParam = getQueryFromSearchParams(searchParams);
    if (queryParam) {
      setQuery(queryParam);
      const foundRestaurant = searchRestaurantName(queryParam);
      setInternalRestaurantName(foundRestaurant || "");
    }
  }, [searchParams, searchRestaurantName]);
  if (!query) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground font-coustard mb-8 text-center">
            Search
          </h1>
          <RestaurantInput />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground font-coustard mb-8 text-center">
            Loading {query}...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground font-coustard mb-8 text-center">
          {query}
        </h1>
        <RestaurantInput title="Search another restaurant?" />

        {hasData ? (
          <div className="mt-8 space-y-8">
            <MacronutrientTable
              data={sortedItems.proteinCalorieRatioSorted}
              macronutrient="protein"
              title="Protein-Calorie Ratio (Highest to Lowest)"
            />
            <MacronutrientTable
              data={sortedItems.fatCalorieRatioSorted}
              macronutrient="fat"
              title="Fat-Calorie Ratio (Highest to Lowest)"
            />
            <MacronutrientTable
              data={sortedItems.carbsCalorieRatioSorted}
              macronutrient="carbs"
              title="Carbs-Calorie Ratio (Highest to Lowest)"
            />
          </div>
        ) : (
          <div className="mt-8 p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Restaurant Not Found
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300">
              We couldn't find nutrition data for "{query}". Please try
              searching for a different restaurant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground font-coustard mb-8 text-center">
              Loading...
            </h1>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
