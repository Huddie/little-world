import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../../server/db/client";
import { children, relationships, users } from "../../server/db/schema";
import { newId } from "../ids";

export const inviteRelationshipInputSchema = z.object({
  childId: z.string().min(1),
  inviteeParentEmail: z.string().email(),
});

export async function inviteRelationship(db: Db, userId: string, input: z.infer<typeof inviteRelationshipInputSchema>) {
  const sourceChild = await db.query.children.findFirst({ where: and(eq(children.id, input.childId), eq(children.userId, userId)) });
  if (!sourceChild) throw new Response("Child not found", { status: 404 });

  const invitee = await db.query.users.findFirst({ where: eq(users.email, input.inviteeParentEmail.toLowerCase()) });
  if (!invitee || invitee.id === userId) throw new Response("Invitee not found", { status: 404 });

  const targetChild = await db.query.children.findFirst({ where: eq(children.userId, invitee.id), orderBy: (table, { desc }) => [desc(table.createdAt)] });
  if (!targetChild) throw new Response("Invitee has no child profile", { status: 404 });

  const [childAId, childBId] = canonicalPair(sourceChild.id, targetChild.id);
  await db.insert(relationships).values({
    id: newId("rel"),
    childAId,
    childBId,
    inviterUserId: userId,
    inviteeUserId: invitee.id,
    createdByUserId: userId,
    status: "PENDING",
  }).onConflictDoNothing();

  return listRelationshipsForUser(db, userId);
}

export async function updateRelationshipStatus(db: Db, userId: string, relationshipId: string, status: "ACTIVE" | "REJECTED" | "REMOVED") {
  const relationship = await db.query.relationships.findFirst({
    where: and(eq(relationships.id, relationshipId), or(eq(relationships.inviterUserId, userId), eq(relationships.inviteeUserId, userId)))
  });
  if (!relationship) throw new Response("Relationship not found", { status: 404 });
  if ((status === "ACTIVE" || status === "REJECTED") && relationship.inviteeUserId !== userId) {
    throw new Response("Only the invited parent can accept or reject", { status: 403 });
  }

  await db.update(relationships).set({
    status,
    acceptedAt: status === "ACTIVE" ? new Date().toISOString() : relationship.acceptedAt,
  }).where(eq(relationships.id, relationshipId));

  return listRelationshipsForUser(db, userId);
}

export async function listRelationshipsForUser(db: Db, userId: string) {
  const rows = await db
    .select({ relationship: relationships })
    .from(relationships)
    .where(or(eq(relationships.inviterUserId, userId), eq(relationships.inviteeUserId, userId)));

  return rows.map(({ relationship }) => ({
    id: relationship.id,
    status: relationship.status,
    direction: relationship.inviteeUserId === userId ? "INCOMING" : "OUTGOING",
    canAccept: relationship.inviteeUserId === userId && relationship.status === "PENDING",
    createdAt: relationship.createdAt,
    acceptedAt: relationship.acceptedAt,
  }));
}

export async function listActiveConnectedChildren(db: Db, childId: string) {
  const rows = await db
    .select()
    .from(relationships)
    .where(and(eq(relationships.status, "ACTIVE"), or(eq(relationships.childAId, childId), eq(relationships.childBId, childId))));

  return rows.map((relationship) => relationship.childAId === childId ? relationship.childBId : relationship.childAId);
}

function canonicalPair(left: string, right: string): [string, string] {
  return left.localeCompare(right) <= 0 ? [left, right] : [right, left];
}
