"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getQueryFromSearchParams } from "../utils/url";
import Button from "../components/Button";
import RestaurantInput from "../components/RestaurantInput";
import MacronutrientTable from "../components/MacronutrientTable";
import useFindRestaurantName from "../hooks/useFindRestaurantName";

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>("");
  const [internalRestaurantName, setInternalRestaurantName] = useState("");

  const { searchRestaurantName } = useFindRestaurantName();

  useEffect(() => {
    const queryParam = getQueryFromSearchParams(searchParams);
    if (queryParam) {
      setQuery(queryParam);
      const foundRestaurant = searchRestaurantName(queryParam);
      setInternalRestaurantName(foundRestaurant || "");
    }
  }, [searchParams, searchRestaurantName]);
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

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground font-coustard mb-8 text-center">
          {query}
        </h1>
        <RestaurantInput title="Search for another restaurant?" />
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
