import { ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Artwork } from "../components/ui/Artwork";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { apiClient } from "../lib/api-client";
import { formatDate } from "../lib/format";
import { useAsyncResource } from "../lib/use-async-resource";
import type { BookIssue } from "../types/client";

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookResource = useAsyncResource(() => {
    if (!id) throw new Error("Missing book id");
    return apiClient.getBookIssue(id);
  }, [id]);

  if (bookResource.status === "loading") {
    return <LoadingState label="Loading book" />;
  }

  if (bookResource.status === "error") {
    return <ErrorState message={bookResource.error.message} onRetry={bookResource.reload} title="Could not load book" />;
  }

  const book = bookResource.data;

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-moss-700 hover:text-moss-900" to="/">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="overflow-hidden">
          <Artwork className="aspect-[4/3] w-full" label="Cover art is being prepared" pendingLabel="Generating cover" src={book.coverUrl} />
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold uppercase tracking-wide text-moss-700">Episode {book.episodeNumber}</span>
              <StatusBadge status={book.status} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-normal">{book.title}</h1>
              {book.subtitle ? <p className="mt-2 text-moss-700">{book.subtitle}</p> : null}
            </div>
            <p className="text-sm leading-6 text-moss-700">Scheduled {formatDate(book.scheduledFor)}</p>
            <Button disabled={!book.pdfUrl}>
              <Download size={16} />
              Download PDF
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Episode summary</h2>
            <p className="mt-3 text-sm leading-6 text-moss-700">{book.summary}</p>
          </Card>
        </div>
      </section>

      {book.pages.length > 0 ? (
        <section>
          <h2 className="mb-4 text-2xl font-black">Page preview</h2>
          <PageStripPreview pages={book.pages} />
        </section>
      ) : null}
    </div>
  );
}

function PageStripPreview({ pages }: { pages: BookIssue["pages"] }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const page = pages[pageIndex];
  const canFlip = pages.length > 1;

  if (!page) return null;

  function showPage(nextIndex: number, nextDirection: "next" | "previous") {
    setDirection(nextDirection);
    setPageIndex((nextIndex + pages.length) % pages.length);
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-moon-50 via-white to-honey-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 sm:gap-5">
        <CarouselButton
          ariaLabel="Previous page"
          disabled={!canFlip}
          icon={<ChevronLeft size={20} />}
          onClick={() => showPage(pageIndex - 1, "previous")}
        />

        <div className={`book-page-strip book-page-strip-${direction} grid min-w-0 flex-1 grid-cols-1 items-center gap-3 sm:gap-4 md:grid-cols-[0.72fr_1fr_0.72fr]`} key={page.id}>
          {visiblePages(pages, pageIndex).map(({ page: previewPage, position }) => (
            <article
              aria-current={position === "current" ? "page" : undefined}
              className={`min-w-0 overflow-hidden rounded-[1.5rem] border bg-white transition-all dark:bg-slate-950 ${
                position === "current"
                  ? "w-full border-moss-100 shadow-xl shadow-moss-900/10 md:min-h-[500px]"
                  : "hidden min-h-[380px] border-moss-100/70 opacity-70 shadow-sm md:block"
              }`}
              key={`${previewPage.id}-${position}`}
            >
              <Artwork
                className={position === "current" ? "aspect-[5/3] w-full" : "aspect-[4/3] w-full"}
                label="Page art is being prepared"
                pendingLabel="Generating illustration"
                src={previewPage.illustrationUrl}
              />
              <div className={position === "current" ? "space-y-4 p-6 sm:p-8" : "space-y-2 p-4"}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss-700">Page {previewPage.pageNumber}</p>
                <p className={position === "current" ? "text-base leading-7 text-moss-900 dark:text-slate-100 sm:text-lg sm:leading-8" : "line-clamp-3 text-sm leading-6 text-moss-700 dark:text-slate-300"}>{previewPage.text}</p>
              </div>
            </article>
          ))}
          <div className="sr-only">
            Current page: {page.pageNumber}. {page.text}
          </div>
        </div>

        <CarouselButton
          ariaLabel="Next page"
          disabled={!canFlip}
          icon={<ChevronRight size={20} />}
          onClick={() => showPage(pageIndex + 1, "next")}
        />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {pages.map((previewPage, index) => (
          <button
            aria-label={`Show page ${previewPage.pageNumber}`}
            className={`h-2.5 rounded-full transition-all ${
              index === pageIndex ? "w-8 bg-moss-700" : "w-2.5 bg-moss-100 hover:bg-moss-300"
            }`}
            key={previewPage.id}
            onClick={() => showPage(index, index > pageIndex ? "next" : "previous")}
            type="button"
          />
        ))}
      </div>
    </Card>
  );
}

function visiblePages(pages: BookIssue["pages"], currentIndex: number) {
  const previousIndex = (currentIndex - 1 + pages.length) % pages.length;
  const nextIndex = (currentIndex + 1) % pages.length;
  return [
    { page: pages[previousIndex] ?? pages[currentIndex]!, position: "previous" as const },
    { page: pages[currentIndex]!, position: "current" as const },
    { page: pages[nextIndex] ?? pages[currentIndex]!, position: "next" as const },
  ];
}

function CarouselButton({
  ariaLabel,
  disabled,
  icon,
  onClick,
}: {
  ariaLabel: string;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-moss-100 bg-white text-moss-900 shadow-sm transition hover:border-moss-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-moon-300"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
    </button>
  );
}
