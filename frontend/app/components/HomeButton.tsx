"use client";

import { useRouter } from "next/navigation";

export default function HomeButton() {
  const router = useRouter();

  const handleHomeClick = () => {
    router.push("/");
  };

  return (
    <button
      onClick={handleHomeClick}
      className="fixed top-6 left-6 opacity-50 hover:opacity-100 transition-opacity duration-200 text-lg z-50 hover:cursor-pointer"
    >
      Home
    </button>
  );
}
