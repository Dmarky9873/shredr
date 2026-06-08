"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import RestaurantInput from "../components/RestaurantInput";
import MacronutrientTable, { type MenuItem } from "../components/MacronutrientTable";
import MenuChat from "../components/MenuChat";
import MenuItemSearch from "../components/MenuItemSearch";
import useFindRestaurantName from "../hooks/useFindRestaurantName";
import useFindSortedMenuItems from "../hooks/useFindSortedMenuItems";

interface EstimatedMenuResponse {
  restaurant_name: string;
  url: string;
  date: string;
  menu_items: MenuItem[];
  uses_ai_estimates: true;
  estimated_item_count: number;
  source?: "ai_estimated";
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

function sortByMacroRatio(menuItems: MenuItem[], macro: "protein" | "fat" | "carbs") {
  return [...menuItems].sort((a, b) => ratioFor(b, macro) - ratioFor(a, macro));
}

function caloriesFor(item: MenuItem) {
  const calories = Number(item.calories);
  return Number.isFinite(calories) ? calories : 0;
}

function sortByCalories(menuItems: MenuItem[]) {
  return [...menuItems].sort((a, b) => caloriesFor(b) - caloriesFor(a));
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>("");
  const [internalRestaurantName, setInternalRestaurantName] = useState("");
  const [estimatedMenu, setEstimatedMenu] =
    useState<EstimatedMenuResponse | null>(null);
  const [estimatedMenuLoading, setEstimatedMenuLoading] = useState(false);
  const [estimatedMenuError, setEstimatedMenuError] = useState("");
  const [selectedMobileTable, setSelectedMobileTable] = useState<
    "protein" | "fat" | "carbs" | "calories"
  >("protein");

  const { searchRestaurantName, loading: restaurantNamesLoading } =
    useFindRestaurantName();
  const { sortedItems, menuItems, loading, hasData, restaurantMetadata } =
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
  }, [currentQuery, searchRestaurantName, restaurantNamesLoading, query]);

  useEffect(() => {
    if (!query || restaurantNamesLoading || internalRestaurantName) {
      setEstimatedMenu(null);
      setEstimatedMenuError("");
      setEstimatedMenuLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function loadEstimatedMenu() {
      try {
        setEstimatedMenu(null);
        setEstimatedMenuError("");
        setEstimatedMenuLoading(true);

        const response = await fetch("/api/estimated-menu", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ restaurantName: query }),
          signal: abortController.signal,
        });

        const data = (await response.json()) as
          | EstimatedMenuResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "AI menu estimates are unavailable."
          );
        }

        setEstimatedMenu(data as EstimatedMenuResponse);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setEstimatedMenuError(
          error instanceof Error
            ? error.message
            : "AI menu estimates are unavailable."
        );
      } finally {
        if (!abortController.signal.aborted) {
          setEstimatedMenuLoading(false);
        }
      }
    }

    loadEstimatedMenu();

    return () => {
      abortController.abort();
    };
  }, [query, restaurantNamesLoading, internalRestaurantName]);

  const estimatedSortedItems = useMemo(() => {
    const generatedMenuItems = estimatedMenu?.menu_items ?? [];

    return {
      proteinCalorieRatioSorted: sortByMacroRatio(generatedMenuItems, "protein"),
      fatCalorieRatioSorted: sortByMacroRatio(generatedMenuItems, "fat"),
      carbsCalorieRatioSorted: sortByMacroRatio(generatedMenuItems, "carbs"),
      caloriesSorted: sortByCalories(generatedMenuItems),
    };
  }, [estimatedMenu]);

  const showingEstimatedFallback = !hasData && Boolean(estimatedMenu);
  const activeMenuItems = showingEstimatedFallback
    ? estimatedMenu?.menu_items ?? []
    : menuItems;
  const activeSortedItems = showingEstimatedFallback
    ? estimatedSortedItems
    : sortedItems;
  const activeRestaurantMetadata = showingEstimatedFallback
    ? estimatedMenu
    : restaurantMetadata;
  const activeHasData = hasData || activeMenuItems.length > 0;
  const showingAiEstimatedMenu =
    showingEstimatedFallback || activeRestaurantMetadata?.source === "ai_estimated";

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

  if (restaurantNamesLoading || loading || estimatedMenuLoading) {
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
        {activeRestaurantMetadata?.url && (
          <div className="mb-6 text-center">
            <a
              href={activeRestaurantMetadata.url}
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
              {new Date(activeRestaurantMetadata.date).toLocaleDateString()}
            </p>
          </div>
        )}
        {showingAiEstimatedMenu ? (
          <div className="mx-auto mb-6 max-w-3xl rounded border border-amber-500/40 bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            We couldn&apos;t find official cached nutrition data for
            &quot;{query}&quot;, so these menu items and nutrition numbers were
            generated by AI. Treat them as rough estimates, not official
            restaurant data.
          </div>
        ) : activeRestaurantMetadata?.uses_ai_estimates ? (
          <div className="mx-auto mb-6 max-w-3xl rounded border border-amber-500/40 bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            Some nutrition values are AI estimates because the PDF did not
            provide parseable values. Treat those rows as approximate.
          </div>
        ) : null}
        <RestaurantInput title="Search another restaurant?" />

        {activeHasData ? (
          <div className="mt-8">
            <MenuItemSearch menuItems={activeMenuItems} />
            <MenuChat
              restaurantName={
                activeRestaurantMetadata?.restaurant_name ||
                internalRestaurantName ||
                query
              }
              menuItems={activeMenuItems}
              usesAiEstimates={activeRestaurantMetadata?.uses_ai_estimates}
            />

            {/* Mobile Table Selector */}
            <div className="lg:hidden mb-6">
              <div className="flex rounded-lg border border-foreground/20 overflow-hidden">
                <button
                  onClick={() => setSelectedMobileTable("protein")}
                  className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
                    selectedMobileTable === "protein"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Protein
                </button>
                <button
                  onClick={() => setSelectedMobileTable("fat")}
                  className={`flex-1 py-3 px-2 text-sm font-medium transition-colors border-l border-foreground/20 ${
                    selectedMobileTable === "fat"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Fat
                </button>
                <button
                  onClick={() => setSelectedMobileTable("carbs")}
                  className={`flex-1 py-3 px-2 text-sm font-medium transition-colors border-l border-foreground/20 ${
                    selectedMobileTable === "carbs"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Carbs
                </button>
                <button
                  onClick={() => setSelectedMobileTable("calories")}
                  className={`flex-1 py-3 px-2 text-sm font-medium transition-colors border-l border-foreground/20 ${
                    selectedMobileTable === "calories"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-foreground/10"
                  }`}
                >
                  Calories
                </button>
              </div>
            </div>

            {/* Mobile Single Table View */}
            <div className="lg:hidden">
              {selectedMobileTable === "protein" && (
                <MacronutrientTable
                  data={activeSortedItems.proteinCalorieRatioSorted}
                  macronutrient="protein"
                  title="Protein-Calorie Ratio"
                />
              )}
              {selectedMobileTable === "fat" && (
                <MacronutrientTable
                  data={activeSortedItems.fatCalorieRatioSorted}
                  macronutrient="fat"
                  title="Fat-Calorie Ratio"
                />
              )}
              {selectedMobileTable === "carbs" && (
                <MacronutrientTable
                  data={activeSortedItems.carbsCalorieRatioSorted}
                  macronutrient="carbs"
                  title="Carbs-Calorie Ratio"
                />
              )}
              {selectedMobileTable === "calories" && (
                <MacronutrientTable
                  data={activeSortedItems.caloriesSorted}
                  macronutrient="calories"
                  title="Calories"
                />
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6">
              <MacronutrientTable
                data={activeSortedItems.proteinCalorieRatioSorted}
                macronutrient="protein"
                title="Protein-Calorie Ratio"
              />
              <MacronutrientTable
                data={activeSortedItems.fatCalorieRatioSorted}
                macronutrient="fat"
                title="Fat-Calorie Ratio"
              />
              <MacronutrientTable
                data={activeSortedItems.carbsCalorieRatioSorted}
                macronutrient="carbs"
                title="Carbs-Calorie Ratio"
              />
              <MacronutrientTable
                data={activeSortedItems.caloriesSorted}
                macronutrient="calories"
                title="Calories"
              />
            </div>
          </div>
        ) : (
          <div className="mt-8 p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Restaurant Not Found
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300">
              We couldn&apos;t find cached nutrition data for &quot;{query}&quot;
              and couldn&apos;t generate AI estimates
              {estimatedMenuError ? `: ${estimatedMenuError}` : "."}
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
