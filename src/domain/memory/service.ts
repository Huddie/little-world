import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";
import type { StoryMemoryContext } from "../../ai/story/schemas";
import type { Db } from "../../server/db/client";
import {
  bookPages,
  characterImageMemories,
  characterProfileMemories,
  characterRelationshipMemories,
  memoryEmbeddings,
  memoryEventEntities,
  memoryEvents,
} from "../../server/db/schema";
import { newId, stableHash } from "../ids";

export const memoryEntityTypes = ["CHARACTER", "SOURCE_CHARACTER", "LOCATION", "CHILD", "UNIVERSE", "RELATIONSHIP"] as const;
export const memoryScopes = ["GLOBAL", "CHILD", "SHARED"] as const;

export const extractedMemorySchema = z.object({
  episodeSummary: z.string().min(1),
  canonEvents: z.array(z.object({
    eventType: z.string().min(1),
    summary: z.string().min(1),
    importance: z.number().int().min(1).max(5),
  })).default([]),
  memoryEvents: z.array(z.object({
    scope: z.enum(memoryScopes).default("CHILD"),
    eventType: z.string().min(1),
    summary: z.string().min(1),
    importance: z.number().int().min(1).max(5),
    confidence: z.number().int().min(1).max(5).default(3),
    storyTime: z.string().nullable().optional(),
    entities: z.array(z.object({
      entityType: z.enum(memoryEntityTypes),
      entityId: z.string().min(1),
    })).default([]),
  })).default([]),
  characterProfileMemories: z.array(z.object({
    characterId: z.string().min(1),
    memoryType: z.string().min(1),
    summary: z.string().min(1),
    importance: z.number().int().min(1).max(5),
  })).default([]),
  characterRelationshipMemories: z.array(z.object({
    characterAId: z.string().min(1),
    characterBId: z.string().min(1),
    relationshipType: z.string().min(1),
    summary: z.string().min(1),
    firstMetAtStoryTime: z.string().nullable().optional(),
    importance: z.number().int().min(1).max(5),
  })).default([]),
  imageMemoryCandidates: z.array(z.object({
    characterId: z.string().min(1),
    pageNumber: z.number().int().positive(),
    caption: z.string().min(1),
    importance: z.number().int().min(1).max(5),
    reason: z.string().min(1),
  })).default([]),
});

export type ExtractedMemory = z.infer<typeof extractedMemorySchema>;

export type MemoryRetrievalInput = {
  childId: string;
  universeId: string;
  characterIds: string[];
  sourceCharacterIds: string[];
  semanticMatches?: Map<string, number>;
};

type MemoryEventRow = typeof memoryEvents.$inferSelect;

export function rankMemoryEvents(
  events: MemoryEventRow[],
  input: Pick<MemoryRetrievalInput, "characterIds" | "sourceCharacterIds" | "semanticMatches">,
  eventEntityIds: Map<string, Set<string>>
) {
  const relevantEntityIds = new Set([...input.characterIds, ...input.sourceCharacterIds]);
  return [...events]
    .map((event) => {
      const entities = eventEntityIds.get(event.id) ?? new Set<string>();
      const entityBoost = [...entities].some((entityId) => relevantEntityIds.has(entityId)) ? 20 : 0;
      const semanticBoost = Math.round((input.semanticMatches?.get(event.id) ?? 0) * 20);
      return { event, score: event.importance * 10 + event.confidence * 2 + entityBoost + semanticBoost };
    })
    .sort((left, right) => right.score - left.score || right.event.createdAt.localeCompare(left.event.createdAt))
    .map(({ event }) => event);
}

