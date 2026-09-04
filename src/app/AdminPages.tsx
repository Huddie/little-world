import { Brain, CheckCircle2, Circle, Clock3, Database, Edit3, Globe2, Image, LoaderCircle, MapPin, RefreshCw, Users, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, Select, TextInput } from "../components/ui/Form";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Artwork } from "../components/ui/Artwork";
import { ageRangeFromBirthDate } from "../lib/age-range";
import { apiClient } from "../lib/api-client";
import { formatDate, formatDateTime } from "../lib/format";
import { useAsyncResource } from "../lib/use-async-resource";
import type { AdminBookIssue, AdminChildRow, AdminMemory, AdminWorldCatalog, BookPage } from "../types/client";

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
      <thead className={adminTableHeadClassName}>
        <tr>
          <th className="px-5 py-3">Email</th>
          <th className="px-5 py-3">Name</th>
          <th className="px-5 py-3">Roles</th>
          <th className="px-5 py-3">Children</th>
          <th className="px-5 py-3">Subscriptions</th>
          <th className="px-5 py-3">Created</th>
        </tr>
      </thead>
      <tbody className={adminTableBodyClassName}>
        {usersResource.data.map((user) => (
          <tr className={adminTableRowClassName} key={user.id}>
            <td className="px-5 py-4 font-bold">{user.email}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{user.name || "—"}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{user.roles.join(", ") || "Parent"}</td>
            <td className="px-5 py-4">{user.childrenCount}</td>
            <td className="px-5 py-4">{user.subscriptionsCount}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{formatDate(user.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

export function AdminChildrenPage() {
  const childrenResource = useAsyncResource(() => apiClient.getAdminChildren(), []);
  const [editingChild, setEditingChild] = useState<AdminChildRow | null>(null);
  const [buildingChildId, setBuildingChildId] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<Error | null>(null);
  if (childrenResource.status === "loading") return <LoadingState label="Loading children" />;
  if (childrenResource.status === "error") return <ErrorState message={childrenResource.error.message} onRetry={childrenResource.reload} title="Could not load children" />;

  return (
    <>
      {buildError ? <ErrorState message={buildError.message} onRetry={() => setBuildError(null)} retryLabel="Dismiss" title="Build story failed" /> : null}
      <AdminTable title="Children" subtitle="Child worlds, locked cast readiness, and latest generation status.">
        <thead className={adminTableHeadClassName}>
          <tr>
            <th className="px-5 py-3">Child</th>
            <th className="px-5 py-3">Parent</th>
            <th className="px-5 py-3">Age</th>
            <th className="px-5 py-3">World</th>
            <th className="px-5 py-3">Cast</th>
            <th className="px-5 py-3">Latest issue</th>
            <th className="px-5 py-3">Subscription</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className={adminTableBodyClassName}>
          {childrenResource.data.map((child) => (
            <tr className={adminTableRowClassName} key={child.id}>
              <td className="px-5 py-4 font-bold">{child.firstName || child.id.slice(-8)}</td>
              <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{child.parentEmail}</td>
              <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{child.ageRange}</td>
              <td className="px-5 py-4"><StatusBadge status={child.worldBuildStatus === "READY" ? "READY" : "GENERATING"} /></td>
              <td className="px-5 py-4">{child.selectedCharacterCount}</td>
              <td className="px-5 py-4">{child.latestIssueStatus ? <StatusBadge status={child.latestIssueStatus} /> : "—"}</td>
              <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{child.activeSubscriptionId?.slice(-8) ?? "—"}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                <Button className="h-8 px-2 text-xs" onClick={() => setEditingChild(child)} variant="secondary">
                  <Edit3 size={14} />
                  Edit
                </Button>
                <Button
                  className="h-8 px-2 text-xs"
                  disabled={buildingChildId === child.id}
                  onClick={() => {
                    setBuildingChildId(child.id);
                    setBuildError(null);
                    void apiClient.buildAdminChildStoryNow(child.id)
                      .then(() => childrenResource.reload())
                      .catch((caught: unknown) => setBuildError(caught instanceof Error ? caught : new Error("Could not start story build")))
                      .finally(() => setBuildingChildId(null));
                  }}
                  variant="secondary"
                >
                  <RefreshCw size={14} />
                  {buildingChildId === child.id ? "Starting..." : "Build story now"}
                </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      {editingChild ? (
        <AdminChildEditModal
          child={editingChild}
          onChanged={() => {
            setEditingChild(null);
            childrenResource.reload();
          }}
          onClose={() => setEditingChild(null)}
        />
      ) : null}
    </>
  );
}

export function AdminSubscriptionsPage() {
  const subscriptionsResource = useAsyncResource(() => apiClient.getAdminSubscriptions(), []);
  if (subscriptionsResource.status === "loading") return <LoadingState label="Loading subscriptions" />;
  if (subscriptionsResource.status === "error") return <ErrorState message={subscriptionsResource.error.message} onRetry={subscriptionsResource.reload} title="Could not load subscriptions" />;

  return (
    <AdminTable title="Subscriptions" subtitle="Account-level subscriptions, child slots, cadence, and delivery methods.">
      <thead className={adminTableHeadClassName}>
        <tr>
          <th className="px-5 py-3">Parent</th>
          <th className="px-5 py-3">Plan</th>
          <th className="px-5 py-3">Status</th>
          <th className="px-5 py-3">Cadence</th>
          <th className="px-5 py-3">Child slots</th>
          <th className="px-5 py-3">Delivery</th>
          <th className="px-5 py-3">Send-to</th>
          <th className="px-5 py-3">Next story</th>
          <th className="px-5 py-3">Created</th>
        </tr>
      </thead>
      <tbody className={adminTableBodyClassName}>
        {subscriptionsResource.data.map((subscription) => (
          <tr className={adminTableRowClassName} key={subscription.id}>
            <td className="px-5 py-4 font-bold">{subscription.parentEmail}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{subscription.productName}</td>
            <td className="px-5 py-4"><StatusBadge status={subscription.status} /></td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{subscription.frequency === "BIWEEKLY" ? "Bi-weekly" : subscription.frequency.toLowerCase()}</td>
            <td className="px-5 py-4">{subscription.usedChildSlots}/{subscription.childSlots}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{subscription.deliveryMethods.join(", ") || "—"}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{subscription.deliveryEmail || subscription.parentEmail}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{formatDate(subscription.nextIssueAt)}</td>
            <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{formatDate(subscription.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

function AdminTable({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-moss-100 p-5 dark:border-white/10">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">{children}</table>
      </div>
    </Card>
  );
}

function AdminChildEditModal({ child, onChanged, onClose }: { child: AdminChildRow; onChanged: () => void; onClose: () => void }) {
  const [firstName, setFirstName] = useState(child.firstName ?? "");
  const [birthDate, setBirthDate] = useState(child.birthDate ?? "");
  const [ageRange, setAgeRange] = useState(child.ageRange);
  const [readingLevel, setReadingLevel] = useState(child.readingLevel ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-moss-900/40 p-4" onMouseDown={onClose} role="dialog">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-moss-900 dark:text-white">Edit child</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">{child.parentEmail}</p>
          </div>
          <button aria-label="Close child editor" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Child name">
            <TextInput onChange={(event) => setFirstName(event.target.value)} value={firstName} />
          </Field>
          <Field label="Birthday">
            <TextInput
              onChange={(event) => {
                setBirthDate(event.target.value);
                const suggestedAgeRange = ageRangeFromBirthDate(event.target.value);
                if (suggestedAgeRange) setAgeRange(suggestedAgeRange);
              }}
              type="date"
              value={birthDate}
            />
          </Field>
          <Field label="Age range">
            <Select onChange={(event) => setAgeRange(event.target.value as typeof ageRange)} value={ageRange}>
              <option value="1-11 months">1-11 months</option>
              <option value="12-23 months">12-23 months</option>
              <option value="2-3">2-3</option>
              <option value="4-5">4-5</option>
              <option value="6-8">6-8</option>
              <option value="9-12">9-12</option>
            </Select>
          </Field>
          <Field label="Reading level">
            <Select onChange={(event) => setReadingLevel(event.target.value)} value={readingLevel}>
              <option value="">Parent read-aloud</option>
              <option value="Pre-reader">Pre-reader</option>
              <option value="Early reader">Early reader</option>
              <option value="Growing reader">Growing reader</option>
            </Select>
          </Field>
        </div>
        {error ? <p className="mt-4 text-sm font-semibold text-petal-500">{error.message}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void apiClient.updateAdminChild(child.id, {
                firstName,
                birthDate: birthDate || null,
                ageRange,
                readingLevel: readingLevel || null,
              })
                .then(onChanged)
                .catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("Could not update child")))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const adminTableHeadClassName = "bg-moss-50 text-xs uppercase tracking-wide text-moss-700 dark:bg-slate-900 dark:text-slate-300";
const adminTableBodyClassName = "divide-y divide-moss-100 dark:divide-white/10";
const adminTableRowClassName = "hover:bg-moss-50/60 dark:hover:bg-white/5";

export function AdminDeliveriesPage() {
  const deliveriesResource = useAsyncResource(() => apiClient.getAdminDeliveries(), []);

  if (deliveriesResource.status === "loading") return <LoadingState label="Loading deliveries" />;
  if (deliveriesResource.status === "error") return <ErrorState message={deliveriesResource.error.message} onRetry={deliveriesResource.reload} title="Could not load deliveries" />;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-moss-100 p-5 dark:border-white/10">
        <h1 className="text-2xl font-black">Deliveries</h1>
        <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Recent email and mail delivery records.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className={adminTableHeadClassName}>
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
          <tbody className={adminTableBodyClassName}>
            {deliveriesResource.data.map((delivery) => (
              <tr className={adminTableRowClassName} key={delivery.id}>
                <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{formatDateTime(delivery.createdAt)}</td>
                <td className="px-5 py-4">
                  <Link className="font-bold text-moon-700 hover:text-moon-900" to={`/admin/book-issues/${delivery.bookIssueId}`}>{delivery.bookIssueId.slice(-8)}</Link>
                </td>
                <td className="px-5 py-4">{delivery.method}</td>
                <td className="px-5 py-4">{delivery.provider}</td>
                <td className="px-5 py-4"><StatusBadge status={delivery.status === "FAILED" ? "FAILED" : delivery.status === "SENT" || delivery.status === "DELIVERED" ? "DELIVERED" : "SCHEDULED"} /></td>
                <td className="px-5 py-4">{delivery.attemptCount}</td>
                <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{delivery.lastError ?? delivery.providerReference ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AdminWorldPage() {
  const worldResource = useAsyncResource(() => apiClient.getAdminWorldCatalog(), []);

  if (worldResource.status === "loading") return <LoadingState label="Loading world bible" />;
  if (worldResource.status === "error") return <ErrorState message={worldResource.error.message} onRetry={worldResource.reload} title="Could not load world bible" />;

  const catalog = worldResource.data;
  const universe = catalog.universes[0];
  const groupedRules = groupWorldRules(catalog.worldRules);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-moon-100 text-moon-900 dark:bg-moon-300/18 dark:text-moon-100">
            <Globe2 size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-moss-900 dark:text-white">{universe?.name ?? "World bible"}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-moss-700 dark:text-slate-300">
              {universe?.description ?? "Live story-world data used to ground generation."}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="text-lg font-black text-moss-900 dark:text-white">World rules</h2>
          <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Hard constraints passed into story generation and QA.</p>
          <div className="mt-5 space-y-4">
            {Object.entries(groupedRules).map(([category, rules]) => (
              <section className="rounded-lg border border-moon-200 p-4 dark:border-white/10" key={category}>
                <h3 className="text-xs font-black uppercase tracking-wide text-moss-700 dark:text-slate-300">{category}</h3>
                <div className="mt-3 space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id}>
                      <p className="text-sm font-semibold leading-6 text-moss-900 dark:text-slate-100">{rule.rule}</p>
                      {rule.rationale ? <p className="mt-1 text-xs leading-5 text-moss-700 dark:text-slate-300">{rule.rationale}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-moss-900 dark:text-white">
            <MapPin size={18} />
            Locations
          </h2>
          <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Known places the writer should use as anchors.</p>
          <div className="mt-5 space-y-3">
            {catalog.locations.map((location) => (
              <div className="rounded-lg border border-moss-100 p-4 dark:border-white/10" key={location.id}>
                <p className="text-sm font-black text-moss-900 dark:text-white">{location.name}</p>
                <p className="mt-1 text-sm leading-6 text-moss-700 dark:text-slate-300">{location.description}</p>
                <WorldJsonPreview value={location.canonicalPropertiesJson} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-black text-moss-900 dark:text-white">Curated character foundations</h2>
        <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">
          Source archetypes used as examples. Each child gets a unique locked cast derived from this foundation.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {catalog.characters.map((character) => (
            <div className="rounded-lg border border-moss-100 p-4 dark:border-white/10" key={character.id}>
              <p className="text-sm font-black text-moss-900 dark:text-white">{character.name}</p>
              <p className="mt-1 text-sm leading-6 text-moss-700 dark:text-slate-300">{character.description}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-moss-700 dark:text-slate-300">{character.personality}</p>
              <WorldJsonPreview value={character.visualDescriptionJson} />
            </div>
          ))}
        </div>
      </Card>
    </div>
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
        <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Operational failures needing admin review or retry.</p>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-moss-100 p-5 dark:border-white/10">
          <h2 className="text-lg font-bold">Failed book issues</h2>
        </div>
        {failedIssues.length > 0 ? (
          <div className="divide-y divide-moss-100 dark:divide-white/10">
            {failedIssues.map((issue) => (
              <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]" key={issue.id}>
                <div>
                  <Link className="font-bold text-moon-700 hover:text-moon-900" to={`/admin/book-issues/${issue.id}`}>Episode {issue.episodeNumber} · {issue.id.slice(-8)}</Link>
                  <p className="mt-1 text-sm text-petal-500">{issue.lastError ?? "No error captured"}</p>
                </div>
                <p className="text-sm text-moss-700 dark:text-slate-300">{formatDateTime(issue.updatedAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No failed book issues found." title="No book failures" />
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-moss-100 p-5 dark:border-white/10">
          <h2 className="text-lg font-bold">Failed deliveries</h2>
        </div>
        {failedDeliveries.length > 0 ? (
          <div className="divide-y divide-moss-100 dark:divide-white/10">
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
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Internal continuity records extracted from generated books.</p>
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
        {backfillResult ? <p className="mt-3 text-sm font-semibold text-moss-700 dark:text-slate-300">{backfillResult}</p> : null}
        {backfillError ? <p className="mt-3 text-sm font-semibold text-petal-500">{backfillError.message}</p> : null}
      </Card>

      <WorldMemoryOverview memory={memory} />

      <AdminTable title="Memory events" subtitle="Ranked facts available to future story generation.">
        <thead className={adminTableHeadClassName}>
          <tr>
            <th className="px-5 py-3">Created</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Importance</th>
            <th className="px-5 py-3">Embedding</th>
            <th className="px-5 py-3">Summary</th>
            <th className="px-5 py-3">Entities</th>
          </tr>
        </thead>
        <tbody className={adminTableBodyClassName}>
          {memory.events.map((event) => (
            <tr className={adminTableRowClassName} key={event.id}>
              <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{formatDateTime(event.createdAt)}</td>
              <td className="px-5 py-4 font-semibold">{event.eventType}</td>
              <td className="px-5 py-4">{event.importance}</td>
              <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{event.embeddingStatus}</td>
              <td className="max-w-xl px-5 py-4 text-moss-800 dark:text-slate-200">{event.summary}</td>
              <td className="px-5 py-4 text-xs text-moss-700 dark:text-slate-300">{event.entities.map((entity) => `${entity.entityType}:${entity.entityId.slice(-8)}`).join(", ") || "-"}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <div className="grid gap-6 xl:grid-cols-3">
        <MemorySummaryCard count={memory.characterProfiles.length} label="Character profile facts" />
        <MemorySummaryCard count={memory.relationships.length} label="Relationship facts" />
        <MemorySummaryCard count={memory.imageMemories.length} label="Hidden image memories" />
      </div>

      <AdminMemoryDetails memory={memory} />
    </div>
  );
}

function MemorySummaryCard({ count, label }: { count: number; label: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-moss-700 dark:text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-black">{count}</p>
    </Card>
  );
}

function WorldMemoryOverview({ memory }: { memory: AdminMemory }) {
  const metrics = buildMemoryMetrics(memory);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OperationalMetricCard
        detail={`${metrics.childScopedEvents} child-scoped · ${metrics.globalEvents} global`}
        icon={<Database size={18} />}
        label="Continuity facts"
        value={memory.events.length}
      />
      <OperationalMetricCard
        detail={`${metrics.embeddedEvents}/${memory.events.length} embedded`}
        icon={<Brain size={18} />}
        label="Vector readiness"
        value={`${metrics.embeddingRate}%`}
      />
      <OperationalMetricCard
        detail={`${metrics.activeImageMemories} active · ${metrics.imageMemoryCharacters} characters`}
        icon={<Image size={18} />}
        label="Image references"
        value={memory.imageMemories.length}
      />
      <OperationalMetricCard
        detail={`${memory.characterProfiles.length} profiles · ${memory.relationships.length} relationships`}
        icon={<Users size={18} />}
        label="Cast memory"
        value={metrics.castMemoryTotal}
      />
    </div>
  );
}

function buildMemoryMetrics(memory: AdminMemory) {
  const embeddedEvents = memory.events.filter((event) => event.embeddingStatus === "SYNCED").length;
  const activeImageMemories = memory.imageMemories.filter((item) => item.active).length;
  return {
    activeImageMemories,
    castMemoryTotal: memory.characterProfiles.length + memory.relationships.length,
    childScopedEvents: memory.events.filter((event) => event.scope === "CHILD").length,
    embeddedEvents,
    embeddingRate: memory.events.length > 0 ? Math.round((embeddedEvents / memory.events.length) * 100) : 0,
    globalEvents: memory.events.filter((event) => event.scope === "GLOBAL").length,
    imageMemoryCharacters: new Set(memory.imageMemories.map((item) => item.characterId)).size,
  };
}

function OperationalMetricCard({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-moss-700 dark:text-slate-300">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-moon-100 text-moon-900 dark:bg-white/10 dark:text-moon-100">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black text-moss-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-moss-700 dark:text-slate-300">{detail}</p>
    </Card>
  );
}

function AdminMemoryDetails({ memory }: { memory: AdminMemory }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="border-b border-moss-100 p-5 dark:border-white/10">
          <h2 className="text-lg font-bold">Character profile memory</h2>
          <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Traits and continuity facts available for recurring cast members.</p>
        </div>
        <CompactMemoryRows
          emptyTitle="No profile memories"
          rows={memory.characterProfiles.slice(0, 8).map((item) => ({
            id: item.id,
            meta: `${item.memoryType} · ${item.characterId.slice(-8)} · importance ${item.importance}`,
            summary: item.summary,
          }))}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-moss-100 p-5 dark:border-white/10">
          <h2 className="text-lg font-bold">Image reference memory</h2>
          <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Hidden illustration references used for visual continuity.</p>
        </div>
        <CompactMemoryRows
          emptyTitle="No image references"
          rows={memory.imageMemories.slice(0, 8).map((item) => ({
            id: item.id,
            meta: `Page ${item.pageNumber} · ${item.active ? "active" : "inactive"} · used ${item.usageCount}`,
            summary: `${item.caption} · asset ${item.assetId.slice(-8)}`,
          }))}
        />
      </Card>
    </div>
  );
}

function CompactMemoryRows({ emptyTitle, rows }: { emptyTitle: string; rows: Array<{ id: string; meta: string; summary: string }> }) {
  if (rows.length === 0) {
    return <EmptyState message="Run a successful book generation and memory extraction to populate this view." title={emptyTitle} />;
  }

  return (
    <div className="divide-y divide-moss-100 dark:divide-white/10">
      {rows.map((row) => (
        <div className="p-4" key={row.id}>
          <p className="text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">{row.meta}</p>
          <p className="mt-1 text-sm leading-6 text-moss-800 dark:text-slate-200">{row.summary}</p>
        </div>
      ))}
    </div>
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
      <div className="border-b border-moss-100 p-5 dark:border-white/10">
        <h1 className="text-2xl font-black">Books</h1>
        <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Every generated or scheduled book with its current generation step.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className={adminTableHeadClassName}>
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
          <tbody className={adminTableBodyClassName}>
            {issues.map((issue) => (
              <tr className={adminTableRowClassName} key={issue.id}>
                <td className="px-5 py-4">
                  <Link className="font-bold text-moon-700 hover:text-moon-900" to={`/admin/book-issues/${issue.id}`}>
                    Episode {issue.episodeNumber}: {issue.title}
                  </Link>
                </td>
                <td className="px-5 py-4">{issue.childLabel}</td>
                <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{issue.parentEmail}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={issue.status} />
                </td>
                <td className="px-5 py-4">
                  <GenerationStepSummary issue={issue} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={issue.qaResult} />
                </td>
                <td className="px-5 py-4 text-moss-700 dark:text-slate-300">{formatDate(issue.scheduledFor)}</td>
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
      <p className="font-semibold text-moss-900 dark:text-slate-100">{current?.label ?? (issue.status === "DELIVERED" ? "Complete" : "Pending")}</p>
      <p className="mt-1 text-xs text-moss-700 dark:text-slate-300">
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
            <p className="text-sm font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">Book issue detail</p>
            <h1 className="mt-1 max-w-4xl text-2xl font-black leading-tight tracking-normal sm:text-3xl">
              Episode {issue.episodeNumber}: {issue.title}
            </h1>
            <p className="mt-2 text-sm text-moss-700 dark:text-slate-300">
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
            <p className="mt-3 text-sm leading-6 text-moss-700 dark:text-slate-300">{issue.summary}</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Generated pages</h2>
            {issue.pages.length > 0 ? (
              <div className="grid gap-3">
                {issue.pages.map((page) => (
                  <div className="grid gap-3 rounded-md border border-moss-100 p-3 dark:border-white/10 sm:grid-cols-[112px_minmax(0,1fr)]" key={page.id}>
                    <button
                      aria-label={`Inspect page ${page.pageNumber} illustration`}
                      className="overflow-hidden rounded-lg text-left transition hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-moon-100 dark:focus:ring-moon-300/20"
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
                      <p className="text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300">
                        Page {page.pageNumber} | {page.pageType}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-moss-900 dark:text-slate-100">{page.text}</p>
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
                  <div className="rounded-md border border-moss-100 p-3 dark:border-white/10" key={attempt.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{attempt.method}</p>
                      <StatusBadge status={attempt.status === "SENT" ? "DELIVERED" : attempt.status === "FAILED" ? "FAILED" : "SCHEDULED"} />
                    </div>
                    <p className="mt-2 text-xs text-moss-700 dark:text-slate-300">{formatDateTime(attempt.attemptedAt)}</p>
                    <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">{attempt.detail}</p>
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
              <span className="text-xs font-semibold text-moss-700 dark:text-slate-300">{issue.workflow.filter((step) => step.status === "COMPLETE").length}/{issue.workflow.length}</span>
            </div>
            <GenerationStepChart steps={issue.workflow} />
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold">Assets</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-moss-700 dark:text-slate-300">PDF</dt>
                <dd className="font-semibold">{issue.pdfUrl ? "Available" : "Pending"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-moss-700 dark:text-slate-300">Illustrations</dt>
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
    className: "border-moss-100 bg-moss-50 text-moss-900 dark:border-white/10 dark:bg-moss-300/12 dark:text-slate-100",
    iconClassName: "text-moss-700 dark:text-moss-200",
  },
  CURRENT: {
    icon: LoaderCircle,
    className: "border-honey-300 bg-honey-100 text-moss-900 dark:border-honey-300/40 dark:bg-honey-300/15 dark:text-honey-100",
    iconClassName: "animate-spin text-honey-500 dark:text-honey-200",
  },
  PENDING: {
    icon: Circle,
    className: "border-moon-100 bg-white text-moss-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300",
    iconClassName: "text-moon-400 dark:text-moon-200",
  },
  FAILED: {
    icon: XCircle,
    className: "border-petal-300 bg-petal-100 text-petal-500 dark:border-petal-300/50 dark:bg-petal-300/12 dark:text-petal-200",
    iconClassName: "text-petal-500 dark:text-petal-200",
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
          <div className={`grid gap-3 rounded-md border px-3 py-2 sm:grid-cols-[28px_minmax(0,1fr)_auto] sm:items-center ${tone.className}`} key={step.id}>
            <Icon className={tone.iconClassName} size={17} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {index + 1}. {step.label}
              </p>
              <p className="mt-0.5 text-xs capitalize opacity-80">{step.status.toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-1 text-xs opacity-80 sm:justify-end">
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

function groupWorldRules(rules: AdminWorldCatalog["worldRules"]) {
  return rules.reduce<Record<string, AdminWorldCatalog["worldRules"]>>((groups, rule) => {
    const key = rule.category || "general";
    groups[key] = [...(groups[key] ?? []), rule];
    return groups;
  }, {});
}

function WorldJsonPreview({ value }: { value: string }) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const entries = Object.entries(parsed).slice(0, 4);
    if (entries.length === 0) return null;
    return (
      <dl className="mt-3 grid gap-2 rounded-md bg-moss-50 p-3 text-xs dark:bg-white/8">
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt className="font-black capitalize text-moss-900 dark:text-slate-100">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-0.5 leading-5 text-moss-700 dark:text-slate-300">{Array.isArray(item) ? item.join(", ") : String(item)}</dd>
          </div>
        ))}
      </dl>
    );
  } catch {
    return null;
  }
}
