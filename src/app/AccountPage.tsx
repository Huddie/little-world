import { Baby, CalendarDays, CreditCard, Edit3, LogOut, Mail, PackageCheck, Settings, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { apiClient } from "../lib/api-client";
import { formatDate } from "../lib/format";
import { ApiError } from "../lib/http-api-client";
import { useAsyncResource } from "../lib/use-async-resource";
import type { DeliveryDayOfWeek } from "../types/client";

export function AccountPage() {
  const dashboard = useAsyncResource(() => apiClient.getDashboard(), []);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<Error | null>(null);

  if (dashboard.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="min-h-[280px] p-6">
          <LoadingState label="Loading account" />
        </Card>
      </div>
    );
  }

  if (dashboard.status === "error") {
    if (dashboard.error instanceof ApiError && dashboard.error.status === 401) {
      return (
        <ErrorState
          action={<Button onClick={() => window.location.assign("/sign-in")}>Sign in</Button>}
          message="Sign in with your parent email to manage your account."
          title="Sign-in required"
        />
      );
    }

    return <ErrorState message={dashboard.error.message} onRetry={dashboard.reload} title="Could not load account" />;
  }

  const { children, subscription, user } = dashboard.data;
  const deliveryMethods = subscription.deliveryMethods.map((method) => method === "EMAIL" ? "Email" : "Printed book").join(", ");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-3xl font-black tracking-tight text-moss-900 dark:text-white">Account</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-700 dark:text-slate-300">
          Manage family settings, subscription details, and delivery preferences.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex h-full flex-col p-5">
          <CreditCard className="text-moss-700 dark:text-moss-300" size={22} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black">Subscription</h2>
            <StatusBadge status={subscription.status} />
          </div>
          <p className="mt-2 text-sm font-semibold text-moss-900 dark:text-slate-100">{subscription.product.name}</p>
          <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">{subscription.product.frequencyLabel}</p>
          <p className="mt-2 text-sm font-semibold text-moss-800 dark:text-slate-200">
            {subscription.usedChildSlots} of {subscription.childSlots} child slots used
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-moss-800 dark:text-slate-200">
            <CalendarDays size={16} />
            Next story {formatDate(subscription.nextIssueAt)}
          </p>
          <p className="mt-2 text-sm font-semibold text-moss-800 dark:text-slate-200">
            Delivery day: {weekdayLabel(subscription.deliveryDayOfWeek)}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-moss-800 dark:text-slate-200">
            <CreditCard size={16} />
            Next payment {formatDate(subscription.nextPaymentAt)}
          </p>
          <div className="mt-auto pt-6">
            <Button className="w-full" onClick={() => setSubscriptionModalOpen(true)} variant="secondary">
              <Settings size={16} />
              Manage subscription
            </Button>
          </div>
        </Card>

        <Card className="flex h-full flex-col p-5">
          <PackageCheck className="text-moss-700 dark:text-moss-300" size={22} />
          <h2 className="mt-4 text-lg font-black">Delivery</h2>
          <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">
            {deliveryMethods || "No delivery method selected"}
          </p>
          <p className="mt-3 text-sm leading-6 text-moss-700 dark:text-slate-300">
            Finished stories remain available in the private story shelf for reading and download.
          </p>
          <p className="mt-3 text-sm font-semibold text-moss-800 dark:text-slate-200">
            Send-to: {subscription.deliveryEmail || user.email}
          </p>
          <div className="mt-auto pt-6">
            <Button className="w-full" onClick={() => setSubscriptionModalOpen(true)} variant="secondary">
              <Settings size={16} />
              Manage delivery
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <Mail className="text-moss-700 dark:text-moss-300" size={22} />
          <h2 className="mt-4 text-lg font-black">Email</h2>
          <p className="mt-2 break-words text-sm font-semibold text-moss-900 dark:text-slate-100">{user.email}</p>
          <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">
            Your parent email is used for sign-in links, story delivery, and account notices.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Children</h2>
            <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">
              Manage child profiles, switch worlds, add another child, or remove a child from the account.
            </p>
          </div>
          <Link to="/app/children">
            <Button variant="secondary">Manage children</Button>
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {children.filter((item) => !item.archivedAt).map((item, index) => (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-moon-200 p-3 dark:border-white/10" key={item.id}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-moon-100 text-moss-700 dark:bg-white/10 dark:text-moon-200">
                  {item.worldBuildStatus === "READY" ? <Sparkles size={18} /> : <Baby size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-moss-900 dark:text-white">{childAccountLabel(item.firstName, index)}</p>
                  <p className="mt-0.5 text-xs font-semibold text-moss-700 dark:text-slate-300">
                    Ages {item.ageRange} · {item.worldBuildStatus === "READY" ? "Ready" : "Building world"}
                  </p>
                </div>
              </div>
              <Link className="shrink-0" to={`/app/children/${item.id}`}>
                <Button variant="secondary">Open world</Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Billing statements</h2>
            <p className="mt-2 text-sm leading-6 text-moss-700 dark:text-slate-300">
              View invoice and statement history once billing is connected.
            </p>
          </div>
          <Button onClick={() => setBillingModalOpen(true)} variant="secondary">
            <CreditCard size={16} />
            View statements
          </Button>
        </div>
      </Card>

      <Card className="border-petal-200 p-5">
        <h2 className="text-lg font-black">Account controls</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => setEditAccountOpen(true)} variant="secondary">
            <Edit3 size={16} />
            Edit info
          </Button>
          <Button
            disabled={accountBusy}
            onClick={() => {
              setAccountBusy(true);
              setAccountError(null);
              void apiClient.signOut()
                .then(() => {
                  window.sessionStorage.clear();
                  window.location.assign("/");
                })
                .catch((error: unknown) => setAccountError(error instanceof Error ? error : new Error("Could not sign out")))
                .finally(() => setAccountBusy(false));
            }}
            variant="secondary"
          >
            <LogOut size={16} />
            Sign out
          </Button>
          <Button
            disabled={accountBusy}
            onClick={() => {
              if (!window.confirm("Delete this account and all associated story data? This cannot be undone.")) return;
              setAccountBusy(true);
              setAccountError(null);
              void apiClient.deleteAccount()
                .then(() => {
                  window.sessionStorage.clear();
                  window.location.assign("/");
                })
                .catch((error: unknown) => setAccountError(error instanceof Error ? error : new Error("Could not delete account")))
                .finally(() => setAccountBusy(false));
            }}
            variant="danger"
          >
            <Trash2 size={16} />
            Delete account
          </Button>
        </div>
        {accountError ? <p className="mt-3 text-sm font-semibold text-petal-500">{accountError.message}</p> : null}
      </Card>

      {subscriptionModalOpen ? (
        <SubscriptionModal
          onClose={() => setSubscriptionModalOpen(false)}
          onChanged={() => {
            setSubscriptionModalOpen(false);
            dashboard.reload();
          }}
          subscription={subscription}
        />
      ) : null}
      {editAccountOpen ? (
        <EditAccountModal
          email={user.email}
          initialName={user.name}
          onChanged={() => {
            setEditAccountOpen(false);
            dashboard.reload();
          }}
          onClose={() => setEditAccountOpen(false)}
        />
      ) : null}
      {billingModalOpen ? <BillingStatementsModal onClose={() => setBillingModalOpen(false)} /> : null}
    </div>
  );
}

function BillingStatementsModal({ onClose }: { onClose: () => void }) {
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-moss-900/40 p-4" onMouseDown={onClose} role="dialog">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-moon-100 p-5 dark:border-white/10">
          <div>
            <h2 className="text-xl font-black text-moss-900 dark:text-white">Billing statements</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Statement history will appear here after billing is connected.</p>
          </div>
          <button aria-label="Close billing statements" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-moon-200 text-xs uppercase tracking-wide text-moss-700 dark:border-white/10 dark:text-slate-300">
                <tr>
                  <th className="py-3">Date</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-moon-100 dark:border-white/10">
                  <td className="py-3 text-moss-700 dark:text-slate-300">—</td>
                  <td className="py-3 font-semibold">No statements yet</td>
                  <td className="py-3 text-moss-700 dark:text-slate-300">—</td>
                  <td className="py-3 text-moss-700 dark:text-slate-300">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditAccountModal({ email, initialName, onChanged, onClose }: { email: string; initialName: string; onChanged: () => void; onClose: () => void }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-moss-900/40 p-4" onMouseDown={onClose} role="dialog">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-moss-900 dark:text-white">Account info</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">{email}</p>
          </div>
          <button aria-label="Close account modal" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <label className="mt-5 block text-sm font-bold text-moss-900 dark:text-white" htmlFor="account-name">Parent display name</label>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-moon-200 bg-white px-3 text-sm outline-none focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/10 dark:bg-slate-900"
          id="account-name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <p className="mt-3 text-xs leading-5 text-moss-700 dark:text-slate-300">Email changes require a new verified sign-in address and will be handled separately from profile details.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="ghost">Cancel</Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void apiClient.updateProfile({ name })
                .then(onChanged)
                .catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("Could not save account info")))
                .finally(() => setBusy(false));
            }}
            type="button"
          >
            {busy ? "Saving..." : "Save"}
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-petal-500">{error.message}</p> : null}
      </div>
    </div>
  );
}

