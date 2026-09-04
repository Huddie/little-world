import type { SubscriptionFrequency } from "../types";

export function nextIssueDate(from: Date, frequency: SubscriptionFrequency): Date {
  if (frequency === "WEEKLY") return addDays(from, 7);
  if (frequency === "BIWEEKLY") return addDays(from, 14);
  return addMonthsClamped(from, 1);
}

function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonthsClamped(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const day = from.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds()));
}
