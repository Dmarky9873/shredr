"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import RestaurantInput from "../components/RestaurantInput";
import { createSearchUrl } from "../utils/url";

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

type AuthMode = "sign-in" | "sign-up";

export default function AccountPage() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          throw new Error(data.error || "Account is unavailable.");
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
              : "Account is unavailable."
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        mode === "sign-in" ? "/api/account/sign-in" : "/api/account/sign-up",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = (await response.json()) as AccountResponse;

      if (!response.ok) {
        throw new Error(data.error || "Could not sign in.");
      }

      setUser(data.user);
      setFavorites(data.favorites ?? []);
      setEmail("");
      setPassword("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch("/api/account/sign-out", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Could not sign out.");
      }

      setUser(null);
      setFavorites([]);
    } catch (signOutError) {
      setError(
        signOutError instanceof Error ? signOutError.message : "Could not sign out."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeFavorite(restaurantName: string) {
    try {
      setError("");
      const response = await fetch("/api/account/favorites", {
        method: "DELETE",
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
        throw new Error(data.error || "Could not remove favorite.");
      }

      setFavorites(data.favorites ?? []);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove favorite."
      );
    }
  }

  return (
    <main className="min-h-screen px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-foreground">
          Account
        </h1>

        {isLoading ? (
          <p className="text-center text-foreground/70">Loading account...</p>
        ) : user ? (
          <section className="mx-auto max-w-2xl">
            <div className="mb-8 flex flex-col gap-4 border-b-2 border-foreground/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-sm text-foreground/60">Signed in as</p>
                <p className="mb-0 break-all text-lg text-foreground">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-foreground/30 px-4 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-wait disabled:opacity-60"
              >
                Sign out
              </button>
            </div>

            <h2 className="mb-4 text-2xl">Favorite restaurants</h2>
            {favorites.length > 0 ? (
              <div className="divide-y-2 divide-foreground/10 border-y-2 border-foreground/10">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.normalizedName}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={createSearchUrl(favorite.restaurantName)}
                      className="text-lg text-foreground underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-70"
                    >
                      {favorite.restaurantName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFavorite(favorite.restaurantName)}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border-2 border-foreground/20 px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-y-2 border-foreground/10 py-8 text-center">
                <p className="text-foreground/70">
                  No favorite restaurants saved yet.
                </p>
                <RestaurantInput title="Find a restaurant to save" />
              </div>
            )}
          </section>
        ) : (
          <section className="mx-auto max-w-md">
            <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-lg border-2 border-foreground/20">
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={`min-h-11 px-4 py-2 text-sm transition-colors ${
                  mode === "sign-in"
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-foreground/5"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className={`min-h-11 border-l-2 border-foreground/20 px-4 py-2 text-sm transition-colors ${
                  mode === "sign-up"
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-foreground/5"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-foreground/80">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border-2 border-foreground/30 bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-foreground"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-foreground/80">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  className="w-full rounded-lg border-2 border-foreground/30 bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-foreground"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-foreground bg-foreground px-4 py-3 text-background transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting
                  ? "Working..."
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>
          </section>
        )}

        {error && (
          <p className="mx-auto mt-6 max-w-md rounded-lg border-2 border-red-400 bg-red-100 px-4 py-3 text-center text-sm text-red-800 dark:bg-red-900/30 dark:text-red-100">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
