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

function normalizeText(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Normalize different types of apostrophes to standard apostrophe
      .replace(/['']/g, "'")
      // Remove diacritics and special characters for better matching
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

export function searchRestaurants(
  restaurants: Restaurant[],
  query: string,
  limit: number = 5
): Restaurant[] {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = normalizeText(query);

  // Score restaurants based on relevance
  const scored = restaurants
    .map((restaurant) => {
      let score = 0;
      const name = normalizeText(restaurant.name);
      const category = normalizeText(restaurant.category);
      const address = normalizeText(restaurant.address);

      // Exact name match gets highest score
      if (name === searchTerm) {
        score += 100;
      }
      // Name starts with search term
      else if (name.startsWith(searchTerm)) {
        score += 80;
      }
      // Name contains search term
      else if (name.includes(searchTerm)) {
        score += 60;
      }

      // Category matches
      if (category.includes(searchTerm)) {
        score += 30;
      }

      // Address matches (for location-based searches)
      if (address.includes(searchTerm)) {
        score += 20;
      }

      // Partial word matches in name
      const nameWords = name.split(" ");
      const searchWords = searchTerm.split(" ");

      for (const searchWord of searchWords) {
        for (const nameWord of nameWords) {
          if (nameWord.startsWith(searchWord) && searchWord.length > 2) {
            score += 10;
          }
        }
      }

      return { restaurant, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.restaurant);

  return scored;
}

export function formatRestaurantForDisplay(restaurant: Restaurant) {
  return {
    id: `${restaurant.name}-${restaurant.address}`,
    title: restaurant.name,
    subtitle: restaurant.address,
  };
}
