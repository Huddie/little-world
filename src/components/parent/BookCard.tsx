import { BookMarked } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "../../lib/format";
import type { BookIssue } from "../../types/client";
import { Artwork } from "../ui/Artwork";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

export function BookCard({ book }: { book: BookIssue }) {
  return (
    <Link to={`/books/${book.id}`}>
      <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-soft">
        <div className="aspect-[4/3] bg-moon-100">
          <Artwork className="h-full w-full" label="Cover art is being prepared" pendingLabel="Generating cover" src={book.coverUrl} />
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-moss-700">
              <BookMarked size={14} />
              Episode {book.episodeNumber}
            </span>
            <StatusBadge status={book.status} />
          </div>
          <div>
            <h3 className="line-clamp-2 text-base font-bold text-moss-900">{book.title}</h3>
            <p className="mt-1 text-sm text-moss-700">{formatDate(book.scheduledFor)}</p>
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-moss-700">{book.summary}</p>
        </div>
      </Card>
    </Link>
  );
}