export async function retrieveStoryMemory(db: Db, input: MemoryRetrievalInput): Promise<StoryMemoryContext> {
  const candidateEvents = await db
    .select()
    .from(memoryEvents)
    .where(and(eq(memoryEvents.universeId, input.universeId), or(eq(memoryEvents.childId, input.childId), isNull(memoryEvents.childId))))
    .orderBy(desc(memoryEvents.importance), desc(memoryEvents.createdAt))
    .limit(80);

  const eventIds = candidateEvents.map((event) => event.id);
  const entities = eventIds.length > 0
    ? await db.select().from(memoryEventEntities).where(inArray(memoryEventEntities.memoryEventId, eventIds))
    : [];
  const entityIdsByEvent = new Map<string, Set<string>>();
  for (const entity of entities) {
    entityIdsByEvent.set(entity.memoryEventId, new Set([...(entityIdsByEvent.get(entity.memoryEventId) ?? []), entity.entityId]));
  }

  const rankedEvents = rankMemoryEvents(candidateEvents, input, entityIdsByEvent).slice(0, 16);
  const profiles = await db
    .select()
    .from(characterProfileMemories)
    .where(and(eq(characterProfileMemories.childId, input.childId), inArray(characterProfileMemories.characterId, input.characterIds)))
    .orderBy(desc(characterProfileMemories.importance), desc(characterProfileMemories.createdAt))
    .limit(24);
  const relationships = await db
    .select()
    .from(characterRelationshipMemories)
    .where(eq(characterRelationshipMemories.childId, input.childId))
    .orderBy(desc(characterRelationshipMemories.importance), desc(characterRelationshipMemories.createdAt))
    .limit(24);
  const images = input.characterIds.length > 0
    ? await db
      .select()
      .from(characterImageMemories)
      .where(and(eq(characterImageMemories.childId, input.childId), eq(characterImageMemories.active, true), inArray(characterImageMemories.characterId, input.characterIds)))
      .orderBy(desc(characterImageMemories.importance), desc(characterImageMemories.createdAt))
      .limit(24)
    : [];

  return {
    importantEvents: rankedEvents.map((event) => ({
      id: event.id,
      scope: event.scope,
      eventType: event.eventType,
      summary: event.summary,
      importance: event.importance,
      entityIds: [...(entityIdsByEvent.get(event.id) ?? new Set<string>())],
    })),
    characterHistories: profiles.slice(0, 12).map((memory) => ({
      id: memory.id,
      characterId: memory.characterId,
      memoryType: memory.memoryType,
      summary: memory.summary,
      importance: memory.importance,
    })),
    relationshipHistories: relationships
      .filter((memory) => input.characterIds.includes(memory.characterAId) || input.characterIds.includes(memory.characterBId))
      .slice(0, 12)
      .map((memory) => ({
        id: memory.id,
        characterAId: memory.characterAId,
        characterBId: memory.characterBId,
        relationshipType: memory.relationshipType,
        summary: memory.summary,
        importance: memory.importance,
      })),
    visualMemories: images.map((image) => ({
      id: image.id,
      characterId: image.characterId,
      assetId: image.assetId,
      caption: image.caption,
      importance: image.importance,
    })),
  };
}

export function buildMemoryRetrievalQuery(input: {
  childAgeRange: string;
  universeName: string;
  characterNames: string[];
  interests: string[];
  recentSummaries: Array<{ summary: string }>;
}) {
  return [
    `Universe: ${input.universeName}`,
    `Age range: ${input.childAgeRange}`,
    `Cast: ${input.characterNames.join(", ")}`,
    `Interests: ${input.interests.join(", ") || "none"}`,
    `Recent episodes: ${input.recentSummaries.map((summary) => summary.summary).join(" ") || "none"}`,
  ].join("\n");
}

