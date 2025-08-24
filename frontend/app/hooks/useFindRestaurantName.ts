import { useEffect, useMemo, useState } from "react";
import findRestaurantName from "../utils/findRestaurantName";

export default function useFindRestaurantName() {
  const [restaurantNames, setRestaurantNames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    async function loadRestaurantNames() {
      try {
        setLoading(true);
        const response = await fetch(
          "/restaurant_caches/list_of_cached_restaurants.json"
        );
        if (!response.ok) {
          throw new Error("Failed to load restaurant names");
        }
        const data = await response.json();
        setRestaurantNames(data);
        setIsError(false);
      } catch (err) {
        setIsError(true);
      } finally {
        setLoading(false);
      }
    }

    loadRestaurantNames();
  }, []);
  const searchRestaurantName = useMemo(() => {
    return (query: string): string | undefined => {
      const result = findRestaurantName({ restaurantNames, query });
      return result;
    };
  }, [restaurantNames]);

  return { restaurantNames, loading, isError, searchRestaurantName };
}
