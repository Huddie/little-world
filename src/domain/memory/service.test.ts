import { describe, expect, it } from "vitest";
import { buildMemoryRetrievalQuery, rankMemoryEvents } from "./service";

const baseEvent = {
  universeId: "universe_1",
  childId: "child_1",
  sourceBookIssueId: "issue_1",
  scope: "CHILD",
  eventType: "DISCOVERY",
  summary: "A memory.",
  confidence: 3,
  storyTime: null,
  dedupeHash: "hash",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("story memory service", () => {
  it("boosts memories linked to the active cast", () => {
    const events = [
      { ...baseEvent, id: "mem_unrelated", importance: 5, createdAt: "2026-01-02T00:00:00.000Z" },
      { ...baseEvent, id: "mem_cast", importance: 4, createdAt: "2026-01-01T00:00:00.000Z" },
    ];
    const entities = new Map([
      ["mem_unrelated", new Set(["character_other"])],
      ["mem_cast", new Set(["character_pip"])],
    ]);

    expect(rankMemoryEvents(events, { characterIds: ["character_pip"], sourceCharacterIds: [], semanticMatches: new Map() }, entities)[0]?.id).toBe("mem_cast");
  });

  it("uses semantic score as a retrieval boost", () => {
    const events = [
      { ...baseEvent, id: "mem_low", importance: 2, createdAt: "2026-01-01T00:00:00.000Z" },
      { ...baseEvent, id: "mem_semantic", importance: 1, createdAt: "2026-01-01T00:00:00.000Z" },
    ];

    expect(rankMemoryEvents(events, { characterIds: [], sourceCharacterIds: [], semanticMatches: new Map([["mem_semantic", 0.95]]) }, new Map())[0]?.id).toBe("mem_semantic");
  });

  it("builds compact semantic retrieval text", () => {
    expect(buildMemoryRetrievalQuery({
      childAgeRange: "4-5",
      universeName: "Moonlight Forest",
      characterNames: ["Pip", "Milo"],
      interests: ["maps"],
      recentSummaries: [{ summary: "Pip found a bridge." }],
    })).toContain("Pip found a bridge.");
  });
});
