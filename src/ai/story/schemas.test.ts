import { describe, expect, it } from "vitest";
import { storyManuscriptSchema, storyOutlineSchema } from "./schemas";

describe("story schemas", () => {
  it("accepts a valid outline", () => {
    expect(
      storyOutlineSchema.parse({
        title: "Pip Tries Again",
        premise: "Pip practices a hard thing with friends.",
        featuredCharacterIds: ["character_pip"],
        theme: "Trying again",
        continuityReferences: [],
        beats: [{ order: 1, description: "Pip finds a problem." }]
      }).title
    ).toBe("Pip Tries Again");
  });

  it("rejects manuscripts outside the page target", () => {
    expect(() => storyManuscriptSchema.parse({ title: "Too Short", pages: [] })).toThrow();
  });
});
