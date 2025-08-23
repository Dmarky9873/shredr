import { forwardRef } from "react";

interface TextInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password" | "search";
  label?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      placeholder = "Enter text...",
      value,
      onChange,
      onSubmit,
      className = "",
      disabled = false,
      type = "text",
      label,
      error,
      size = "md",
    },
    ref
  ) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
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
            onKeyPress={handleKeyPress}
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
          {type === "search" && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-5 h-5 text-foreground/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}
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
