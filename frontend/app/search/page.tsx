"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getQueryFromSearchParams } from "../utils/url";
import Button from "../components/Button";
import RestaurantInput from "../components/RestaurantInput";

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    const queryParam = getQueryFromSearchParams(searchParams);
    if (queryParam) {
      setQuery(queryParam);
    }
  }, [searchParams]);
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
        <div className="mb-8">
          <p className="text-lg text-foreground/70 font-coustard text-center">
            Despite our best efforts, webscraping isn&apos;t perfect, and
            results should always be verified with the original source.
          </p>
        </div>
        <div className="bg-background border-2 border-foreground/20 rounded-lg p-8 text-center">
          <p className="text-foreground/70 font-coustard">
            {query
              ? `Search results for "${query}" will be displayed here`
              : "Please provide a search query to see results"}
          </p>
        </div>
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
