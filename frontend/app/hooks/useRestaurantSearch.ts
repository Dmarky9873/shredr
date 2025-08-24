import { useState, useEffect, useMemo } from "react";
import {
  Restaurant,
  parseRestaurantCSV,
  searchRestaurants,
  formatRestaurantForDisplay,
} from "../utils/restaurantSearch";
import { SearchPreviewItem } from "../components/SearchPreview";

export function useRestaurantSearch() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRestaurants() {
      try {
        setIsLoading(true);
        const response = await fetch("/datasets/toronto-restaurants.csv");
        if (!response.ok) {
          throw new Error("Failed to load restaurant data");
        }
        const csvData = await response.text();
        const parsedRestaurants = parseRestaurantCSV(csvData);
        setRestaurants(parsedRestaurants);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    loadRestaurants();
  }, []);

  const searchForRestaurants = useMemo(() => {
    return (query: string, limit: number = 5): SearchPreviewItem[] => {
      const results = searchRestaurants(restaurants, query, limit);
      return results.map(formatRestaurantForDisplay);
    };
  }, [restaurants]);

  return {
    restaurants,
    searchForRestaurants,
    isLoading,
    error,
  };
}
