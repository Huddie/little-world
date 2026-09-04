import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

type JsonValue = unknown;

class LiveStoryWorldProvider {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly sharedSecret: string
  ) {}

  catalog() {
    return this.get("/api/mcp/catalog");
  }

  generationContext(bookIssueId: string) {
    return this.get(`/api/mcp/generation-context/${encodeURIComponent(bookIssueId)}`);
  }

  inspirationCatalog() {
    return this.get("/api/mcp/inspirations/catalog");
  }

  inspirationsForDate(input: { date?: string }) {
    const params = new URLSearchParams();
    if (input.date) params.set("date", input.date);
    const query = params.toString();
    return this.get(`/api/mcp/inspirations/date${query ? `?${query}` : ""}`);
  }

  async lockedCast(bookIssueId: string) {
    const context = await this.generationContext(bookIssueId) as { child?: { id: string }, characters?: unknown[] };
    return {
      childId: context.child?.id ?? null,
      selectedCharacters: context.characters ?? [],
    };
  }

  async characterProfile(bookIssueId: string, characterId: string) {
    const context = await this.generationContext(bookIssueId) as { characters?: Array<{ id: string; sourceCharacterId?: string | null }> };
    const character = context.characters?.find((candidate) => candidate.id === characterId || candidate.sourceCharacterId === characterId);
    return character ? { ...character, found: true } : { characterId, found: false };
  }

  private async get(path: string): Promise<JsonValue> {
    const response = await fetch(new URL(path, this.apiBaseUrl), {
      headers: { authorization: `Bearer ${this.sharedSecret}` },
    });
    if (!response.ok) {
      throw new Error(`Little World API ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }
}

function createProvider() {
  const apiBaseUrl = process.env.LITTLE_WORLD_API_BASE_URL;
  const sharedSecret = process.env.LITTLE_WORLD_MCP_SHARED_SECRET;
  if (!apiBaseUrl || !sharedSecret) {
    throw new Error("Set LITTLE_WORLD_API_BASE_URL and LITTLE_WORLD_MCP_SHARED_SECRET before starting the Little World MCP server.");
  }
  return new LiveStoryWorldProvider(apiBaseUrl, sharedSecret);
}

const provider = createProvider();
const server = new McpServer({ name: "little-world-story-context", version: "0.2.0" });

server.registerTool(
  "get_universe_catalog",
  {
    title: "Get universe catalog",
    description: "Returns the live active story universe, curated characters, locations, world rules, products, and delivery options.",
    inputSchema: {},
  },
  async () => jsonResult(await provider.catalog())
);

server.registerTool(
  "get_locked_child_cast",
  {
    title: "Get locked child cast",
    description: "Returns the immutable selected cast and main character assignment for a book issue.",
    inputSchema: { bookIssueId: z.string().min(1) },
  },
  async ({ bookIssueId }) => jsonResult(await provider.lockedCast(bookIssueId))
);

server.registerTool(
  "get_character_profile",
  {
    title: "Get character profile",
    description: "Returns one live character profile from the generation context, including R2-backed reference pointers.",
    inputSchema: { bookIssueId: z.string().min(1), characterId: z.string().min(1) },
  },
  async ({ bookIssueId, characterId }) => jsonResult(await provider.characterProfile(bookIssueId, characterId))
);

server.registerTool(
  "get_generation_context",
  {
    title: "Get generation context",
    description: "Returns live context needed by story-writing and illustration agents for one book issue.",
    inputSchema: { bookIssueId: z.string().min(1) },
  },
  async ({ bookIssueId }) => jsonResult(await provider.generationContext(bookIssueId))
);

server.registerTool(
  "get_inspiration_catalog",
  {
    title: "Get inspiration catalog",
    description: "Returns generic Little World inspiration sources, curated themes, and mappings.",
    inputSchema: {},
  },
  async () => jsonResult(await provider.inspirationCatalog())
);

server.registerTool(
  "get_inspirations_for_date",
  {
    title: "Get inspirations for date",
    description: "Returns normalized story inspirations for a target delivery date.",
    inputSchema: { date: z.string().optional() },
  },
  async (input) => jsonResult(await provider.inspirationsForDate(input))
);

server.registerTool(
  "get_this_week_parsha",
  {
    title: "Get this week's parsha",
    description: "Convenience wrapper for the weekly Torah portion inspiration provider.",
    inputSchema: { date: z.string().optional() },
  },
  async (input) => jsonResult(await provider.inspirationsForDate(input))
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
