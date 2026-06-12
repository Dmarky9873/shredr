"use client";

import { usePathname, useRouter } from "next/navigation";

export default function AboutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const showHomeLink = pathname !== "/";

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  return (
    <>
      {showHomeLink && (
        <button
          type="button"
          onClick={() => handleNavClick("/")}
          className="fixed top-6 left-6 z-50 hidden text-lg opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100 sm:inline-flex"
        >
          Home
        </button>
      )}

      <nav className="fixed top-4 left-3 right-3 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs leading-none sm:top-6 sm:left-auto sm:right-6 sm:flex-nowrap sm:justify-end sm:gap-5 sm:text-lg">
        {showHomeLink && (
          <button
            type="button"
            onClick={() => handleNavClick("/")}
            className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100 sm:hidden"
          >
            Home
          </button>
        )}
        <a
          href="https://www.instagram.com/shredr.ca/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100"
        >
          Instagram
        </a>
        <button
          type="button"
          onClick={() => handleNavClick("/donate")}
          className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100"
        >
          Donate
        </button>
        <button
          type="button"
          onClick={() => handleNavClick("/account")}
          className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100"
        >
          Account
        </button>
        <button
          type="button"
          onClick={() => handleNavClick("/about")}
          className="opacity-50 transition-opacity duration-200 hover:cursor-pointer hover:opacity-100"
        >
          About
        </button>
      </nav>
    </>
  );
}
