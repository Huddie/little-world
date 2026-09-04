import type { SubscriptionFrequency, Weekday } from "../types";

export function nextIssueDate(from: Date, frequency: SubscriptionFrequency): Date {
  if (frequency === "WEEKLY") return addDays(from, 7);
  if (frequency === "BIWEEKLY") return addDays(from, 14);
  return addMonthsClamped(from, 1);
}

export function generationDueAt(subscription: { nextIssueAt: string; generationLeadHours: number }) {
  return new Date(new Date(subscription.nextIssueAt).getTime() - subscription.generationLeadHours * 60 * 60 * 1000);
}

export function isGenerationDue(subscription: { nextIssueAt: string; generationLeadHours: number }, now: Date) {
  return generationDueAt(subscription).toISOString() <= now.toISOString();
}

export function nextScheduledDelivery(from: Date, frequency: SubscriptionFrequency, deliveryDayOfWeek: Weekday) {
  if (frequency === "MONTHLY") return nextMonthlyDelivery(from, deliveryDayOfWeek);
  const days = frequency === "WEEKLY" ? 7 : 14;
  const next = addDays(from, days);
  return alignToWeekday(next, deliveryDayOfWeek);
}

export function alignToWeekday(from: Date, deliveryDayOfWeek: Weekday) {
  const next = new Date(from);
  const diff = (deliveryDayOfWeek - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + diff);
  return next;
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

function nextMonthlyDelivery(from: Date, deliveryDayOfWeek: Weekday) {
  const target = new Date(from);
  target.setUTCMonth(target.getUTCMonth() + 1, 1);
  return alignToWeekday(target, deliveryDayOfWeek);
}
