import { CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react";
import type { WorkflowStep } from "../../types/client";
import { formatDateTime } from "../../lib/format";

const iconByStatus = {
  COMPLETE: CheckCircle2,
  CURRENT: LoaderCircle,
  PENDING: Circle,
  FAILED: XCircle,
};

export function WorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const Icon = iconByStatus[step.status];

        return (
          <div className="flex items-center gap-3" key={step.id}>
            <Icon
              className={step.status === "CURRENT" ? "animate-spin text-honey-500" : "text-moss-500"}
              size={18}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-moss-900">{step.label}</p>
              <p className="text-xs text-moss-700">{formatDateTime(step.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
