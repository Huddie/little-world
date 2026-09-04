import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-moon-200 bg-white shadow-sm shadow-moon-900/10 ring-1 ring-white dark:border-white/10 dark:bg-slate-950/82 dark:shadow-black/30 dark:ring-white/5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
