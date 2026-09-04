import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { newId } from "../ids";
import { stringifyJson } from "../json";
import type { Db } from "../../server/db/client";
import { childPreferences, children } from "../../server/db/schema";

const selectedCharacterSchema = z.object({
  characterId: z.string().min(1),
  sourceCharacterId: z.string().min(1).optional().nullable(),
  displayName: z.string().trim().min(1).max(80),
  species: z.string().trim().min(1).max(80).optional().nullable(),
  description: z.string().trim().min(1).max(600).optional().nullable(),
  personality: z.string().trim().min(1).max(600).optional().nullable(),
  profileImageUrls: z.array(z.string().min(1)).optional(),
  imageStatus: z.enum(["PENDING", "READY", "FAILED"]).optional(),
  role: z.enum(["MAIN", "SUPPORTING"])
});

export const createChildInputSchema = z.object({
  firstName: z.string().trim().max(80).optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  ageRange: z.enum(["1-11 months", "12-23 months", "2-3", "4-5", "6-8", "9-12"]),
  readingLevel: z.string().max(80).optional().nullable(),
  interests: z.array(z.string().min(1)).default([]),
  favoriteCharacterIds: z.array(z.string().min(1)).default([]),
  selectedCharacters: z.array(selectedCharacterSchema).min(2).max(5),
  mainCharacterId: z.string().min(1),
  likedThemes: z.array(z.string().min(1)).default([]),
  dislikedThemes: z.array(z.string().min(1)).default([]),
  storyGenres: z.array(z.string().min(1)).default([]),
  optionalParentNotes: z.string().max(1000).optional().nullable()
}).superRefine((input, context) => {
  const selectedIds = new Set(input.selectedCharacters.map((character) => character.characterId));
  const sourceIds = input.selectedCharacters
    .map((character) => character.sourceCharacterId)
    .filter((sourceId): sourceId is string => Boolean(sourceId));
  const mainCount = input.selectedCharacters.filter((character) => character.role === "MAIN").length;

  if (selectedIds.size !== input.selectedCharacters.length) {
    context.addIssue({ code: "custom", message: "Each generated character must be unique.", path: ["selectedCharacters"] });
  }

  if (sourceIds.length > 0 && new Set(sourceIds).size !== sourceIds.length) {
    context.addIssue({ code: "custom", message: "Each character should use a distinct style source.", path: ["selectedCharacters"] });
  }

  if (!selectedIds.has(input.mainCharacterId)) {
    context.addIssue({ code: "custom", message: "Main character must be selected.", path: ["mainCharacterId"] });
  }

  if (mainCount !== 1) {
    context.addIssue({ code: "custom", message: "Exactly one main character is required.", path: ["selectedCharacters"] });
  }
});

export type CreateChildInput = z.infer<typeof createChildInputSchema>;

export const updateChildInputSchema = z.object({
  firstName: z.string().trim().max(80).optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  ageRange: z.enum(["1-11 months", "12-23 months", "2-3", "4-5", "6-8", "9-12"]),
  readingLevel: z.string().max(80).optional().nullable(),
  optionalParentNotes: z.string().max(1000).optional().nullable()
});

export type UpdateChildInput = z.infer<typeof updateChildInputSchema>;

export async function createChild(db: Db, userId: string, input: CreateChildInput) {
  const childId = newId("child");
  const lockedCharacters = input.selectedCharacters.map((character) => ({
    ...character,
    profileImageUrls: [],
    imageStatus: "PENDING" as const,
  }));
  await db.insert(children).values({
    id: childId,
    userId,
    firstName: input.firstName?.trim() || null,
    birthDate: input.birthDate ?? null,
    ageRange: input.ageRange,
    readingLevel: input.readingLevel ?? null
  });
  await db.insert(childPreferences).values({
    id: newId("pref"),
    childId,
    interestsJson: stringifyJson(input.interests),
    favoriteCharacterIdsJson: stringifyJson(lockedCharacters.map((character) => character.characterId)),
    selectedCharacterCastJson: stringifyJson(lockedCharacters),
    mainCharacterId: input.mainCharacterId,
    likedThemesJson: stringifyJson(input.likedThemes),
    dislikedThemesJson: stringifyJson(input.dislikedThemes),
    storyGenresJson: stringifyJson(input.storyGenres),
    optionalParentNotes: input.optionalParentNotes ?? null
  });
  return getChildForUser(db, userId, childId);
}

export async function listChildrenForUser(db: Db, userId: string) {
  return db.query.children.findMany({
    where: eq(children.userId, userId),
    with: { preferences: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)]
  });
}

export async function getChildForUser(db: Db, userId: string, childId: string) {
  const child = await db.query.children.findFirst({
    where: and(eq(children.id, childId), eq(children.userId, userId)),
    with: { preferences: true }
  });
  if (!child) throw new Response("Child not found", { status: 404 });
  return child;
}

export async function updateStoryInspiration(db: Db, userId: string, childId: string, notes: string | null) {
  await getChildForUser(db, userId, childId);
  await db.update(childPreferences).set({ optionalParentNotes: notes }).where(eq(childPreferences.childId, childId));
  return getChildForUser(db, userId, childId);
}

export async function updateChild(db: Db, userId: string, childId: string, input: UpdateChildInput) {
  await getChildForUser(db, userId, childId);
  await db
    .update(children)
    .set({
      firstName: input.firstName?.trim() || null,
      birthDate: input.birthDate ?? null,
      ageRange: input.ageRange,
      readingLevel: input.readingLevel ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(children.id, childId), eq(children.userId, userId)));

  if (input.optionalParentNotes !== undefined) {
    await db
      .update(childPreferences)
      .set({ optionalParentNotes: input.optionalParentNotes, updatedAt: new Date().toISOString() })
      .where(eq(childPreferences.childId, childId));
  }

  return getChildForUser(db, userId, childId);
}

export async function archiveChild(db: Db, userId: string, childId: string) {
  await getChildForUser(db, userId, childId);
  await db.delete(children).where(and(eq(children.id, childId), eq(children.userId, userId)));
}
