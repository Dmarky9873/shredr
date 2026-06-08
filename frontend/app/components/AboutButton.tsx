"use client";

import { useRouter } from "next/navigation";

export default function AboutButton() {
  const router = useRouter();

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed top-6 right-6 z-50 flex items-center gap-5 text-lg">
      <button
        type="button"
        onClick={() => handleNavClick("/donate")}
        className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100"
      >
        Donate
      </button>
      <button
        type="button"
        onClick={() => handleNavClick("/about")}
        className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100"
      >
        About
      </button>
    </nav>
  );
}
