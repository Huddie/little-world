import { Archive, Baby, Edit3, Plus, ScrollText, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, Select, Textarea, TextInput } from "../components/ui/Form";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ageRangeFromBirthDate } from "../lib/age-range";
import { apiClient } from "../lib/api-client";
import { formatDate } from "../lib/format";
import { useAsyncResource } from "../lib/use-async-resource";
import type { ChildSummary, StoryInspirationCatalog } from "../types/client";

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
  const torahPortionEnabled = child.inspirationSettings?.enabledSourceIds.includes("inspiration_source_sefaria_weekly_torah") ?? false;
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
        <div className="flex shrink-0 items-center gap-2">
          {torahPortionEnabled ? (
            <span
              aria-label="Weekly Torah portion enabled"
              className="grid h-9 w-9 place-items-center rounded-full border border-moon-200 bg-moon-50 text-moss-700 dark:border-white/10 dark:bg-white/8 dark:text-moon-200"
              title="Weekly Torah portion enabled"
            >
              <ScrollText size={17} />
            </span>
          ) : null}
          <StatusBadge status={child.worldBuildStatus === "READY" ? "READY" : "GENERATING"} />
        </div>
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
  const [parentNotes, setParentNotes] = useState(child.parentNotes);
  const [enabledSourceIds, setEnabledSourceIds] = useState<string[]>(child.inspirationSettings?.enabledSourceIds ?? []);
  const [enabledThemeIds, setEnabledThemeIds] = useState<string[]>(child.inspirationSettings?.enabledThemeIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inspirationResource = useAsyncResource(async () => {
    const [catalog, settings] = await Promise.all([
      apiClient.getInspirationCatalog(),
      apiClient.getChildInspirationSettings(child.id),
    ]);
    return { catalog, settings };
  }, [child.id]);

  useEffect(() => {
    if (inspirationResource.status !== "success") return;
    setEnabledSourceIds(inspirationResource.data.settings.enabledSourceIds);
    setEnabledThemeIds(inspirationResource.data.settings.enabledThemeIds);
    setParentNotes(inspirationResource.data.settings.parentNotes);
  }, [inspirationResource.status, inspirationResource.data]);

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-moss-900/40 p-3 sm:p-4" onMouseDown={onClose} role="dialog">
      <div className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)] dark:bg-slate-950" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-moon-100 p-4 sm:p-5 dark:border-white/10">
          <div>
            <h2 className="text-xl font-black text-moss-900 dark:text-white">Edit {label}</h2>
            <p className="mt-1 text-sm text-moss-700 dark:text-slate-300">Update the profile details used for future stories.</p>
          </div>
          <button aria-label="Close child editor" className="grid h-10 w-10 place-items-center rounded-full hover:bg-moon-50 dark:hover:bg-white/8" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-4">
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
          <StoryInspirationEditor
            catalog={inspirationResource.status === "success" ? inspirationResource.data.catalog : null}
            enabledSourceIds={enabledSourceIds}
            enabledThemeIds={enabledThemeIds}
            error={inspirationResource.status === "error" ? inspirationResource.error : null}
            loading={inspirationResource.status === "loading"}
            onSourcesChange={setEnabledSourceIds}
            onThemesChange={setEnabledThemeIds}
            parentNotes={parentNotes}
            onParentNotesChange={setParentNotes}
          />
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-petal-500">{error.message}</p> : null}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-moon-100 p-4 sm:p-5 dark:border-white/10">
          <Button onClick={onClose} type="button" variant="ghost">Cancel</Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void Promise.all([
                apiClient.updateChild(child.id, {
                  firstName,
                  birthDate: birthDate || null,
                  ageRange,
                  readingLevel: readingLevel || null,
                  optionalParentNotes: parentNotes.trim() || null,
                }),
                inspirationResource.status === "success"
                  ? apiClient.updateChildInspirationSettings(child.id, {
                    enabledSourceIds,
                    enabledThemeIds,
                    parentNotes: parentNotes.trim() || null,
                  })
                  : Promise.resolve(),
              ])
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

function StoryInspirationEditor({
  catalog,
  enabledSourceIds,
  enabledThemeIds,
  error,
  loading,
  onParentNotesChange,
  onSourcesChange,
  onThemesChange,
  parentNotes,
}: {
  catalog: StoryInspirationCatalog | null;
  enabledSourceIds: string[];
  enabledThemeIds: string[];
  error: Error | null;
  loading: boolean;
  onParentNotesChange: (value: string) => void;
  onSourcesChange: (value: string[]) => void;
  onThemesChange: (value: string[]) => void;
  parentNotes: string;
}) {
  return (
    <div className="rounded-xl border border-moon-200 p-4 dark:border-white/10">
      <h3 className="text-sm font-black text-moss-900 dark:text-white">Story inspiration</h3>
      <p className="mt-1 text-sm leading-6 text-moss-700 dark:text-slate-300">
        Choose reusable inspiration sources and themes for future stories.
      </p>

      {loading ? <p className="mt-3 text-sm font-semibold text-moss-700 dark:text-slate-300">Loading inspiration settings…</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-petal-500">{error.message}</p> : null}

      {catalog ? (
        <div className="mt-4 grid gap-4">
          <Field hint="Sources can be calendars, curated collections, family milestones, or other future providers." label="Enabled sources">
            <ChipGroup
              items={catalog.sources.map((source) => ({
                id: source.id,
                label: source.label,
                disabled: source.status !== "ACTIVE",
              }))}
              selectedIds={enabledSourceIds}
              onChange={onSourcesChange}
            />
          </Field>
          <Field hint="Themes guide the tone and message without making stories feel canned." label="Allowed themes">
            <ChipGroup
              items={catalog.themes.filter((theme) => theme.enabled).map((theme) => ({ id: theme.id, label: theme.label }))}
              selectedIds={enabledThemeIds}
              onChange={onThemesChange}
            />
          </Field>
        </div>
      ) : null}

      <div className="mt-4">
      <Field hint="Optional guidance for future episodes." label="Notes">
        <Textarea
          className="min-h-24"
          onChange={(event) => onParentNotesChange(event.target.value)}
          placeholder="Favorite themes, gentle reminders, new interests, or things to avoid."
          value={parentNotes}
        />
      </Field>
      </div>
    </div>
  );
}

function ChipGroup({
  items,
  onChange,
  selectedIds,
}: {
  items: Array<{ id: string; label: string; disabled?: boolean }>;
  onChange: (ids: string[]) => void;
  selectedIds: string[];
}) {
  if (items.length === 0) return <p className="text-sm text-moss-700 dark:text-slate-300">No options configured yet.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <button
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? "border-moss-700 bg-moss-700 text-white dark:border-moss-300 dark:bg-moss-300 dark:text-slate-950"
                : "border-moon-200 bg-white text-moss-800 hover:border-moon-400 dark:border-white/15 dark:bg-white/8 dark:text-slate-100"
            }`}
            disabled={item.disabled}
            key={item.id}
            onClick={() => onChange(selected ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id])}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
