"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface AccountUser {
  id: string;
  email: string;
  createdAt: string;
}

interface FavoriteRestaurant {
  restaurantName: string;
  normalizedName: string;
  createdAt: string;
}

interface AccountResponse {
  user: AccountUser | null;
  favorites: FavoriteRestaurant[];
  error?: string;
}

interface FavoriteRestaurantButtonProps {
  restaurantName: string;
}

function normalizeRestaurantName(restaurantName: string) {
  return restaurantName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2019`]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export default function FavoriteRestaurantButton({
  restaurantName,
}: FavoriteRestaurantButtonProps) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const normalizedRestaurantName = useMemo(
    () => normalizeRestaurantName(restaurantName),
    [restaurantName]
  );
  const isFavorite = favorites.some(
    (favorite) => favorite.normalizedName === normalizedRestaurantName
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/account", {
          cache: "no-store",
        });
        const data = (await response.json()) as AccountResponse;

        if (!response.ok) {
          throw new Error(data.error || "Favorites are unavailable.");
        }

        if (isMounted) {
          setUser(data.user);
          setFavorites(data.favorites);
          setError("");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Favorites are unavailable."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleFavorite() {
    if (!user || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch("/api/account/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ restaurantName }),
      });
      const data = (await response.json()) as {
        favorites?: FavoriteRestaurant[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not update favorite.");
      }

      setFavorites(data.favorites ?? []);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update favorite."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center text-sm text-foreground/60">
        Checking favorites...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <Link
          href="/account"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-foreground/30 px-4 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5"
        >
          Sign in to save this restaurant
        </Link>
        {error && (
          <p className="mt-2 text-xs text-red-700 dark:text-red-200">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={isSaving}
        aria-pressed={isFavorite}
        className={`inline-flex min-h-10 items-center justify-center rounded-lg border-2 px-4 py-2 text-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${
          isFavorite
            ? "border-foreground bg-foreground text-background"
            : "border-foreground/30 text-foreground hover:bg-foreground/5"
        }`}
      >
        {isSaving ? "Saving..." : isFavorite ? "Saved favorite" : "Save favorite"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-700 dark:text-red-200">{error}</p>
      )}
    </div>
  );
}
