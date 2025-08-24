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
  const [selectedMobileTable, setSelectedMobileTable] = useState<
    "protein" | "fat" | "carbs"
  >("protein");

  const { searchRestaurantName, loading: restaurantNamesLoading } =
    useFindRestaurantName();
  const { sortedItems, loading, hasData, restaurantMetadata } =
    useFindSortedMenuItems({
      restaurantName: internalRestaurantName,
    });

  const currentQuery = searchParams.get("query");

  useEffect(() => {
    if (currentQuery && !restaurantNamesLoading) {
      if (currentQuery !== query) {
        setQuery(currentQuery);
      }
      const foundRestaurant = searchRestaurantName(currentQuery);
      setInternalRestaurantName(foundRestaurant || "");
    } else if (!currentQuery) {
      setQuery("");
      setInternalRestaurantName("");
    }
  }, [currentQuery, searchRestaurantName, restaurantNamesLoading]);
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground font-coustard mb-8 text-center">
          {query}
        </h1>

        {/* PDF Source Link */}
        {restaurantMetadata?.url && (
          <div className="mb-6 text-center">
            <a
              href={restaurantMetadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 underline decoration-dotted underline-offset-4"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              View Original Nutrition PDF
            </a>
            <p className="text-xs text-foreground/50 mt-1">
              Data extracted on{" "}
              {new Date(restaurantMetadata.date).toLocaleDateString()}
            </p>
          </div>
        )}
        <RestaurantInput title="Search another restaurant?" />

        {hasData ? (
          <div className="mt-8">
            {/* Mobile Table Selector */}
            <div className="lg:hidden mb-6">
              <div className="flex rounded-lg border border-foreground/20 overflow-hidden">
                <button
                  onClick={() => setSelectedMobileTable("protein")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    selectedMobileTable === "protein"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Protein
                </button>
                <button
                  onClick={() => setSelectedMobileTable("fat")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-l border-r border-foreground/20 ${
                    selectedMobileTable === "fat"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Fat
                </button>
                <button
                  onClick={() => setSelectedMobileTable("carbs")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    selectedMobileTable === "carbs"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Carbs
                </button>
              </div>
            </div>

            {/* Mobile Single Table View */}
            <div className="lg:hidden">
              {selectedMobileTable === "protein" && (
                <MacronutrientTable
                  data={sortedItems.proteinCalorieRatioSorted}
                  macronutrient="protein"
                  title="Protein-Calorie Ratio"
                />
              )}
              {selectedMobileTable === "fat" && (
                <MacronutrientTable
                  data={sortedItems.fatCalorieRatioSorted}
                  macronutrient="fat"
                  title="Fat-Calorie Ratio"
                />
              )}
              {selectedMobileTable === "carbs" && (
                <MacronutrientTable
                  data={sortedItems.carbsCalorieRatioSorted}
                  macronutrient="carbs"
                  title="Carbs-Calorie Ratio"
                />
              )}
            </div>

            {/* Desktop Three Column View */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-6">
              <MacronutrientTable
                data={sortedItems.proteinCalorieRatioSorted}
                macronutrient="protein"
                title="Protein-Calorie Ratio"
              />
              <MacronutrientTable
                data={sortedItems.fatCalorieRatioSorted}
                macronutrient="fat"
                title="Fat-Calorie Ratio"
              />
              <MacronutrientTable
                data={sortedItems.carbsCalorieRatioSorted}
                macronutrient="carbs"
                title="Carbs-Calorie Ratio"
              />
            </div>
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
