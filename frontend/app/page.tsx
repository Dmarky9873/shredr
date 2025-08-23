"use client";

import { useEffect, useState } from "react";
import TitleAndTagline from "./components/TitleAndTagline";
import HomePageRestaurantInput from "./components/HomePageRestaurantInput";

export default function Home() {
  const [shouldRenderTitleTagline, setShouldRenderTitleTagline] =
    useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const element = document.getElementById("title-and-tagline");
      element?.classList.add("fade-out");
    }, 2000);
    const timeout2 = setTimeout(() => {
      setShouldRenderTitleTagline(false);
      const element = document.getElementById("restaurant-input");
      element?.classList.remove("zero-opacity");
      element?.classList.add("fade-in");
    }, 3000);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {shouldRenderTitleTagline && (
        <div
          id="title-and-tagline"
          className="fade-in absolute inset-0 flex items-center justify-center"
        >
          <TitleAndTagline />
        </div>
      )}
      <div
        id="restaurant-input"
        className="zero-opacity absolute inset-0 flex items-center justify-center"
      >
        <HomePageRestaurantInput />
      </div>
    </div>
  );
}
