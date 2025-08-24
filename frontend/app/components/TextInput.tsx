import { forwardRef } from "react";
import SearchPreview, { SearchPreviewItem } from "./SearchPreview";

interface TextInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password" | "search";
  label?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
  searchResults?: SearchPreviewItem[];
  showSearchPreview?: boolean;
  maxSearchResults?: number;
  selectedSearchIndex?: number;
  onSearchNavigation?: (direction: "up" | "down" | "select") => void;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      placeholder = "Enter text...",
      value,
      onChange,
      onSubmit,
      onFocus,
      onBlur,
      className = "",
      disabled = false,
      type = "text",
      label,
      error,
      size = "md",
      searchResults = [],
      showSearchPreview = false,
      maxSearchResults = 5,
      selectedSearchIndex = -1,
      onSearchNavigation,
    },
    ref
  ) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (showSearchPreview && onSearchNavigation) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onSearchNavigation("down");
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onSearchNavigation("up");
          return;
        }
        if (e.key === "Enter") {
          if (selectedSearchIndex >= 0) {
            e.preventDefault();
            onSearchNavigation("select");
            return;
          }
        }
      }

      if (e.key === "Enter" && onSubmit) {
        onSubmit();
      }
    };

    const sizeClasses = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-3 text-base",
      lg: "px-6 py-4 text-lg",
    };

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-medium mb-2 text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full font-coustard
              ${sizeClasses[size]}
              border-2 border-foreground/20
              rounded-lg
              bg-background
              text-foreground
              placeholder:text-foreground/50
              transition-all duration-200 ease-in-out
              focus:outline-none
              focus:border-foreground/60
              focus:ring-2
              focus:ring-foreground/10
              hover:border-foreground/40
              disabled:opacity-50
              disabled:cursor-not-allowed
              disabled:hover:border-foreground/20
              shadow-sm
              hover:shadow-md
              focus:shadow-md
              ${
                error
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : ""
              }
            `}
          />
          <SearchPreview
            items={searchResults}
            isVisible={showSearchPreview}
            maxItems={maxSearchResults}
            selectedIndex={selectedSearchIndex}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 font-coustard">{error}</p>
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
