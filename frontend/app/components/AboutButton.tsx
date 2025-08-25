"use client";

import { useRouter } from "next/navigation";

export default function AboutButton() {
  const router = useRouter();

  const handleAboutClick = () => {
    router.push("/about");
  };

  return (
    <button
      onClick={handleAboutClick}
      className="fixed top-6 right-6 opacity-50 hover:opacity-100 transition-opacity duration-200 text-lg z-50 hover:cursor-pointer"
    >
      About
    </button>
  );
}