export async function persistExtractedMemory(input: {
  db: Db;
  extraction: ExtractedMemory;
  childId: string;
  universeId: string;
  sourceBookIssueId?: string | null;
  validCharacterIds: string[];
  pageAssetIdsByNumber: Map<number, string>;
}) {
  const validCharacters = new Set(input.validCharacterIds);
  const memoryEventIds: string[] = [];
  const extractedEvents = input.extraction.memoryEvents.length > 0
    ? input.extraction.memoryEvents
    : input.extraction.canonEvents.map((event) => ({
      scope: "CHILD" as const,
      eventType: event.eventType,
      summary: event.summary,
      importance: event.importance,
      confidence: 3,
      storyTime: null,
      entities: [],
    }));

  for (const event of extractedEvents) {
    const scope = event.scope === "GLOBAL" && input.sourceBookIssueId ? "CHILD" : event.scope;
    const childId = scope === "GLOBAL" ? null : input.childId;
    const dedupeHash = stableHash(`${event.summary}:${event.entities.map((entity) => `${entity.entityType}:${entity.entityId}`).sort().join("|")}`);
    await input.db.insert(memoryEvents).values({
      id: newId("mem"),
      universeId: input.universeId,
      childId,
      sourceBookIssueId: input.sourceBookIssueId ?? null,
      scope,
      eventType: event.eventType,
      summary: event.summary,
      importance: event.importance,
      confidence: event.confidence,
      storyTime: event.storyTime ?? null,
      dedupeHash,
    }).onConflictDoNothing();

    const persisted = await input.db.query.memoryEvents.findFirst({
      where: and(
        eq(memoryEvents.universeId, input.universeId),
        childId ? eq(memoryEvents.childId, childId) : isNull(memoryEvents.childId),
        eq(memoryEvents.scope, scope),
        eq(memoryEvents.eventType, event.eventType),
        eq(memoryEvents.dedupeHash, dedupeHash)
      ),
    });
    if (!persisted) continue;
    memoryEventIds.push(persisted.id);
    for (const entity of event.entities) {
      if (entity.entityType === "CHARACTER" && !validCharacters.has(entity.entityId)) continue;
      await input.db.insert(memoryEventEntities).values({
        id: newId("mement"),
        memoryEventId: persisted.id,
        entityType: entity.entityType,
        entityId: entity.entityId,
      }).onConflictDoNothing();
    }
  }

  for (const profile of input.extraction.characterProfileMemories) {
    if (!validCharacters.has(profile.characterId)) continue;
    await input.db.insert(characterProfileMemories).values({
      id: newId("memchar"),
      universeId: input.universeId,
      childId: input.childId,
      characterId: profile.characterId,
      sourceBookIssueId: input.sourceBookIssueId ?? null,
      memoryType: profile.memoryType,
      summary: profile.summary,
      importance: profile.importance,
      dedupeHash: stableHash(profile.summary),
    }).onConflictDoNothing();
  }

  for (const relationship of input.extraction.characterRelationshipMemories) {
    if (!validCharacters.has(relationship.characterAId) || !validCharacters.has(relationship.characterBId)) continue;
    if (relationship.characterAId === relationship.characterBId) continue;
    const [characterAId, characterBId] = canonicalCharacterPair(relationship.characterAId, relationship.characterBId);
    await input.db.insert(characterRelationshipMemories).values({
      id: newId("memrel"),
      universeId: input.universeId,
      childId: input.childId,
      characterAId,
      characterBId,
      sourceBookIssueId: input.sourceBookIssueId ?? null,
      relationshipType: relationship.relationshipType,
      summary: relationship.summary,
      firstMetAtStoryTime: relationship.firstMetAtStoryTime ?? null,
      importance: relationship.importance,
      dedupeHash: stableHash(relationship.summary),
    }).onConflictDoNothing();
  }

  let promotedImages = 0;
  for (const candidate of input.extraction.imageMemoryCandidates.filter((candidate) => candidate.importance >= 4)) {
    if (!validCharacters.has(candidate.characterId)) continue;
    const assetId = input.pageAssetIdsByNumber.get(candidate.pageNumber) ?? input.pageAssetIdsByNumber.get(candidate.pageNumber + 1);
    if (!assetId) continue;
    await input.db.insert(characterImageMemories).values({
      id: newId("memimg"),
      universeId: input.universeId,
      childId: input.childId,
      characterId: candidate.characterId,
      assetId,
      sourceBookIssueId: input.sourceBookIssueId ?? null,
      pageNumber: candidate.pageNumber,
      memoryEventId: memoryEventIds[0] ?? null,
      caption: candidate.caption,
      importance: candidate.importance,
    }).onConflictDoNothing();
    promotedImages += 1;
  }

  return {
    memoryEventIds,
    memoryEvents: memoryEventIds.length,
    characterProfiles: input.extraction.characterProfileMemories.length,
    relationships: input.extraction.characterRelationshipMemories.length,
    promotedImages,
  };
}

