import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-semibold text-moss-900 dark:text-slate-100 ${className}`} {...props} />;
}

interface FieldProps {
  children: ReactNode;
  label: string;
  hint?: string;
}

export function Field({ children, hint, label }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-moss-700/75 dark:text-slate-300/75">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-md border border-moon-200 bg-white px-3 text-sm text-moss-900 outline-none transition placeholder:text-moss-700/45 focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/15 dark:bg-white/8 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-moon-300 dark:focus:ring-moon-300/20 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 w-full rounded-md border border-moon-200 bg-white px-3 py-3 text-sm text-moss-900 outline-none transition placeholder:text-moss-700/45 focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/15 dark:bg-white/8 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-moon-300 dark:focus:ring-moon-300/20 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-11 w-full rounded-md border border-moon-200 bg-white px-3 text-sm text-moss-900 outline-none transition focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/15 dark:bg-white/8 dark:text-slate-100 dark:focus:border-moon-300 dark:focus:ring-moon-300/20 ${className}`}
      {...props}
    />
  );
}
