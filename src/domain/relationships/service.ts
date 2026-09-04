import { and, eq, isNotNull, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../../server/db/client";
import { children, relationships, users } from "../../server/db/schema";
import { newId } from "../ids";

export const inviteRelationshipInputSchema = z.object({
  childId: z.string().min(1),
  inviteeParentEmail: z.string().email(),
});

export const updateRelationshipStatusInputSchema = z.object({
  status: z.enum(["ACTIVE", "REJECTED", "REMOVED"]),
  childId: z.string().min(1).optional(),
});

export async function inviteRelationship(db: Db, userId: string, input: z.infer<typeof inviteRelationshipInputSchema>) {
  const sourceChild = await db.query.children.findFirst({ where: and(eq(children.id, input.childId), eq(children.userId, userId)) });
  if (!sourceChild) throw new Response("Child not found", { status: 404 });

  const invitee = await db.query.users.findFirst({ where: eq(users.email, input.inviteeParentEmail.toLowerCase()) });
  if (!invitee || invitee.id === userId) throw new Response("Invitee not found", { status: 404 });
  const existingPending = await db.query.relationships.findFirst({
    where: and(
      eq(relationships.childAId, sourceChild.id),
      eq(relationships.inviteeUserId, invitee.id),
      eq(relationships.status, "PENDING")
    ),
  });
  if (existingPending) return listRelationshipsForUser(db, userId);

  await db.insert(relationships).values({
    id: newId("rel"),
    childAId: sourceChild.id,
    childBId: null,
    inviterUserId: userId,
    inviteeUserId: invitee.id,
    createdByUserId: userId,
    status: "PENDING",
  });

  return listRelationshipsForUser(db, userId);
}

export async function updateRelationshipStatus(db: Db, userId: string, relationshipId: string, input: z.infer<typeof updateRelationshipStatusInputSchema>) {
  const relationship = await db.query.relationships.findFirst({
    where: and(eq(relationships.id, relationshipId), or(eq(relationships.inviterUserId, userId), eq(relationships.inviteeUserId, userId)))
  });
  if (!relationship) throw new Response("Relationship not found", { status: 404 });
  if ((input.status === "ACTIVE" || input.status === "REJECTED") && relationship.inviteeUserId !== userId) {
    throw new Response("Only the invited parent can accept or reject", { status: 403 });
  }
  if (input.status === "ACTIVE" && !relationship.childBId) {
    if (!input.childId) throw new Response("Choose a child to connect", { status: 400 });
    const selectedChild = await db.query.children.findFirst({ where: and(eq(children.id, input.childId), eq(children.userId, userId)) });
    if (!selectedChild) throw new Response("Child not found", { status: 404 });
    const [childAId, childBId] = canonicalPair(relationship.childAId, selectedChild.id);
    await db.update(relationships).set({
      childAId,
      childBId,
      status: "ACTIVE",
      acceptedAt: new Date().toISOString(),
    }).where(eq(relationships.id, relationshipId));
    return listRelationshipsForUser(db, userId);
  }

  await db.update(relationships).set({
    status: input.status,
    acceptedAt: input.status === "ACTIVE" ? new Date().toISOString() : relationship.acceptedAt,
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
    childAId: relationship.childAId,
    childBId: relationship.childBId,
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
    .where(and(eq(relationships.status, "ACTIVE"), isNotNull(relationships.childBId), or(eq(relationships.childAId, childId), eq(relationships.childBId, childId))));

  return rows.map((relationship) => relationship.childAId === childId ? relationship.childBId : relationship.childAId).filter((id): id is string => Boolean(id));
}

function canonicalPair(left: string, right: string): [string, string] {
  return left.localeCompare(right) <= 0 ? [left, right] : [right, left];
}
