import Fuse from "fuse.js";

export interface Restaurant {
  category: string;
  address: string;
  name: string;
  phone: string;
  priceRange: string;
  website: string;
  yelpUrl: string;
  latitude: number;
  longitude: number;
}

export function parseRestaurantCSV(csvData: string): Restaurant[] {
  const rows = parseCSV(csvData);
  const headers = rows[0];

  return rows.slice(1).map((row) => {
    return {
      category: row[0] || "",
      address: row[1] || "",
      name: row[2] || "",
      phone: row[3] || "",
      priceRange: row[4] || "",
      website: row[5] || "",
      yelpUrl: row[6] || "",
      latitude: parseFloat(row[7]) || 0,
      longitude: parseFloat(row[8]) || 0,
    };
  });
}

function parseCSV(csvData: string): string[][] {
  const result: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csvData.length; i++) {
    const char = csvData[i];
    const nextChar = csvData[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim() || row.length > 0) {
        row.push(current.trim());
        result.push(row);
        row = [];
        current = "";
      }
      // Skip \r\n combinations
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
    } else {
      current += char;
    }
  }

  // Handle last row
  if (current.trim() || row.length > 0) {
    row.push(current.trim());
    result.push(row);
  }

  return result.filter((row) => row.length > 0);
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());

  // Clean up quoted values
  return result.map((value) => {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    return value;
  });
}

export function searchRestaurants(
  restaurants: Restaurant[],
  query: string,
  limit: number = 5
): Restaurant[] {
  if (!query.trim()) {
    return [];
  }

  // Configure Fuse.js for fuzzy searching
  const fuseOptions = {
    // Include score in results
    includeScore: true,
    // Threshold for fuzzy matching (0.0 = exact match, 1.0 = match anything)
    threshold: 0.4,
    // How much a single character edit affects the overall score
    distance: 100,
    // Minimum number of characters that must be matched
    minMatchCharLength: 2,
    // Keys to search in
    keys: [
      {
        name: "name",
        weight: 0.8, // Restaurant name is most important
      },
      {
        name: "category",
        weight: 0.1,
      },
      {
        name: "address",
        weight: 0.1,
      },
    ],
  };

  const fuse = new Fuse(restaurants, fuseOptions);
  const results = fuse.search(query, { limit: limit * 2 });

  const seen = new Set<string>();
  const uniqueResults: Restaurant[] = [];

  for (const result of results) {
    const key = `${result.item.name}-${result.item.address}-${result.item.phone}`;
    if (!seen.has(key) && uniqueResults.length < limit) {
      seen.add(key);
      uniqueResults.push(result.item);
    }
  }

  return uniqueResults;
}

export function formatRestaurantForDisplay(restaurant: Restaurant) {
  const uniqueId = `${restaurant.name}-${restaurant.address}-${restaurant.phone}-${restaurant.latitude}-${restaurant.longitude}`;

  return {
    id: uniqueId,
    title: restaurant.name,
    subtitle: restaurant.address,
  };
}
