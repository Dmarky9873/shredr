import { forwardRef, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      fullWidth = false,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      font-coustard
      inline-flex
      items-center
      justify-center
      rounded-lg
      border-2
      transition-all
      duration-200
      ease-in-out
      focus:outline-none
      focus:ring-2
      focus:ring-offset-2
      disabled:opacity-50
      disabled:cursor-not-allowed
      shadow-sm
      hover:shadow-md
      focus:shadow-md
      font-medium
      ${fullWidth ? "w-full" : ""}
      ${
        loading
          ? "cursor-wait"
          : disabled
          ? "cursor-not-allowed"
          : "cursor-pointer"
      }
    `;

    const sizeClasses = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-3 text-base",
      lg: "px-6 py-4 text-lg",
    };

    const variantClasses = {
      primary: `
        bg-foreground
        text-background
        border-foreground
        hover:bg-foreground/90
        hover:border-foreground/90
        focus:ring-foreground/20
        disabled:hover:bg-foreground
        disabled:hover:border-foreground
      `,
      secondary: `
        bg-background
        text-foreground
        border-foreground/40
        hover:bg-foreground/5
        hover:border-foreground/60
        focus:ring-foreground/20
        disabled:hover:bg-background
        disabled:hover:border-foreground/40
      `,
      outline: `
        bg-transparent
        text-foreground
        border-foreground/20
        hover:bg-foreground/5
        hover:border-foreground/40
        focus:ring-foreground/20
        disabled:hover:bg-transparent
        disabled:hover:border-foreground/20
      `,
      ghost: `
        bg-transparent
        text-foreground
        border-transparent
        hover:bg-foreground/5
        hover:border-foreground/10
        focus:ring-foreground/20
        disabled:hover:bg-transparent
        disabled:hover:border-transparent
      `,
      danger: `
        bg-red-600
        text-white
        border-red-600
        hover:bg-red-700
        hover:border-red-700
        focus:ring-red-100
        disabled:hover:bg-red-600
        disabled:hover:border-red-600
      `,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseClasses}
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className={`animate-spin ${
              size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"
            } mr-2`}
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
