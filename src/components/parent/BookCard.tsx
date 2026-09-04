import { BookMarked, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { formatDate } from "../../lib/format";
import type { BookIssue } from "../../types/client";
import { Artwork } from "../ui/Artwork";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

export function BookCard({ book }: { book: BookIssue }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-soft">
      <Link className="block" to={`/books/${book.id}`}>
        <div className="aspect-[4/3] bg-moon-100">
          <Artwork className="h-full w-full" fit="cover" label="Cover art is being prepared" pendingLabel="Generating cover" src={book.coverUrl} />
        </div>
      </Link>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">
              <BookMarked size={14} />
              Episode {book.episodeNumber}
            </span>
            <StatusBadge status={book.status} />
          </div>
          <Link className="block" to={`/books/${book.id}`}>
            <h3 className="line-clamp-2 text-base font-bold text-moss-900 dark:text-white">{book.title}</h3>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">{formatDate(book.scheduledFor)}</p>
          </Link>
          <p className="line-clamp-3 text-sm leading-6 text-moss-700 dark:text-slate-300">{book.summary}</p>
          {book.status === "DELIVERED" ? (
            <div className="space-y-2 pt-1">
              <Button
                className="h-9 w-full px-3 text-xs"
                disabled={resending}
                onClick={() => {
                  setResending(true);
                  setResent(false);
                  setError(null);
                  void apiClient.resendBookEmail(book.id)
                    .then(() => setResent(true))
                    .catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("Could not resend email")))
                    .finally(() => setResending(false));
                }}
                variant="secondary"
              >
                <Mail size={14} />
                {resending ? "Sending..." : "Resend email"}
              </Button>
              {resent ? <p className="text-xs font-semibold text-moss-700 dark:text-slate-300">Email sent.</p> : null}
              {error ? <p className="text-xs font-semibold text-petal-500">{error.message}</p> : null}
            </div>
          ) : null}
        </div>
    </Card>
  );
}
