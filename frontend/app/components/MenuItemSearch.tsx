"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { MenuItem } from "./MacronutrientTable";

interface MenuItemSearchProps {
  menuItems: MenuItem[];
}

function formatValue(value: string | number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value;
  }
  return Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(1);
}

function isAiEstimated(item: MenuItem) {
  return (
    item.nutrition_source === "ai_estimated" ||
    Object.values(item.field_sources ?? {}).includes("ai_estimated")
  );
}

export default function MenuItemSearch({ menuItems }: MenuItemSearchProps) {
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(menuItems, {
        keys: ["dish"],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [menuItems]
  );

  const results = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }
    return fuse.search(trimmedQuery, { limit: 12 }).map((result) => result.item);
  }, [fuse, query]);

  return (
    <section className="mb-6 border-y border-foreground/15 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold font-coustard">Find a Menu Item</h2>
        <label className="w-full md:max-w-sm">
          <span className="sr-only">Search menu items</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dishes, sides, drinks..."
            className="w-full rounded border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-coustard text-foreground shadow-sm transition-colors placeholder:text-foreground/50 hover:border-foreground/40 focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </label>
      </div>

      {query.trim() && (
        <div className="mt-4 overflow-x-auto">
          {results.length > 0 ? (
            <table className="w-full border border-foreground/20">
              <thead>
                <tr>
                  <th className="border-b border-foreground/20 px-3 py-3 text-left text-sm font-medium">
                    Name
                  </th>
                  <th className="border-b border-foreground/20 px-3 py-3 text-left text-sm font-medium">
                    Calories
                  </th>
                  <th className="border-b border-foreground/20 px-3 py-3 text-left text-sm font-medium">
                    Protein
                  </th>
                  <th className="border-b border-foreground/20 px-3 py-3 text-left text-sm font-medium">
                    Carbs
                  </th>
                  <th className="border-b border-foreground/20 px-3 py-3 text-left text-sm font-medium">
                    Fat
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.dish}>
                    <td className="border-b border-foreground/20 px-3 py-2 text-sm">
                      <div className="flex flex-col gap-1">
                        <span>{item.dish}</span>
                        {isAiEstimated(item) && (
                          <span className="w-fit rounded border border-amber-500/40 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-normal text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            AI estimate
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-foreground/20 px-3 py-2 text-sm whitespace-nowrap">
                      {formatValue(item.calories)}
                    </td>
                    <td className="border-b border-foreground/20 px-3 py-2 text-sm whitespace-nowrap">
                      {formatValue(item.protein)}
                    </td>
                    <td className="border-b border-foreground/20 px-3 py-2 text-sm whitespace-nowrap">
                      {formatValue(item.carbs)}
                    </td>
                    <td className="border-b border-foreground/20 px-3 py-2 text-sm whitespace-nowrap">
                      {formatValue(item.fat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="border border-foreground/20 px-4 py-5 text-center text-sm text-foreground/60">
              No menu items found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
