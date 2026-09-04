import { Home, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "The page could not be rendered.";

  return (
    <main className="min-h-screen bg-gradient-to-br from-moon-50 via-white to-honey-50 px-4 py-12 text-moss-900 dark:from-slate-950 dark:via-slate-950 dark:to-moss-950 dark:text-white">
      <Card className="mx-auto max-w-xl p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-honey-100 text-moss-900 dark:bg-honey-300/20 dark:text-honey-100">
          <RefreshCw size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-black">This page needs a refresh</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-moss-700 dark:text-slate-300">
          We could not render this view. Refresh the page, or return home and try again.
        </p>
        <p className="mx-auto mt-3 max-w-md rounded-md bg-moon-50 p-3 text-xs font-semibold text-moss-700 dark:bg-white/8 dark:text-slate-300">
          Support detail: {message}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()} variant="secondary">
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Link to="/app">
            <Button>
              <Home size={16} />
              Go home
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
