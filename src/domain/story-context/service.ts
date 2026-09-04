import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { z as zod } from "zod";
import type { StoryContext } from "../../ai/story/schemas";
import type { Env } from "../../server/env";
import { createDb, type Db } from "../../server/db/client";
import { bookIssues, characters, locations, storyExamples, universes, worldRules } from "../../server/db/schema";
import { listEpisodeSummaries } from "../books/service";
import { relevantCanon } from "../canon/service";
import { parseJson, stringArraySchema } from "../json";
import { resolveInspirationsForIssue } from "../inspirations/service";
import {
  buildMemoryRetrievalQuery,
  OpenAiEmbeddingClient,
  retrieveStoryMemory,
  semanticMemoryMatches,
} from "../memory/service";
import { listActiveConnectedChildren } from "../relationships/service";

export const selectedCharacterCastSchema = zod.array(zod.object({
  characterId: zod.string().min(1),
  sourceCharacterId: zod.string().min(1).nullable().optional(),
  displayName: zod.string().min(1),
  species: zod.string().nullable().optional(),
  description: zod.string().nullable().optional(),
  personality: zod.string().nullable().optional(),
  profileImageUrls: zod.array(zod.string()).optional(),
  imageStatus: zod.enum(["PENDING", "READY", "FAILED"]).optional(),
  role: zod.enum(["MAIN", "SUPPORTING"])
}));

export type SelectedCharacterCast = z.infer<typeof selectedCharacterCastSchema>;

export async function loadStoryContext(db: Db, bookIssueId: string, env?: Pick<Env, "OPENAI_API_KEY" | "OPENAI_EMBEDDING_DIMENSIONS" | "OPENAI_EMBEDDING_MODEL" | "STORY_MEMORY_INDEX">): Promise<StoryContext> {
  const issue = await db.query.bookIssues.findFirst({ where: (table, { eq: equals }) => equals(table.id, bookIssueId) });
  if (!issue) throw new Error(`Issue ${bookIssueId} not found`);
  const child = await db.query.children.findFirst({ where: (table, { eq: equals }) => equals(table.id, issue.childId), with: { preferences: true } });
  const universe = await db.query.universes.findFirst({ where: eq(universes.id, issue.universeId) });
  if (!child || !universe) throw new Error("Issue context is incomplete");

  const worldCharacters = await db.select().from(characters).where(and(eq(characters.universeId, universe.id), eq(characters.active, true)));
  const worldLocations = await db.select().from(locations).where(eq(locations.universeId, universe.id));
  const activeWorldRules = await db.select().from(worldRules).where(and(eq(worldRules.universeId, universe.id), eq(worldRules.active, true)));
  const selectedCast = parseJson(child.preferences?.selectedCharacterCastJson ?? "[]", selectedCharacterCastSchema);
  const canon = await relevantCanon(db, child.id, universe.id);
  const summaries = await listEpisodeSummaries(db, child.id, universe.id);
  const examples = await db.select().from(storyExamples).where(and(eq(storyExamples.universeId, universe.id), eq(storyExamples.active, true))).limit(16);
  const connectedChildIds = await listActiveConnectedChildren(db, child.id);
  const storyCharacters = resolveStoryCharacters(worldCharacters, selectedCast);
  const semanticMatches = await semanticMemoryMatches({
    ...(env?.STORY_MEMORY_INDEX ? { index: env.STORY_MEMORY_INDEX } : {}),
    ...(env?.OPENAI_API_KEY ? { embedder: new OpenAiEmbeddingClient(env.OPENAI_API_KEY, env.OPENAI_EMBEDDING_MODEL, Number(env.OPENAI_EMBEDDING_DIMENSIONS ?? 1536)) } : {}),
    childId: child.id,
    universeId: universe.id,
    query: buildMemoryRetrievalQuery({
      childAgeRange: child.ageRange,
      universeName: universe.name,
      characterNames: storyCharacters.map((character) => character.name),
      interests: parseJson(child.preferences?.interestsJson ?? "[]", stringArraySchema),
      recentSummaries: summaries,
    }),
  });
  const memory = await retrieveStoryMemory(db, {
    childId: child.id,
    universeId: universe.id,
    characterIds: storyCharacters.map((character) => character.id),
    sourceCharacterIds: storyCharacters.map((character) => character.sourceCharacterId).filter((id): id is string => Boolean(id)),
    semanticMatches,
  });
  const inspirations = await resolveInspirationsForIssue(db, bookIssueId);

  return {
    child,
    universe,
    locations: worldLocations.map((location) => ({
      id: location.id,
      name: location.name,
      description: location.description,
      canonicalPropertiesJson: location.canonicalPropertiesJson,
    })),
    worldRules: activeWorldRules.map((rule) => ({
      id: rule.id,
      category: rule.category,
      rule: rule.rule,
      rationale: rule.rationale,
    })),
    characters: storyCharacters,
    preferences: {
      interests: parseJson(child.preferences?.interestsJson ?? "[]", stringArraySchema),
      favoriteCharacterIds: parseJson(child.preferences?.favoriteCharacterIdsJson ?? "[]", stringArraySchema),
      mainCharacterId: child.preferences?.mainCharacterId ?? null,
      charactersLockedAt: child.preferences?.charactersLockedAt ?? null,
      storyGenres: parseJson(child.preferences?.storyGenresJson ?? "[]", stringArraySchema),
      optionalParentNotes: child.preferences?.optionalParentNotes ?? null
    },
    recentSummaries: summaries,
    storyExamples: examples.map((example) => ({
      title: example.title,
      ageRange: example.ageRange,
      genre: example.genre,
      summary: example.summary,
      beats: parseJson(example.storyBeatsJson, stringArraySchema),
      styleNotes: example.styleNotes
    })),
    canon,
    memory,
    inspirations,
    connectedWorlds: {
      probability: connectedChildIds.length > 0 ? 0.18 : 0,
      childIds: connectedChildIds
    },
  };
}

export async function loadStoryContextFromEnv(env: Env, bookIssueId: string) {
  return loadStoryContext(createDb(env.DB), bookIssueId, env);
}

function resolveStoryCharacters(
  worldCharacters: Array<{ id: string; name: string; description: string; personality: string; visualDescriptionJson: string; profileImagesJson: string; hiddenStyleReferencesJson: string }>,
  selectedCast: SelectedCharacterCast
): StoryContext["characters"] {
  const lockedCharacters: StoryContext["characters"] = [];
  for (const selected of selectedCast) {
    const character = worldCharacters.find((candidate) => candidate.id === (selected.sourceCharacterId ?? selected.characterId));
    if (!character) continue;
    lockedCharacters.push({
      id: selected.characterId,
      name: selected.displayName || character.name,
      sourceCharacterId: character.id,
      baseName: character.name,
      description: selected.description || character.description,
      personality: selected.personality || character.personality,
      visualDescriptionJson: character.visualDescriptionJson,
      profileImagesJson: JSON.stringify(selected.profileImageUrls ?? parseJson(character.profileImagesJson, stringArraySchema)),
      hiddenStyleReferencesJson: character.hiddenStyleReferencesJson,
      role: selected.role
    });
  }

  return lockedCharacters.length > 0
    ? lockedCharacters
    : worldCharacters.map((character, index) => ({
      ...character,
      sourceCharacterId: character.id,
      baseName: character.name,
      role: index === 0 ? "MAIN" : "SUPPORTING"
    }));
}
