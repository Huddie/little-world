import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}

export function ErrorState({ action, message, onRetry, retryLabel = "Try again", title = "Something went wrong" }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-petal-100 bg-white p-6 text-center shadow-sm dark:border-petal-300/30 dark:bg-slate-950/82">
      <AlertTriangle className="mx-auto text-petal-500" size={32} />
      <h2 className="mt-3 text-lg font-bold text-moss-900 dark:text-slate-100">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-moss-700 dark:text-slate-300">{message}</p>
      {action ?? (onRetry ? (
        <div className="mt-4">
          <Button onClick={onRetry} variant="secondary">
            <RefreshCw size={16} />
            {retryLabel}
          </Button>
        </div>
      ) : null)}
    </div>
  );
}
