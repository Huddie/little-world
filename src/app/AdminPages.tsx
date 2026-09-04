import { Brain, CheckCircle2, Circle, Clock3, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Artwork } from "../components/ui/Artwork";
import { apiClient } from "../lib/api-client";
import { formatDate, formatDateTime } from "../lib/format";
import { useAsyncResource } from "../lib/use-async-resource";
import type { AdminBookIssue, BookPage } from "../types/client";

export function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-black">{title}</h1>
      <EmptyState message="This operational view is ready for real API data once the backend slice lands." title="No records in mock data" />
    </Card>
  );
}

export function AdminUsersPage() {
  const usersResource = useAsyncResource(() => apiClient.getAdminUsers(), []);
  if (usersResource.status === "loading") return <LoadingState label="Loading users" />;
  if (usersResource.status === "error") return <ErrorState message={usersResource.error.message} onRetry={usersResource.reload} title="Could not load users" />;

  return (
    <AdminTable title="Users" subtitle="Parent accounts and server-side roles.">
      <thead className="bg-moss-50 text-xs uppercase tracking-wide text-moss-700">
        <tr>
          <th className="px-5 py-3">Email</th>
          <th className="px-5 py-3">Name</th>
          <th className="px-5 py-3">Roles</th>
          <th className="px-5 py-3">Children</th>
          <th className="px-5 py-3">Subscriptions</th>
          <th className="px-5 py-3">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-moss-100">
        {usersResource.data.map((user) => (
          <tr className="hover:bg-moss-50/60" key={user.id}>
            <td className="px-5 py-4 font-bold">{user.email}</td>
            <td className="px-5 py-4 text-moss-700">{user.name || "—"}</td>
            <td className="px-5 py-4 text-moss-700">{user.roles.join(", ") || "Parent"}</td>
            <td className="px-5 py-4">{user.childrenCount}</td>
            <td className="px-5 py-4">{user.subscriptionsCount}</td>
            <td className="px-5 py-4 text-moss-700">{formatDate(user.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

export function AdminChildrenPage() {
  const childrenResource = useAsyncResource(() => apiClient.getAdminChildren(), []);
  if (childrenResource.status === "loading") return <LoadingState label="Loading children" />;
  if (childrenResource.status === "error") return <ErrorState message={childrenResource.error.message} onRetry={childrenResource.reload} title="Could not load children" />;

  return (
    <AdminTable title="Children" subtitle="Child worlds, locked cast readiness, and latest generation status.">
      <thead className="bg-moss-50 text-xs uppercase tracking-wide text-moss-700">
        <tr>
          <th className="px-5 py-3">Child</th>
          <th className="px-5 py-3">Parent</th>
          <th className="px-5 py-3">Age</th>
          <th className="px-5 py-3">World</th>
          <th className="px-5 py-3">Cast</th>
          <th className="px-5 py-3">Latest issue</th>
          <th className="px-5 py-3">Subscription</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-moss-100">
        {childrenResource.data.map((child) => (
          <tr className="hover:bg-moss-50/60" key={child.id}>
            <td className="px-5 py-4 font-bold">{child.firstName || child.id.slice(-8)}</td>
            <td className="px-5 py-4 text-moss-700">{child.parentEmail}</td>
            <td className="px-5 py-4 text-moss-700">{child.ageRange}</td>
            <td className="px-5 py-4"><StatusBadge status={child.worldBuildStatus === "READY" ? "READY" : "GENERATING"} /></td>
            <td className="px-5 py-4">{child.selectedCharacterCount}</td>
            <td className="px-5 py-4">{child.latestIssueStatus ? <StatusBadge status={child.latestIssueStatus} /> : "—"}</td>
            <td className="px-5 py-4 text-moss-700">{child.activeSubscriptionId?.slice(-8) ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

export function AdminSubscriptionsPage() {
  const subscriptionsResource = useAsyncResource(() => apiClient.getAdminSubscriptions(), []);
  if (subscriptionsResource.status === "loading") return <LoadingState label="Loading subscriptions" />;
  if (subscriptionsResource.status === "error") return <ErrorState message={subscriptionsResource.error.message} onRetry={subscriptionsResource.reload} title="Could not load subscriptions" />;

  return (
    <AdminTable title="Subscriptions" subtitle="Account-level subscriptions, child slots, cadence, and delivery methods.">
      <thead className="bg-moss-50 text-xs uppercase tracking-wide text-moss-700">
        <tr>
          <th className="px-5 py-3">Parent</th>
          <th className="px-5 py-3">Plan</th>
          <th className="px-5 py-3">Status</th>
          <th className="px-5 py-3">Cadence</th>
          <th className="px-5 py-3">Child slots</th>
          <th className="px-5 py-3">Delivery</th>
          <th className="px-5 py-3">Next story</th>
          <th className="px-5 py-3">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-moss-100">
        {subscriptionsResource.data.map((subscription) => (
          <tr className="hover:bg-moss-50/60" key={subscription.id}>
            <td className="px-5 py-4 font-bold">{subscription.parentEmail}</td>
            <td className="px-5 py-4 text-moss-700">{subscription.productName}</td>
            <td className="px-5 py-4"><StatusBadge status={subscription.status} /></td>
            <td className="px-5 py-4 text-moss-700">{subscription.frequency === "BIWEEKLY" ? "Bi-weekly" : subscription.frequency.toLowerCase()}</td>
            <td className="px-5 py-4">{subscription.usedChildSlots}/{subscription.childSlots}</td>
            <td className="px-5 py-4 text-moss-700">{subscription.deliveryMethods.join(", ") || "—"}</td>
            <td className="px-5 py-4 text-moss-700">{formatDate(subscription.nextIssueAt)}</td>
            <td className="px-5 py-4 text-moss-700">{formatDate(subscription.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

function AdminTable({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-moss-100 p-5">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-moss-700">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function AdminDeliveriesPage() {
  const deliveriesResource = useAsyncResource(() => apiClient.getAdminDeliveries(), []);

  if (deliveriesResource.status === "loading") return <LoadingState label="Loading deliveries" />;
  if (deliveriesResource.status === "error") return <ErrorState message={deliveriesResource.error.message} onRetry={deliveriesResource.reload} title="Could not load deliveries" />;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-moss-100 p-5">
        <h1 className="text-2xl font-black">Deliveries</h1>
        <p className="mt-1 text-sm text-moss-700">Recent email and mail delivery records.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-moss-50 text-xs uppercase tracking-wide text-moss-700">
            <tr>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3">Issue</th>
              <th className="px-5 py-3">Method</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Attempts</th>
              <th className="px-5 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss-100">
            {deliveriesResource.data.map((delivery) => (
              <tr className="hover:bg-moss-50/60" key={delivery.id}>
                <td className="px-5 py-4 text-moss-700">{formatDateTime(delivery.createdAt)}</td>
                <td className="px-5 py-4">
                  <Link className="font-bold text-moon-700 hover:text-moon-900" to={`/admin/book-issues/${delivery.bookIssueId}`}>{delivery.bookIssueId.slice(-8)}</Link>
                </td>
                <td className="px-5 py-4">{delivery.method}</td>
                <td className="px-5 py-4">{delivery.provider}</td>
                <td className="px-5 py-4"><StatusBadge status={delivery.status === "FAILED" ? "FAILED" : delivery.status === "SENT" || delivery.status === "DELIVERED" ? "DELIVERED" : "SCHEDULED"} /></td>
                <td className="px-5 py-4">{delivery.attemptCount}</td>
                <td className="px-5 py-4 text-moss-700">{delivery.lastError ?? delivery.providerReference ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AdminFailuresPage() {
  const failuresResource = useAsyncResource(() => apiClient.getAdminFailures(), []);

  if (failuresResource.status === "loading") return <LoadingState label="Loading failures" />;
  if (failuresResource.status === "error") return <ErrorState message={failuresResource.error.message} onRetry={failuresResource.reload} title="Could not load failures" />;

  const { failedIssues, failedDeliveries } = failuresResource.data;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="text-2xl font-black">Failures</h1>
        <p className="mt-1 text-sm text-moss-700">Operational failures needing admin review or retry.</p>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-moss-100 p-5">
          <h2 className="text-lg font-bold">Failed book issues</h2>
        </div>
        {failedIssues.length > 0 ? (
          <div className="divide-y divide-moss-100">
            {failedIssues.map((issue) => (
              <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]" key={issue.id}>
                <div>
                  <Link className="font-bold text-moon-700 hover:text-moon-900" to={`/admin/book-issues/${issue.id}`}>Episode {issue.episodeNumber} · {issue.id.slice(-8)}</Link>
                  <p className="mt-1 text-sm text-petal-500">{issue.lastError ?? "No error captured"}</p>
                </div>
                <p className="text-sm text-moss-700">{formatDateTime(issue.updatedAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No failed book issues found." title="No book failures" />
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-moss-100 p-5">
          <h2 className="text-lg font-bold">Failed deliveries</h2>
        </div>
        {failedDeliveries.length > 0 ? (
          <div className="divide-y divide-moss-100">
            {failedDeliveries.map((delivery) => (
              <div className="p-4" key={delivery.id}>
                <p className="font-bold">{delivery.method} · {delivery.id.slice(-8)}</p>
                <p className="mt-1 text-sm text-petal-500">{delivery.lastError ?? "No error captured"}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No failed deliveries found." title="No delivery failures" />
        )}
      </Card>
    </div>
  );
}

export function AdminMemoryPage() {
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [backfillError, setBackfillError] = useState<Error | null>(null);
  const memoryResource = useAsyncResource(() => apiClient.getAdminMemory(), []);

  if (memoryResource.status === "loading") return <LoadingState label="Loading memory" />;
  if (memoryResource.status === "error") return <ErrorState message={memoryResource.error.message} onRetry={memoryResource.reload} title="Could not load memory" />;

  const memory = memoryResource.data;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black"><Brain size={22} /> Story memory</h1>
            <p className="mt-1 text-sm text-moss-700">Internal continuity records extracted from generated books.</p>
          </div>
          <Button
            disabled={backfilling}
            onClick={() => {
              setBackfilling(true);
              setBackfillResult(null);
              setBackfillError(null);
              void apiClient.backfillAdminMemory()
                .then((result) => {
                  setBackfillResult(`${result.queued} memory backfill jobs queued.`);
                  return memoryResource.reload();
                })
                .catch((error: unknown) => setBackfillError(error instanceof Error ? error : new Error("Backfill failed")))
                .finally(() => setBackfilling(false));
            }}
            variant="secondary"
          >
            <RefreshCw size={16} />
            {backfilling ? "Backfilling..." : "Backfill missing"}
          </Button>
        </div>
        {backfillResult ? <p className="mt-3 text-sm font-semibold text-moss-700">{backfillResult}</p> : null}
        {backfillError ? <p className="mt-3 text-sm font-semibold text-petal-500">{backfillError.message}</p> : null}
      </Card>

      <AdminTable title="Memory events" subtitle="Ranked facts available to future story generation.">
        <thead className="bg-moss-50 text-xs uppercase tracking-wide text-moss-700">
          <tr>
            <th className="px-5 py-3">Created</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Importance</th>
            <th className="px-5 py-3">Embedding</th>
            <th className="px-5 py-3">Summary</th>
            <th className="px-5 py-3">Entities</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-moss-100">
          {memory.events.map((event) => (
            <tr className="hover:bg-moss-50/60" key={event.id}>
              <td className="px-5 py-4 text-moss-700">{formatDateTime(event.createdAt)}</td>
              <td className="px-5 py-4 font-semibold">{event.eventType}</td>
              <td className="px-5 py-4">{event.importance}</td>
              <td className="px-5 py-4 text-moss-700">{event.embeddingStatus}</td>
              <td className="max-w-xl px-5 py-4 text-moss-800">{event.summary}</td>
              <td className="px-5 py-4 text-xs text-moss-700">{event.entities.map((entity) => `${entity.entityType}:${entity.entityId.slice(-8)}`).join(", ") || "-"}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <div className="grid gap-6 xl:grid-cols-3">
        <MemorySummaryCard count={memory.characterProfiles.length} label="Character profile facts" />
        <MemorySummaryCard count={memory.relationships.length} label="Relationship facts" />
        <MemorySummaryCard count={memory.imageMemories.length} label="Hidden image memories" />
      </div>
    </div>
  );
}

function MemorySummaryCard({ count, label }: { count: number; label: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-moss-700">{label}</p>
      <p className="mt-2 text-3xl font-black">{count}</p>
    </Card>
  );
}

export function AdminBookIssuesPage() {
  const issuesResource = useAsyncResource(() => apiClient.getAdminIssues(), []);

  if (issuesResource.status === "loading") {
    return <LoadingState label="Loading book issues" />;
  }

  if (issuesResource.status === "error") {
    return <ErrorState message={issuesResource.error.message} onRetry={issuesResource.reload} title="Could not load admin books" />;
  }

  const issues = issuesResource.data;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-moss-100 p-5">
        <h1 className="text-2xl font-black">Books</h1>
        <p className="mt-1 text-sm text-moss-700">Every generated or scheduled book with its current generation step.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-moss-50 text-xs uppercase tracking-wide text-moss-700">
            <tr>
              <th className="px-5 py-3">Book</th>
              <th className="px-5 py-3">Child</th>
              <th className="px-5 py-3">Parent</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Generation step</th>
              <th className="px-5 py-3">QA</th>
              <th className="px-5 py-3">Scheduled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss-100">
            {issues.map((issue) => (
              <tr className="hover:bg-moss-50/60" key={issue.id}>
                <td className="px-5 py-4">
                  <Link className="font-bold text-moon-700 hover:text-moon-900" to={`/admin/book-issues/${issue.id}`}>
                    Episode {issue.episodeNumber}: {issue.title}
                  </Link>
                </td>
                <td className="px-5 py-4">{issue.childLabel}</td>
                <td className="px-5 py-4 text-moss-700">{issue.parentEmail}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={issue.status} />
                </td>
                <td className="px-5 py-4">
                  <GenerationStepSummary issue={issue} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={issue.qaResult} />
                </td>
                <td className="px-5 py-4 text-moss-700">{formatDate(issue.scheduledFor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GenerationStepSummary({ issue }: { issue: AdminBookIssue }) {
  const current = issue.workflow.find((step) => step.status === "CURRENT" || step.status === "FAILED");
  const completed = issue.workflow.filter((step) => step.status === "COMPLETE").length;
  const total = issue.workflow.length;
  return (
    <div>
      <p className="font-semibold text-moss-900">{current?.label ?? (issue.status === "DELIVERED" ? "Complete" : "Pending")}</p>
      <p className="mt-1 text-xs text-moss-700">
        {completed}/{total} steps complete
      </p>
    </div>
  );
}

export function AdminBookIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<Error | null>(null);
  const [inspectedPage, setInspectedPage] = useState<BookPage | null>(null);
  const issueResource = useAsyncResource(() => {
    if (!id) throw new Error("Missing issue id");
    return apiClient.getAdminIssue(id);
  }, [id]);

  if (issueResource.status === "loading") {
    return <LoadingState label="Loading issue detail" />;
  }

  if (issueResource.status === "error") {
    return <ErrorState message={issueResource.error.message} onRetry={issueResource.reload} title="Could not load issue detail" />;
  }

  const issue = issueResource.data;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-moss-700">Book issue detail</p>
            <h1 className="mt-1 max-w-4xl text-2xl font-black leading-tight tracking-normal sm:text-3xl">
              Episode {issue.episodeNumber}: {issue.title}
            </h1>
            <p className="mt-2 text-sm text-moss-700">
              {issue.childLabel} | {issue.parentEmail} | Scheduled {formatDate(issue.scheduledFor)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <StatusBadge status={issue.status} />
              <StatusBadge status={issue.qaResult} />
            </div>
            <Button
              className="shrink-0"
              disabled={retrying}
              onClick={() => {
                if (!id) return;
                setRetrying(true);
                setRetryError(null);
                void apiClient.retryBookIssue(id)
                  .then(issueResource.reload)
                  .catch((error: unknown) => setRetryError(error instanceof Error ? error : new Error("Retry failed")))
                  .finally(() => setRetrying(false));
              }}
              variant="secondary"
            >
              <RefreshCw size={16} />
              {retrying ? "Retrying..." : "Retry issue"}
            </Button>
          </div>
        </div>
      </Card>
      {retryError ? <ErrorState message={retryError.message} onRetry={() => setRetryError(null)} retryLabel="Dismiss" title="Retry failed" /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Generated outline</h2>
            <p className="mt-3 text-sm leading-6 text-moss-700">{issue.summary}</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Generated pages</h2>
            {issue.pages.length > 0 ? (
              <div className="grid gap-3">
                {issue.pages.map((page) => (
                  <div className="grid gap-3 rounded-md border border-moss-100 p-3 sm:grid-cols-[112px_minmax(0,1fr)]" key={page.id}>
                    <button
                      aria-label={`Inspect page ${page.pageNumber} illustration`}
                      className="overflow-hidden rounded-lg text-left transition hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-moon-100"
                      onClick={() => setInspectedPage(page)}
                      type="button"
                    >
                      <Artwork
                        className="aspect-[4/3] w-full"
                        label="No page image yet"
                        pendingLabel="Illustration pending"
                        src={page.illustrationUrl}
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-moss-700">
                        Page {page.pageNumber} | {page.pageType}
                      </p>
                      <p className="mt-2 text-sm leading-6">{page.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="The manuscript pages have not been persisted yet." title="Pages pending" />
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Delivery attempts</h2>
            {issue.deliveryAttempts.length > 0 ? (
              <div className="space-y-3">
                {issue.deliveryAttempts.map((attempt) => (
                  <div className="rounded-md border border-moss-100 p-3" key={attempt.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{attempt.method}</p>
                      <StatusBadge status={attempt.status === "SENT" ? "DELIVERED" : attempt.status === "FAILED" ? "FAILED" : "SCHEDULED"} />
                    </div>
                    <p className="mt-2 text-xs text-moss-700">{formatDateTime(attempt.attemptedAt)}</p>
                    <p className="mt-1 text-sm text-moss-700">{attempt.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Delivery will start after PDF rendering and QA pass." title="No delivery attempts" />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Generation steps</h2>
              <span className="text-xs font-semibold text-moss-700">{issue.workflow.filter((step) => step.status === "COMPLETE").length}/{issue.workflow.length}</span>
            </div>
            <GenerationStepChart steps={issue.workflow} />
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold">Assets</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-moss-700">PDF</dt>
                <dd className="font-semibold">{issue.pdfUrl ? "Available" : "Pending"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-moss-700">Illustrations</dt>
                <dd className="font-semibold">{issue.pages.filter((page) => page.illustrationUrl).length}</dd>
              </div>
            </dl>
          </Card>
          {issue.rawError ? (
            <Card className="border-petal-300 p-5">
              <h2 className="text-lg font-bold text-petal-500">Raw error</h2>
              <pre className="mt-3 overflow-auto rounded-md bg-petal-100 p-3 text-xs text-petal-500">{issue.rawError}</pre>
            </Card>
          ) : null}
        </div>
      </div>
      {inspectedPage ? <AdminPageImageModal onClose={() => setInspectedPage(null)} page={inspectedPage} /> : null}
    </div>
  );
}

function AdminPageImageModal({ onClose, page }: { onClose: () => void; page: BookPage }) {
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-moss-900/50 p-4" onMouseDown={onClose} role="dialog">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-moon-100 p-5 dark:border-white/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">
              Page {page.pageNumber} | {page.pageType}
            </p>
            <h2 className="mt-1 text-xl font-black text-moss-900 dark:text-white">Generated page image</h2>
          </div>
          <button aria-label="Close image inspection" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Artwork
            className="mx-auto aspect-[4/3] w-full max-w-3xl"
            label="No page image yet"
            pendingLabel="Illustration pending"
            src={page.illustrationUrl}
          />
          <p className="mt-4 rounded-lg bg-moon-50 p-4 text-sm leading-6 text-moss-800 dark:bg-white/8 dark:text-slate-200">{page.text}</p>
        </div>
      </div>
    </div>
  );
}

const stepTone = {
  COMPLETE: {
    icon: CheckCircle2,
    className: "border-moss-100 bg-moss-50 text-moss-900",
    iconClassName: "text-moss-700",
  },
  CURRENT: {
    icon: LoaderCircle,
    className: "border-honey-300 bg-honey-100 text-moss-900",
    iconClassName: "animate-spin text-honey-500",
  },
  PENDING: {
    icon: Circle,
    className: "border-moon-100 bg-white text-moss-700",
    iconClassName: "text-moon-400",
  },
  FAILED: {
    icon: XCircle,
    className: "border-petal-300 bg-petal-100 text-petal-500",
    iconClassName: "text-petal-500",
  },
};

function GenerationStepChart({ steps }: { steps: AdminBookIssue["workflow"] }) {
  const { id } = useParams<{ id: string }>();
  const [retryingStepId, setRetryingStepId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<Error | null>(null);

  return (
    <div className="grid gap-2">
      {retryError ? <p className="rounded-md bg-petal-100 p-2 text-xs font-semibold text-petal-500">{retryError.message}</p> : null}
      {steps.map((step, index) => {
        const tone = stepTone[step.status];
        const Icon = tone.icon;
        return (
          <div className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2 ${tone.className}`} key={step.id}>
            <Icon className={tone.iconClassName} size={17} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {index + 1}. {step.label}
              </p>
              <p className="mt-0.5 text-xs capitalize opacity-80">{step.status.toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-1 text-xs opacity-80">
              <Clock3 size={13} />
              <span>{formatDateTime(step.timestamp)}</span>
            </div>
            {step.status === "FAILED" ? (
              <Button
                className="h-8 px-2 text-xs"
                disabled={retryingStepId === step.id}
                onClick={() => {
                  if (!id) return;
                  setRetryingStepId(step.id);
                  setRetryError(null);
                  void apiClient.retryBookIssueStep(id, step.id)
                    .then(() => window.location.reload())
                    .catch((error: unknown) => setRetryError(error instanceof Error ? error : new Error("Step retry failed")))
                    .finally(() => setRetryingStepId(null));
                }}
                variant="secondary"
              >
                {retryingStepId === step.id ? "Retrying..." : "Retry"}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
