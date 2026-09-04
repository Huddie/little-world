import { and, desc, eq, inArray, max } from "drizzle-orm";
import type { Db } from "../../server/db/client";
import { bookIssues, bookPages, books, deliveries, episodeSummaries, products, subscriptions } from "../../server/db/schema";
import type { BookIssueStatus } from "../types";
import { newId } from "../ids";

export async function listBooksForUser(db: Db, userId: string) {
  return db
    .select({
      issue: bookIssues,
      book: books,
      subscription: subscriptions
    })
    .from(bookIssues)
    .innerJoin(subscriptions, eq(subscriptions.id, bookIssues.subscriptionId))
    .leftJoin(books, eq(books.bookIssueId, bookIssues.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(bookIssues.episodeNumber));
}

export async function getBookDetailForUser(db: Db, userId: string, bookIssueId: string) {
  const record = await db
    .select({ issue: bookIssues, book: books, subscription: subscriptions })
    .from(bookIssues)
    .innerJoin(subscriptions, eq(subscriptions.id, bookIssues.subscriptionId))
    .leftJoin(books, eq(books.bookIssueId, bookIssues.id))
    .where(and(eq(bookIssues.id, bookIssueId), eq(subscriptions.userId, userId)))
    .get();
  if (!record) throw new Response("Book not found", { status: 404 });
  const pages = record.book ? await db.select().from(bookPages).where(eq(bookPages.bookId, record.book.id)) : [];
  const deliveryRows = await db.select().from(deliveries).where(eq(deliveries.bookIssueId, bookIssueId));
  return { ...record, pages, deliveries: deliveryRows };
}

export async function createBookIssueForSubscription(db: Db, subscriptionId: string, scheduledFor: Date, childId?: string) {
  const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!subscription) throw new Error(`Subscription ${subscriptionId} not found`);
  const product = await db.query.products.findFirst({ where: eq(products.id, subscription.productId) });
  if (!product) throw new Error(`Product ${subscription.productId} not found`);
  const targetChildId = childId ?? subscription.childId;

  const current = await db.select({ value: max(bookIssues.episodeNumber) }).from(bookIssues).where(and(eq(bookIssues.subscriptionId, subscriptionId), eq(bookIssues.childId, targetChildId))).get();
  const episodeNumber = (current?.value ?? 0) + 1;
  const scheduled = scheduledFor.toISOString();
  const id = newId("issue");

  await db
    .insert(bookIssues)
    .values({
      id,
      subscriptionId,
      childId: targetChildId,
      universeId: product.universeId,
      episodeNumber,
      scheduledFor: scheduled,
      status: "SCHEDULED"
    })
    .onConflictDoNothing();

  const issue = await db.query.bookIssues.findFirst({
    where: and(eq(bookIssues.subscriptionId, subscriptionId), eq(bookIssues.childId, targetChildId), eq(bookIssues.scheduledFor, scheduled))
  });
  if (!issue) throw new Error("Failed to create or load book issue");
  return issue;
}

export async function setBookIssueStatus(db: Db, bookIssueId: string, status: BookIssueStatus, lastError?: string) {
  await db
    .update(bookIssues)
    .set({
      status,
      lastError: lastError ?? null,
      updatedAt: new Date().toISOString(),
      generationStartedAt: status === "GENERATING" ? new Date().toISOString() : undefined,
      readyAt: status === "READY" ? new Date().toISOString() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date().toISOString() : undefined
    })
    .where(eq(bookIssues.id, bookIssueId));
}

export async function claimBookIssueForGeneration(db: Db, bookIssueId: string) {
  const now = new Date().toISOString();
  const generationRunId = newId("run");
  const result = await db
    .update(bookIssues)
    .set({
      status: "GENERATING",
      lastError: null,
      generationStartedAt: now,
      generationRunId,
      updatedAt: now,
    })
    .where(and(eq(bookIssues.id, bookIssueId), inArray(bookIssues.status, ["SCHEDULED", "FAILED"])));
  return result.meta.changes > 0 ? { claimed: true as const, claimedAt: now, generationRunId } : { claimed: false as const, claimedAt: null, generationRunId: null };
}

export async function failClaimedBookIssue(db: Db, bookIssueId: string, claimedAt: string | null, lastError: string, generationRunId?: string | null) {
  if (!claimedAt) return;
  const tokenCondition = generationRunId
    ? and(eq(bookIssues.generationStartedAt, claimedAt), eq(bookIssues.generationRunId, generationRunId))
    : eq(bookIssues.generationStartedAt, claimedAt);
  await db
    .update(bookIssues)
    .set({
      status: "FAILED",
      lastError,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(bookIssues.id, bookIssueId), tokenCondition));
}

export async function listEpisodeSummaries(db: Db, childId: string, universeId: string, limit = 5) {
  return db
    .select()
    .from(episodeSummaries)
    .where(and(eq(episodeSummaries.childId, childId), eq(episodeSummaries.universeId, universeId)))
    .orderBy(desc(episodeSummaries.episodeNumber))
    .limit(limit);
}
