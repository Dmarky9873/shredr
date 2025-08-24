import Fuse from "fuse.js";

interface FindRestaurantNameProps {
  restaurantNames: string[];
  query: string;
}

export default function findRestaurantName({
  restaurantNames,
  query,
}: FindRestaurantNameProps) {
  const fuseOptions = {
    includeScore: true,
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
  };

  const fuse = new Fuse(restaurantNames, fuseOptions);
  const result = fuse.search(query, { limit: 1 });
  return result.length > 0 ? result[0].item : undefined;
}
