import { describe, expect, it } from "vitest";
import { nextIssueDate } from "./schedule";

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
