import { describe, expect, it } from "vitest";
import { stableHash } from "./ids";

describe("stableHash", () => {
  it("normalizes case and whitespace", () => {
    expect(stableHash(" Pip learned bravery. ")).toBe(stableHash("pip learned bravery."));
  });

  it("distinguishes different summaries", () => {
    expect(stableHash("Pip crossed the bridge.")).not.toBe(stableHash("Milo crossed the bridge."));
  });
});
