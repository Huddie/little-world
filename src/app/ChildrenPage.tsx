import { Archive, Baby, Edit3, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, Select, TextInput } from "../components/ui/Form";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ageRangeFromBirthDate } from "../lib/age-range";
import { apiClient } from "../lib/api-client";
import { formatDate } from "../lib/format";
import { useAsyncResource } from "../lib/use-async-resource";
import type { ChildSummary } from "../types/client";

export function ChildrenPage() {
  const children = useAsyncResource(() => apiClient.getChildren(), []);

  if (children.status === "loading") return <LoadingState label="Loading children" />;
  if (children.status === "error") return <ErrorState message={children.error.message} onRetry={children.reload} title="Could not load children" />;

  const activeChildren = children.data.filter((child) => !child.archivedAt);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-moss-900 dark:text-white">Children</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-moss-700 dark:text-slate-300">
            Manage each child’s little world from one parent account.
          </p>
        </div>
        <Link to="/onboarding">
          <Button>
            <Plus size={16} />
            Add child
          </Button>
        </Link>
      </section>

      {activeChildren.length === 0 ? (
        <EmptyState
          action={<Link to="/onboarding"><Button>Add child</Button></Link>}
          message="Add a child profile, generate a unique cast, and build their little world."
          title="No children yet"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeChildren.map((child, index) => <ChildCard child={child} index={index} key={child.id} onChanged={children.reload} />)}
        </div>
      )}
    </div>
  );
}

function ChildCard({ child, index, onChanged }: { child: ChildSummary; index: number; onChanged: () => void }) {
  const label = child.firstName?.trim() || `Kid ${index + 1}`;
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-moon-100 text-moss-700 dark:bg-white/10 dark:text-moon-200">
            {child.worldBuildStatus === "READY" ? <Sparkles size={20} /> : <Baby size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-moss-900 dark:text-white">{label}</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">
              Birthday {formatDate(child.birthDate)} · Ages {child.ageRange}
            </p>
          </div>
        </div>
        <StatusBadge status={child.worldBuildStatus === "READY" ? "READY" : "GENERATING"} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={`/app/children/${child.id}`}>
          <Button variant="secondary">Open world</Button>
        </Link>
        <Button onClick={() => setEditOpen(true)} variant="secondary">
          <Edit3 size={16} />
          Edit
        </Button>
        <Button
          onClick={() => {
            if (!window.confirm(`Remove ${label}? This removes the child profile and associated story data.`)) return;
            void apiClient.archiveChild(child.id).then(onChanged);
          }}
          variant="danger"
        >
          <Archive size={16} />
          Remove
        </Button>
      </div>
      {editOpen ? (
        <EditChildModal
          child={child}
          label={label}
          onChanged={() => {
            setEditOpen(false);
            onChanged();
          }}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </Card>
  );
}

function EditChildModal({ child, label, onChanged, onClose }: { child: ChildSummary; label: string; onChanged: () => void; onClose: () => void }) {
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
            <h2 className="text-xl font-black text-moss-900 dark:text-white">Edit {label}</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Update the profile details used for future stories.</p>
          </div>
          <button aria-label="Close child editor" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <Field hint="Optional. If left blank, we’ll use Kid N in account screens." label="Child name">
            <TextInput onChange={(event) => setFirstName(event.target.value)} placeholder="Optional" value={firstName} />
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
          <Field hint="Only needed once the child is reading independently." label="Reading level">
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
          <Button onClick={onClose} type="button" variant="ghost">Cancel</Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void apiClient.updateChild(child.id, {
                firstName,
                birthDate: birthDate || null,
                ageRange,
                readingLevel: readingLevel || null,
              })
                .then(onChanged)
                .catch((caught: unknown) => setError(caught instanceof Error ? caught : new Error("Could not update child profile")))
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
