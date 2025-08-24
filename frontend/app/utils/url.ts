/**
 * Utility functions for URL manipulation and query parameter handling
 */

/**
 * Creates a search URL with the given query parameter
 * @param query - The search query to encode in the URL
 * @returns The formatted search URL
 */
export function createSearchUrl(query: string): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return "/search";
  }
  return `/search?query=${encodeURIComponent(trimmedQuery)}`;
}

/**
 * Extracts the query parameter from URL search params
 * @param searchParams - URLSearchParams object
 * @returns The decoded query string or null if not found
 */
export function getQueryFromSearchParams(
  searchParams: URLSearchParams
): string | null {
  return searchParams.get("query");
}

/**
 * Creates URL search params with multiple parameters
 * @param params - Object containing key-value pairs for query parameters
 * @returns URLSearchParams object
 */
export function createSearchParams(
  params: Record<string, string>
): URLSearchParams {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim()) {
      searchParams.set(key, value.trim());
    }
  });
  return searchParams;
}
