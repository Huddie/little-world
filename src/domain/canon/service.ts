import { and, desc, eq, or, isNull } from "drizzle-orm";
import type { Db } from "../../server/db/client";
import { canonEvents } from "../../server/db/schema";
import { newId, stableHash } from "../ids";

export async function relevantCanon(db: Db, childId: string, universeId: string, limit = 12) {
  return db
    .select()
    .from(canonEvents)
    .where(and(eq(canonEvents.universeId, universeId), or(eq(canonEvents.childId, childId), isNull(canonEvents.childId))))
    .orderBy(desc(canonEvents.importance), desc(canonEvents.createdAt))
    .limit(limit);
}

export async function addCanonEvents(
  db: Db,
  events: Array<{ universeId: string; childId: string | null; bookIssueId: string | null; eventType: string; summary: string; importance: number }>
) {
  for (const event of events) {
    await db
      .insert(canonEvents)
      .values({
        id: newId("canon"),
        universeId: event.universeId,
        childId: event.childId,
        bookIssueId: event.bookIssueId,
        eventType: event.eventType,
        summary: event.summary,
        summaryHash: stableHash(event.summary),
        importance: event.importance
      })
      .onConflictDoNothing();
  }
}
