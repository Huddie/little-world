import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClassName: Record<ButtonVariant, string> = {
  primary: "bg-moss-700 text-white shadow-sm shadow-moss-900/15 hover:bg-moss-800 dark:bg-moss-500 dark:text-slate-950 dark:hover:bg-moss-300",
  secondary: "border border-moon-200 bg-white/90 text-moss-900 hover:border-moon-300 hover:bg-white dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12",
  ghost: "text-moss-900 hover:bg-moon-50 dark:text-slate-100 dark:hover:bg-white/8",
  danger: "bg-petal-500 text-white hover:bg-petal-500/90 dark:bg-petal-300 dark:text-slate-950",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = "", variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClassName[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