export async function pageAssetIdsByNumber(db: Db, bookId: string) {
  const pages = await db.select().from(bookPages).where(eq(bookPages.bookId, bookId));
  return new Map(
    pages
      .filter((page) => page.illustrationAssetId)
      .map((page) => [page.pageNumber, page.illustrationAssetId as string])
  );
}

export type EmbeddingClient = {
  embed(input: string): Promise<number[]>;
  model: string;
  dimensions: number;
};

export class OpenAiEmbeddingClient implements EmbeddingClient {
  private readonly client: OpenAI;
  readonly model: string;
  readonly dimensions: number;

  constructor(apiKey: string, model = "text-embedding-3-small", dimensions = 1536) {
    this.client = new OpenAI({ apiKey, maxRetries: 2, timeout: 60_000 });
    this.model = model;
    this.dimensions = dimensions;
  }

  async embed(input: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input,
      dimensions: this.dimensions,
    });
    return response.data[0]?.embedding ?? [];
  }
}

export async function semanticMemoryMatches(input: {
  index?: VectorizeIndex;
  embedder?: EmbeddingClient;
  query: string;
  childId: string;
  universeId: string;
}) {
  if (!input.index || !input.embedder) return new Map<string, number>();
  const embedding = await input.embedder.embed(input.query);
  if (embedding.length === 0) return new Map<string, number>();
  const matches = await input.index.query(embedding, {
    topK: 16,
    returnMetadata: "all",
    filter: { universeId: input.universeId },
  });
  return new Map(
    matches.matches
      .filter((match) => match.metadata?.recordType === "memory_event")
      .filter((match) => match.metadata?.childId === input.childId || match.metadata?.childId === "GLOBAL")
      .map((match) => [String(match.metadata?.recordId ?? match.id), match.score])
  );
}

export async function syncMemoryEmbeddings(input: {
  db: Db;
  index?: VectorizeIndex;
  embedder?: EmbeddingClient;
  childId: string;
  universeId: string;
  sourceBookIssueId?: string;
  recordIds?: string[];
}) {
  if (!input.index || !input.embedder) return { embedded: 0, skipped: true };
  const events = input.recordIds && input.recordIds.length > 0
    ? await input.db.select().from(memoryEvents).where(inArray(memoryEvents.id, input.recordIds))
    : input.sourceBookIssueId
      ? await input.db.select().from(memoryEvents).where(eq(memoryEvents.sourceBookIssueId, input.sourceBookIssueId))
      : [];
  let embedded = 0;
  for (const event of events) {
    const content = `${event.eventType}: ${event.summary}`;
    const contentHash = stableHash(content);
    const vectorId = `memory_event:${event.id}`;
    const embedding = await input.embedder.embed(content);
    await input.index.upsert([{
      id: vectorId,
      values: embedding,
      metadata: {
        recordType: "memory_event",
        recordId: event.id,
        childId: event.childId ?? "GLOBAL",
        universeId: event.universeId,
        scope: event.scope,
        importance: event.importance,
        createdAt: event.createdAt,
      },
    }]);
    await input.db.insert(memoryEmbeddings).values({
      id: newId("emb"),
      recordType: "memory_event",
      recordId: event.id,
      vectorId,
      model: input.embedder.model,
      dimensions: input.embedder.dimensions,
      contentHash,
      status: "SYNCED",
    }).onConflictDoUpdate({
      target: [memoryEmbeddings.recordType, memoryEmbeddings.recordId],
      set: {
        vectorId,
        model: input.embedder.model,
        dimensions: input.embedder.dimensions,
        contentHash,
        status: "SYNCED",
        lastError: null,
        updatedAt: new Date().toISOString(),
      },
    });
    embedded += 1;
  }
  return { embedded, skipped: false };
}

function canonicalCharacterPair(left: string, right: string): [string, string] {
  return left.localeCompare(right) <= 0 ? [left, right] : [right, left];
}