function SubscriptionModal({
  onChanged,
  onClose,
  subscription,
}: {
  onChanged: () => void;
  onClose: () => void;
  subscription: Awaited<ReturnType<typeof apiClient.getDashboard>>["subscription"];
}) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState(subscription.deliveryMethods);
  const [selectedFrequency, setSelectedFrequency] = useState(subscription.frequency);
  const [selectedDeliveryDay, setSelectedDeliveryDay] = useState<DeliveryDayOfWeek>(subscription.deliveryDayOfWeek ?? 5);
  const [selectedDeliveryEmail, setSelectedDeliveryEmail] = useState(subscription.deliveryEmail ?? "");
  const deliveryChanged = !sameDeliveryMethods(selectedDeliveryMethods, subscription.deliveryMethods);
  const frequencyChanged = selectedFrequency !== subscription.frequency;
  const deliveryDayChanged = selectedDeliveryDay !== (subscription.deliveryDayOfWeek ?? 5);
  const deliveryEmailChanged = normalizeOptionalEmail(selectedDeliveryEmail) !== normalizeOptionalEmail(subscription.deliveryEmail ?? "");
  const canSave = selectedDeliveryMethods.length > 0 && (deliveryChanged || frequencyChanged || deliveryDayChanged || deliveryEmailChanged);
  const canPause = subscription.status === "ACTIVE";
  const canResume = subscription.status === "PAUSED";
  const canCancel = subscription.status !== "CANCELLED";

  function run(action: string, task: () => Promise<unknown>) {
    setBusyAction(action);
    setError(null);
    void task()
      .then(onChanged)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("Subscription update failed")))
      .finally(() => setBusyAction(null));
  }

  function saveChanges() {
    run("save", async () => {
      const tasks: Array<Promise<unknown>> = [];
      if (frequencyChanged || deliveryDayChanged) {
        tasks.push(apiClient.updateSubscriptionSchedule(subscription.id, {
          frequency: selectedFrequency,
          deliveryDayOfWeek: selectedDeliveryDay,
        }));
      }
      if (deliveryChanged) {
        tasks.push(apiClient.updateSubscriptionDeliveryMethods(subscription.id, selectedDeliveryMethods));
      }
      if (deliveryEmailChanged) {
        tasks.push(apiClient.updateSubscriptionDeliveryEmail(subscription.id, normalizeOptionalEmail(selectedDeliveryEmail) || null));
      }
      await Promise.all(tasks);
    });
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-moss-900/40 p-4" onMouseDown={onClose} role="dialog">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-moon-100 p-5 dark:border-white/10">
          <div>
            <h2 className="text-xl font-black text-moss-900 dark:text-white">Manage subscription</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">{subscription.product.name}</p>
          </div>
          <button aria-label="Close subscription modal" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <div className="grid gap-3 rounded-lg border border-moon-200 p-4 text-sm dark:border-white/10">
          <p><span className="font-bold">Status:</span> {subscription.status}</p>
          <p><span className="font-bold">Cadence:</span> {frequencyLabel(subscription.frequency)}</p>
          <p><span className="font-bold">Delivery day:</span> {weekdayLabel(subscription.deliveryDayOfWeek)}</p>
          <p><span className="font-bold">Children:</span> {subscription.usedChildSlots} of {subscription.childSlots} slots used</p>
          <p><span className="font-bold">Next story:</span> {formatDate(subscription.nextIssueAt)}</p>
          <p><span className="font-bold">Next payment:</span> {formatDate(subscription.nextPaymentAt)}</p>
          <p><span className="font-bold">Send-to email:</span> {subscription.deliveryEmail || "Login email"}</p>
          <p><span className="font-bold">Delivery:</span> {subscription.deliveryMethods.map((method) => method === "EMAIL" ? "Email" : "Printed book").join(", ")}</p>
        </div>

        <div className="rounded-lg border border-moon-200 p-4 dark:border-white/10">
          <h3 className="text-sm font-black text-moss-900 dark:text-white">Story cadence</h3>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300" htmlFor="subscription-frequency">
            Frequency
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-moon-200 bg-white px-3 text-sm font-semibold text-moss-900 outline-none transition focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            disabled={Boolean(busyAction)}
            id="subscription-frequency"
            onChange={(event) => setSelectedFrequency(event.target.value as typeof selectedFrequency)}
            value={selectedFrequency}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-moss-700 dark:text-slate-300" htmlFor="subscription-delivery-day">
            Delivery day
          </label>
          <select
            className="mt-2 h-11 w-full rounded-lg border border-moon-200 bg-white px-3 text-sm font-semibold text-moss-900 outline-none transition focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            disabled={Boolean(busyAction)}
            id="subscription-delivery-day"
            onChange={(event) => setSelectedDeliveryDay(Number(event.target.value) as DeliveryDayOfWeek)}
            value={selectedDeliveryDay}
          >
            {weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
        </div>

        <div className="rounded-lg border border-moon-200 p-4 dark:border-white/10">
          <h3 className="text-sm font-black text-moss-900 dark:text-white">Send-to email</h3>
          <p className="mt-1 text-sm leading-6 text-moss-700 dark:text-slate-300">
            Story emails can go to a different address than the login email.
          </p>
          <input
            className="mt-3 h-11 w-full rounded-lg border border-moon-200 bg-white px-3 text-sm font-semibold text-moss-900 outline-none transition focus:border-moon-400 focus:ring-4 focus:ring-moon-100 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            disabled={Boolean(busyAction)}
            onChange={(event) => setSelectedDeliveryEmail(event.target.value)}
            placeholder="Use login email"
            type="email"
            value={selectedDeliveryEmail}
          />
        </div>

        <div className="rounded-lg border border-moon-200 p-4 dark:border-white/10">
          <h3 className="text-sm font-black text-moss-900 dark:text-white">Delivery options</h3>
          <div className="mt-3 grid gap-2">
            {subscription.product.deliveryOptions.map((option) => {
              const enabled = option.availability === "ENABLED";
              const checked = selectedDeliveryMethods.includes(option.method);
              return (
                <label className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${enabled ? "border-moon-200" : "border-moon-100 opacity-60"}`} key={option.method}>
                  <input
                    checked={checked}
                    className="mt-1"
                    disabled={!enabled || Boolean(busyAction)}
                    onChange={(event) => {
                      setSelectedDeliveryMethods((current) => event.target.checked
                        ? [...new Set([...current, option.method])]
                        : current.filter((method) => method !== option.method));
                    }}
                    type="checkbox"
                  />
                  <span>
                    <span className="font-bold text-moss-900 dark:text-white">{option.label}</span>
                    <span className="block text-moss-700 dark:text-slate-300">{option.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {selectedDeliveryMethods.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-petal-500">Choose at least one delivery method.</p>
          ) : null}
        </div>
        </div>

        <div className="grid gap-3 border-t border-moon-100 p-5 sm:grid-cols-2 dark:border-white/10">
          <Button className="sm:col-span-2" disabled={Boolean(busyAction) || !canSave} onClick={saveChanges}>
            {busyAction === "save" ? "Saving..." : "Save changes"}
          </Button>
          {canPause ? (
            <Button disabled={Boolean(busyAction)} onClick={() => run("pause", () => apiClient.updateSubscriptionStatus(subscription.id, "PAUSED"))} variant="secondary">
              {busyAction === "pause" ? "Pausing..." : "Pause subscription"}
            </Button>
          ) : null}
          {canResume ? (
            <Button disabled={Boolean(busyAction)} onClick={() => run("resume", () => apiClient.updateSubscriptionStatus(subscription.id, "ACTIVE"))} variant="secondary">
              {busyAction === "resume" ? "Resuming..." : "Resume subscription"}
            </Button>
          ) : null}
          {canCancel ? (
            <Button disabled={Boolean(busyAction)} onClick={() => run("cancel", () => apiClient.updateSubscriptionStatus(subscription.id, "CANCELLED"))} variant="danger">
              {busyAction === "cancel" ? "Cancelling..." : "Cancel subscription"}
            </Button>
          ) : null}
          <Button
            disabled={Boolean(busyAction)}
            onClick={() => {
              if (!window.confirm("Delete this subscription and its generated story records? This cannot be undone.")) return;
              run("delete", () => apiClient.deleteSubscription(subscription.id));
            }}
            variant="danger"
          >
            {busyAction === "delete" ? "Deleting..." : "Delete"}
          </Button>
        </div>

        {error ? <p className="px-5 pb-5 text-sm font-semibold text-petal-500">{error.message}</p> : null}
      </div>
    </div>
  );
}

function frequencyLabel(frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY") {
  if (frequency === "WEEKLY") return "Weekly";
  if (frequency === "BIWEEKLY") return "Bi-weekly";
  return "Monthly";
}

const weekdays = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

function weekdayLabel(value?: number) {
  return weekdays.find((day) => day.value === value)?.label ?? "Friday";
}

function childAccountLabel(firstName: string | null, index: number) {
  return firstName?.trim() || `Kid ${index + 1}`;
}

function sameDeliveryMethods(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((method, index) => method === normalizedRight[index]);
}

function normalizeOptionalEmail(value: string) {
  return value.trim().toLowerCase();
}
