export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-moss-700 dark:text-slate-300">{label}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg bg-moon-100 dark:bg-white/10" />
        <div className="h-28 animate-pulse rounded-lg bg-moon-100 dark:bg-white/10" />
        <div className="h-28 animate-pulse rounded-lg bg-moon-100 dark:bg-white/10" />
      </div>
    </div>
  );
}
