import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClassName: Record<ButtonVariant, string> = {
  primary: "bg-moss-700 text-white shadow-sm shadow-moss-900/15 hover:bg-moss-800 dark:bg-moss-300 dark:text-slate-950 dark:hover:bg-moss-200",
  secondary: "border border-moon-200 bg-white text-moss-900 shadow-sm shadow-moon-900/5 hover:border-moon-400 hover:bg-moon-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-moon-300 dark:hover:bg-slate-800",
  ghost: "text-moss-900 hover:bg-moon-50 dark:text-slate-100 dark:hover:bg-white/10",
  danger: "bg-petal-500 text-white hover:bg-petal-500/90 dark:bg-petal-300 dark:text-slate-950 dark:hover:bg-petal-100",
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
