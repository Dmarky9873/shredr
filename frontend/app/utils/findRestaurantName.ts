import Fuse from "fuse.js";
import {
  compactRestaurantSearchText,
  normalizeRestaurantSearchText,
  restaurantSearchText,
} from "./restaurantSearch";

interface FindRestaurantNameProps {
  restaurantNames: string[];
  query: string;
}

export default function findRestaurantName({
  restaurantNames,
  query,
}: FindRestaurantNameProps) {
  const normalizedQuery = normalizeRestaurantSearchText(query);
  const compactQuery = compactRestaurantSearchText(query);

  if (!normalizedQuery) {
    return undefined;
  }

  const exactMatch = restaurantNames.find((restaurantName) => {
    return (
      normalizeRestaurantSearchText(restaurantName) === normalizedQuery ||
      compactRestaurantSearchText(restaurantName) === compactQuery
    );
  });

  if (exactMatch) {
    return exactMatch;
  }

  const fuseOptions = {
    includeScore: true,
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    keys: ["searchName"],
  };

  const searchableNames = restaurantNames.map((restaurantName) => ({
    restaurantName,
    searchName: restaurantSearchText(restaurantName),
  }));

  const fuse = new Fuse(searchableNames, fuseOptions);
  const result = fuse.search(restaurantSearchText(query), { limit: 1 });
  return result.length > 0 ? result[0].item.restaurantName : undefined;
}
