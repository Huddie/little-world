import { Archive, Baby, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusBadge } from "../components/ui/StatusBadge";
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
          {activeChildren.map((child) => <ChildCard child={child} key={child.id} onChanged={children.reload} />)}
        </div>
      )}
    </div>
  );
}

function ChildCard({ child, onChanged }: { child: ChildSummary; onChanged: () => void }) {
  const label = child.firstName || `Ages ${child.ageRange}`;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-moon-100 text-moss-700">
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
    </Card>
  );
}
