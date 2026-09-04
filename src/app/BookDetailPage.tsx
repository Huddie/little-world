import { ArrowLeft, ChevronLeft, ChevronRight, Download, Mail } from "lucide-react";
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
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<Error | null>(null);

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

      <Card className="overflow-hidden">
        <section className="grid gap-5 p-4 sm:p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
          <div className="space-y-3">
            <Artwork className="aspect-[4/3] w-full rounded-xl md:aspect-square" fit="cover" label="Cover art is being prepared" pendingLabel="Generating cover" src={book.coverUrl} />
            <div className="grid gap-2">
              {book.pdfUrl ? (
                <Button className="w-full" onClick={() => window.location.assign(book.pdfUrl as string)}>
                  <Download size={16} />
                  Download PDF
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  <Download size={16} />
                  Download PDF
                </Button>
              )}
              {book.status === "DELIVERED" ? (
                <Button
                  className="w-full"
                  disabled={resending}
                  onClick={() => {
                    setResending(true);
                    setResent(false);
                    setResendError(null);
                    void apiClient.resendBookEmail(book.id)
                      .then(() => setResent(true))
                      .catch((caught: unknown) => setResendError(caught instanceof Error ? caught : new Error("Could not resend email")))
                      .finally(() => setResending(false));
                  }}
                  variant="secondary"
                >
                  <Mail size={16} />
                  {resending ? "Sending..." : "Resend email"}
                </Button>
              ) : null}
            </div>
            {resent ? <p className="text-sm font-semibold text-moss-700 dark:text-slate-300">Email sent.</p> : null}
            {resendError ? <p className="text-sm font-semibold text-petal-500">{resendError.message}</p> : null}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">Episode {book.episodeNumber}</span>
              <StatusBadge status={book.status} />
              <span className="text-sm leading-6 text-moss-700 dark:text-slate-300">Scheduled {formatDate(book.scheduledFor)}</span>
            </div>
            <h1 className="font-display mt-3 text-3xl font-black leading-tight tracking-normal text-moss-900 dark:text-white sm:text-4xl">{book.title}</h1>
            {book.subtitle ? <p className="mt-2 text-moss-700 dark:text-slate-300">{book.subtitle}</p> : null}
            <div className="mt-8 max-w-3xl rounded-xl border border-moon-100 bg-moon-50/60 p-4 dark:border-white/10 dark:bg-white/8">
              <h2 className="font-display text-lg font-bold text-moss-900 dark:text-white">Episode summary</h2>
              <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">{book.summary}</p>
            </div>
          </div>
        </section>
      </Card>

      {book.pages.length > 0 ? (
        <section>
          <h2 className="font-display mb-4 text-2xl font-black">Page preview</h2>
          <PageStripPreview pages={book.pages} typography={book.typography} />
        </section>
      ) : null}
    </div>
  );
}

function PageStripPreview({ pages, typography }: { pages: BookIssue["pages"]; typography: BookIssue["typography"] }) {
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
    <Card className="overflow-hidden bg-gradient-to-br from-moon-50 via-white to-honey-50 p-3 dark:from-slate-950 dark:via-slate-950 dark:to-moss-950 sm:p-5">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
        <CarouselButton
          ariaLabel="Previous page"
          disabled={!canFlip}
          icon={<ChevronLeft size={20} />}
          onClick={() => showPage(pageIndex - 1, "previous")}
        />

        <div className={`book-page-strip book-page-strip-${direction} grid min-w-0 grid-cols-1 items-center gap-4 xl:grid-cols-[0.68fr_minmax(0,1fr)_0.68fr]`} key={page.id}>
          {visiblePages(pages, pageIndex).map(({ page: previewPage, position }) => (
            <article
              aria-current={position === "current" ? "page" : undefined}
              className={`min-w-0 overflow-hidden rounded-[1.5rem] border bg-white transition-all dark:bg-slate-950 ${
                position === "current"
                  ? "w-full border-moss-100 shadow-xl shadow-moss-900/10"
                  : "hidden min-h-[420px] border-moss-100/70 opacity-70 shadow-sm xl:block"
              }`}
              key={`${previewPage.id}-${position}`}
            >
              <Artwork
                className={position === "current" ? "aspect-[4/3] w-full sm:aspect-[5/3]" : "aspect-[4/3] w-full"}
                fit="cover"
                label="Page art is being prepared"
                pendingLabel="Generating illustration"
                src={previewPage.illustrationUrl}
              />
              <div className={position === "current" ? "p-4 sm:p-6" : "space-y-2 p-4"}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss-700 dark:text-slate-300">Page {previewPage.pageNumber}</p>
                {position === "current" ? (
                  <div className="mt-3 rounded-[1.15rem] border border-moon-100 bg-cream-50/80 px-4 py-5 text-center shadow-inner dark:border-white/10 dark:bg-white/8 sm:px-8 sm:py-7">
                    <p className={`${webStoryFontClass(typography)} mx-auto max-w-3xl text-moss-900 dark:text-slate-100 ${webStoryTextClass(previewPage.text)}`}>{previewPage.text}</p>
                  </div>
                ) : (
                  <p className="line-clamp-3 text-sm leading-6 text-moss-700 dark:text-slate-300">{previewPage.text}</p>
                )}
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

      <div className="mt-5 flex items-center justify-center gap-2 overflow-x-auto px-2 pb-1">
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

function webStoryTextClass(value: string) {
  const length = value.trim().length;
  if (length <= 165) return "text-xl leading-9 sm:text-2xl sm:leading-10";
  if (length >= 310) return "text-lg leading-8 sm:text-xl sm:leading-9";
  return "text-lg leading-8 sm:text-[1.35rem] sm:leading-10";
}

function webStoryFontClass(typography: BookIssue["typography"]) {
  const classes: Record<BookIssue["typography"], string> = {
    storybook: "font-story font-semibold",
    adventure: "font-sans font-extrabold tracking-wide",
    cozy: "font-storySerif font-bold",
    mystery: "font-storySerif font-bold italic",
    bedtime: "font-whimsy font-semibold",
  };
  return classes[typography];
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
