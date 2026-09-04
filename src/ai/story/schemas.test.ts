import { describe, expect, it } from "vitest";
import { canonExtractionSchema, storyManuscriptSchema, storyOutlineSchema } from "./schemas";

describe("story schemas", () => {
  it("accepts a valid outline", () => {
    expect(
      storyOutlineSchema.parse({
        title: "Pip Tries Again",
        premise: "Pip practices a hard thing with friends.",
        featuredCharacterIds: ["character_pip"],
        theme: "Trying again",
        continuityReferences: [{ memoryId: "mem_1", entityIds: ["character_pip"], purpose: "Callback" }],
        beats: [{ order: 1, description: "Pip finds a problem." }]
      }).title
    ).toBe("Pip Tries Again");
  });

  it("rejects manuscripts outside the page target", () => {
    expect(() => storyManuscriptSchema.parse({ title: "Too Short", pages: [] })).toThrow();
  });

  it("accepts structured memory extraction", () => {
    const parsed = canonExtractionSchema.parse({
      episodeSummary: "Pip and Milo found the bell path.",
      memoryEvents: [{
        scope: "CHILD",
        eventType: "DISCOVERY",
        summary: "Pip and Milo found the bell path near Pebble Bridge.",
        importance: 4,
        confidence: 4,
        entities: [{ entityType: "CHARACTER", entityId: "character_pip" }]
      }],
      characterProfileMemories: [{
        characterId: "character_pip",
        memoryType: "COURAGE",
        summary: "Pip can be brave when solving small clues.",
        importance: 3
      }],
      characterRelationshipMemories: [],
      imageMemoryCandidates: [{
        characterId: "character_pip",
        pageNumber: 2,
        caption: "Pip holding the tiny bell map.",
        importance: 4,
        reason: "Useful recurring visual clue."
      }]
    });

    expect(parsed.memoryEvents[0]?.entities[0]?.entityId).toBe("character_pip");
  });
});
