import type { BookIssueStatus, DeliveryAvailability, SubscriptionStatus, WorkflowStepStatus } from "../../types/client";

type Status = BookIssueStatus | SubscriptionStatus | WorkflowStepStatus | DeliveryAvailability | "PASS" | "REVIEW" | "FAIL";

const toneByStatus: Record<Status, string> = {
  ACTIVE: "bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100",
  PAUSED: "bg-honey-100 text-moss-900 dark:bg-honey-300/18 dark:text-honey-100",
  CANCELLED: "bg-petal-100 text-petal-500 dark:bg-petal-300/18 dark:text-petal-100",
  SCHEDULED: "bg-moon-100 text-moon-900 dark:bg-moon-300/18 dark:text-moon-100",
  GENERATING: "bg-honey-100 text-moss-900 dark:bg-honey-300/18 dark:text-honey-100",
  QA: "bg-honey-100 text-moss-900 dark:bg-honey-300/18 dark:text-honey-100",
  READY: "bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100",
  DELIVERY_PENDING: "bg-honey-100 text-moss-900 dark:bg-honey-300/18 dark:text-honey-100",
  DELIVERED: "bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100",
  FAILED: "bg-petal-100 text-petal-500 dark:bg-petal-300/18 dark:text-petal-100",
  COMPLETE: "bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100",
  CURRENT: "bg-honey-100 text-moss-900 dark:bg-honey-300/18 dark:text-honey-100",
  PENDING: "bg-moon-100 text-moon-900 dark:bg-moon-300/18 dark:text-moon-100",
  ENABLED: "bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100",
  COMING_SOON: "bg-moon-100 text-moon-900 dark:bg-moon-300/18 dark:text-moon-100",
  DISABLED: "bg-petal-100 text-petal-500 dark:bg-petal-300/18 dark:text-petal-100",
  PASS: "bg-moss-100 text-moss-900 dark:bg-moss-300/18 dark:text-moss-100",
  REVIEW: "bg-honey-100 text-moss-900 dark:bg-honey-300/18 dark:text-honey-100",
  FAIL: "bg-petal-100 text-petal-500 dark:bg-petal-300/18 dark:text-petal-100",
};

export function StatusBadge({ status }: { status: Status }) {
  const label = status.replaceAll("_", " ").toLowerCase();

  return (
    <span className={`inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold capitalize leading-none ${toneByStatus[status]}`}>
      {label}
    </span>
  );
}
