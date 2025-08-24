import { useState, useEffect, useRef } from "react";
import TextInput from "./TextInput";
import { useRestaurantSearch } from "../hooks/useRestaurantSearch";
import { useDebounce } from "../hooks/useDebounce";
import { SearchPreviewItem } from "./SearchPreview";

export default function HomePageRestaurantInput() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPreviewItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchForRestaurants, isLoading, error } = useRestaurantSearch();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery.trim().length > 1 && isFocused) {
      setIsSearching(true);
      const results = searchForRestaurants(debouncedSearchQuery, 5);
      setSearchResults(results);
      setShowPreview(results.length > 0);
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setShowPreview(false);
      setIsSearching(false);
    }
  }, [debouncedSearchQuery, searchForRestaurants, isFocused]);

  useEffect(() => {
    if (
      searchQuery.trim().length > 1 &&
      searchQuery !== debouncedSearchQuery &&
      isFocused
    ) {
      setIsSearching(true);
    }
  }, [searchQuery, debouncedSearchQuery, isFocused]);

  const handleRestaurantSelect = (restaurantId: string) => {
    const selectedRestaurant = searchResults.find((r) => r.id === restaurantId);
    if (selectedRestaurant) {
      setSearchQuery(selectedRestaurant.title);
      setShowPreview(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);

    // Clear old results immediately when user starts typing something new
    if (value !== searchQuery) {
      setSearchResults([]);
      setShowPreview(false);
    }

    if (value.trim().length <= 1) {
      setSearchResults([]);
      setShowPreview(false);
      setIsSearching(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchQuery.trim().length > 1) {
      setShowPreview(searchResults.length > 0);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow for click on preview items
    setTimeout(() => {
      setIsFocused(false);
      setShowPreview(false);
    }, 150);
  };

  const enrichedSearchResults = searchResults.map((result) => ({
    ...result,
    onClick: () => handleRestaurantSelect(result.id),
  }));

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <h3 className="text-foreground font-coustard mb-4 text-lg">
        Where are you eating today?
      </h3>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded font-coustard">
          Error loading restaurants: {error}
        </div>
      )}
      <div className="w-full max-w-md relative">
        <TextInput
          ref={inputRef}
          type="search"
          placeholder={
            isLoading
              ? "Loading restaurants..."
              : "Search Toronto restaurants..."
          }
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLoading}
          className="mt-2"
          searchResults={enrichedSearchResults}
          showSearchPreview={showPreview && isFocused && !isSearching}
          maxSearchResults={5}
        />
        {searchQuery.trim().length > 0 &&
          searchResults.length === 0 &&
          !isLoading &&
          !isSearching &&
          showPreview && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border-2 border-foreground/20 rounded-lg shadow-lg p-4">
              <p className="text-foreground/70 font-coustard text-sm text-center">
                No restaurants found matching "{searchQuery}"
              </p>
            </div>
          )}
        {isSearching && isFocused && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border-2 border-foreground/20 rounded-lg shadow-lg p-4">
            <p className="text-foreground/70 font-coustard text-sm text-center">
              Searching...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
