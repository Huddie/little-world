import { describe, expect, it } from "vitest";
import { alignToWeekday, generationDueAt, isGenerationDue, nextIssueDate, nextScheduledDelivery } from "./schedule";

describe("nextIssueDate", () => {
  it("keeps monthly subscriptions on the same day when possible", () => {
    expect(nextIssueDate(new Date("2026-09-03T10:00:00.000Z"), "MONTHLY").toISOString()).toBe("2026-10-03T10:00:00.000Z");
  });

  it("clamps monthly subscriptions to the last valid day", () => {
    expect(nextIssueDate(new Date("2026-01-31T10:00:00.000Z"), "MONTHLY").toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });

  it("supports future weekly and biweekly frequencies", () => {
    expect(nextIssueDate(new Date("2026-09-03T00:00:00.000Z"), "WEEKLY").toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(nextIssueDate(new Date("2026-09-03T00:00:00.000Z"), "BIWEEKLY").toISOString()).toBe("2026-09-17T00:00:00.000Z");
  });
});

describe("delivery weekday scheduling", () => {
  it("aligns to the selected delivery weekday", () => {
    expect(alignToWeekday(new Date("2026-09-02T10:00:00.000Z"), 5).toISOString()).toBe("2026-09-04T10:00:00.000Z");
  });

  it("keeps weekly cadence while preserving delivery weekday", () => {
    expect(nextScheduledDelivery(new Date("2026-09-04T10:00:00.000Z"), "WEEKLY", 5).toISOString()).toBe("2026-09-11T10:00:00.000Z");
  });

  it("starts generation before delivery based on lead time", () => {
    const subscription = { nextIssueAt: "2026-09-04T10:00:00.000Z", generationLeadHours: 24 };
    expect(generationDueAt(subscription).toISOString()).toBe("2026-09-03T10:00:00.000Z");
    expect(isGenerationDue(subscription, new Date("2026-09-03T09:59:59.000Z"))).toBe(false);
    expect(isGenerationDue(subscription, new Date("2026-09-03T10:00:00.000Z"))).toBe(true);
  });
});
