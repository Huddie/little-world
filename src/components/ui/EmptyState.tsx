import type { ReactNode } from "react";

export function EmptyState({ action, message, title }: { action?: ReactNode; message: string; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-moon-200 bg-white/80 p-6 text-center dark:border-white/15 dark:bg-white/8">
      <h3 className="text-base font-semibold text-moss-900 dark:text-slate-100">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-moss-700 dark:text-slate-300">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
