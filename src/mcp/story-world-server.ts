import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { dashboardData, moonlightForest } from "../lib/mock-data";

interface StoryWorldProvider {
  universe(): unknown;
  lockedCast(childId: string): unknown;
  characterProfile(characterId: string): unknown;
  generationContext(bookIssueId: string): unknown;
}

class MockStoryWorldProvider implements StoryWorldProvider {
  universe() {
    return moonlightForest;
  }

  lockedCast(childId: string) {
    if (childId !== dashboardData.child.id) return { childId, selectedCharacters: [] };
    return {
      childId,
      selectedCharacters: dashboardData.child.selectedCharacters,
      lockedAt: dashboardData.child.charactersLockedAt,
    };
  }

  characterProfile(characterId: string) {
    const character = moonlightForest.characters.find((candidate) => candidate.id === characterId);
    if (!character) return { characterId, found: false };
    return {
      ...character,
      found: true,
      publicProfileImages: character.profileImages,
      hiddenStyleReferencePointers: character.hiddenStyleReferenceIds,
    };
  }

  generationContext(bookIssueId: string) {
    const issue = dashboardData.books.find((candidate) => candidate.id === bookIssueId);
    return {
      issue,
      universe: moonlightForest,
      child: {
        id: dashboardData.child.id,
        ageRange: dashboardData.child.ageRange,
        storyGenres: dashboardData.child.storyGenres,
        interests: dashboardData.child.interests,
      },
      lockedCast: dashboardData.child.selectedCharacters,
      characterProfiles: dashboardData.child.selectedCharacters.map((member) => this.characterProfile(member.characterId)),
      recentEpisodes: dashboardData.books.map((book) => ({
        id: book.id,
        episodeNumber: book.episodeNumber,
        title: book.title,
        summary: book.summary,
      })),
    };
  }
}

const provider = new MockStoryWorldProvider();
const server = new McpServer({ name: "little-world-story-context", version: "0.1.0" });

server.registerTool(
  "get_universe_catalog",
  {
    title: "Get universe catalog",
    description: "Returns the active story universe, characters, locations, and visual metadata.",
    inputSchema: {},
  },
  async () => jsonResult(provider.universe())
);

server.registerTool(
  "get_locked_child_cast",
  {
    title: "Get locked child cast",
    description: "Returns the immutable selected cast and main character assignment for a child.",
    inputSchema: { childId: z.string().min(1) },
  },
  async ({ childId }) => jsonResult(provider.lockedCast(childId))
);

server.registerTool(
  "get_character_profile",
  {
    title: "Get character profile",
    description: "Returns public character profile data and hidden R2 style-reference pointers for illustration consistency.",
    inputSchema: { characterId: z.string().min(1) },
  },
  async ({ characterId }) => jsonResult(provider.characterProfile(characterId))
);

server.registerTool(
  "get_generation_context",
  {
    title: "Get generation context",
    description: "Returns compact context needed by story-writing and illustration agents for one book issue.",
    inputSchema: { bookIssueId: z.string().min(1) },
  },
  async ({ bookIssueId }) => jsonResult(provider.generationContext(bookIssueId))
);

async function main() {
  await server.connect(new StdioServerTransport());
}

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
