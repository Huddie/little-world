import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { newId } from "../ids";
import { parseJson, stringArraySchema } from "../json";
import type { InspirationMode } from "../types";
import type { Db } from "../../server/db/client";
import {
  bookInspirations,
  bookIssues,
  childPreferences,
  inspirationItems,
  inspirationMappings,
  inspirationSources,
  storyThemes,
  subscriptions,
} from "../../server/db/schema";

export type StoryInspiration = {
  id: string;
  sourceId: string;
  sourceSlug: string;
  sourceLabel: string;
  itemId: string | null;
  themeId: string | null;
  title: string;
  childFacingMode: InspirationMode;
  promptGuidance: string;
  sourceRef: string | null;
  sourceUrl: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

type SefariaCalendarItem = {
  title?: { en?: string };
  displayValue?: { en?: string; he?: string };
  ref?: string;
  url?: string;
  heRef?: string;
};

type SefariaCalendarResponse = {
  date?: string;
  timezone?: string;
  calendar_items?: SefariaCalendarItem[];
};

const weeklyTorahSourceSlug = "weekly-torah-portion";

export async function listInspirationCatalog(db: Db) {
  const [sources, themes, mappings] = await Promise.all([
    db.select().from(inspirationSources),
    db.select().from(storyThemes),
    db.select().from(inspirationMappings),
  ]);
  return { sources, themes, mappings };
}

export async function updateChildInspirationSettings(
  db: Db,
  userId: string,
  childId: string,
  input: {
    enabledSourceIds?: string[];
    enabledInspirationSourceIds?: string[];
    enabledThemeIds?: string[];
    inspirationConfig?: Record<string, string | number | boolean | null>;
    parentNotes?: string | null;
  }
) {
  const child = await db.query.children.findFirst({
    where: (table, { and: all, eq: equals }) => all(equals(table.id, childId), equals(table.userId, userId)),
  });
  if (!child) throw new Response("Child not found", { status: 404 });
  const enabledSourceIds = input.enabledSourceIds ?? input.enabledInspirationSourceIds;
  await db
    .update(childPreferences)
    .set({
      ...(enabledSourceIds ? { enabledInspirationSourceIdsJson: JSON.stringify(enabledSourceIds) } : {}),
      ...(input.enabledThemeIds ? { enabledThemeIdsJson: JSON.stringify(input.enabledThemeIds) } : {}),
      ...(input.inspirationConfig ? { inspirationConfigJson: JSON.stringify(input.inspirationConfig) } : {}),
      ...(input.parentNotes !== undefined ? { optionalParentNotes: input.parentNotes } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(childPreferences.childId, childId));
  return getChildInspirationSettings(db, userId, childId);
}

export async function getChildInspirationSettings(db: Db, userId: string, childId: string) {
  const child = await db.query.children.findFirst({
    where: (table, { and: all, eq: equals }) => all(equals(table.id, childId), equals(table.userId, userId)),
    with: { preferences: true },
  });
  if (!child) throw new Response("Child not found", { status: 404 });
  return inspirationSettingsForChild(child.id, child.preferences);
}

export function inspirationSettingsForChild(
  childId: string,
  preferences?: {
    enabledInspirationSourceIdsJson?: string | null;
    enabledThemeIdsJson?: string | null;
    optionalParentNotes?: string | null;
  } | null
) {
  return {
    childId,
    enabledSourceIds: parseJson(preferences?.enabledInspirationSourceIdsJson ?? "[]", stringArraySchema),
    enabledThemeIds: parseJson(preferences?.enabledThemeIdsJson ?? "[]", stringArraySchema),
    parentNotes: preferences?.optionalParentNotes ?? "",
  };
}

export async function resolveInspirationsForIssue(db: Db, bookIssueId: string, fetcher: typeof fetch = fetch): Promise<StoryInspiration[]> {
  const existing = await listBookInspirations(db, bookIssueId);
  if (existing.length > 0) return existing;

  const issue = await db.query.bookIssues.findFirst({ where: eq(bookIssues.id, bookIssueId) });
  if (!issue) throw new Error(`Issue ${bookIssueId} not found`);
  const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, issue.subscriptionId) });
  const preferences = await db.query.childPreferences.findFirst({ where: eq(childPreferences.childId, issue.childId) });
  if (!subscription || !preferences) return [];

  const enabledSourceIds = parseJson(preferences.enabledInspirationSourceIdsJson ?? "[]", stringArraySchema);
  if (enabledSourceIds.length === 0) return [];

  const sources = await db.select().from(inspirationSources).where(eq(inspirationSources.enabled, true));
  const enabledSources = sources.filter((source) => enabledSourceIds.includes(source.id));
  const resolved: StoryInspiration[] = [];
  for (const source of enabledSources) {
    if (source.kind === "SEFARIA_CALENDAR") {
      const item = await resolveSefariaCalendarItem(db, source, issue.scheduledFor, preferences.inspirationConfigJson, fetcher);
      const mapped = await mapItemToInspiration(db, source, item, preferences.enabledThemeIdsJson);
      if (mapped) resolved.push(mapped);
      continue;
    }
    const mapped = await mapSourceToDefaultInspiration(db, source, preferences.enabledThemeIdsJson);
    if (mapped) resolved.push(mapped);
  }

  for (const inspiration of resolved) {
    await db.insert(bookInspirations).values({
      id: inspiration.id,
      bookIssueId,
      sourceId: inspiration.sourceId,
      itemId: inspiration.itemId,
      themeId: inspiration.themeId,
      title: inspiration.title,
      childFacingMode: inspiration.childFacingMode,
      promptGuidance: inspiration.promptGuidance,
      sourceRef: inspiration.sourceRef,
      sourceUrl: inspiration.sourceUrl,
      metadataJson: JSON.stringify(inspiration.metadata),
    }).onConflictDoNothing();
  }

  return listBookInspirations(db, bookIssueId);
}

export async function listBookInspirations(db: Db, bookIssueId: string): Promise<StoryInspiration[]> {
  const rows = await db
    .select({ bookInspiration: bookInspirations, source: inspirationSources })
    .from(bookInspirations)
    .innerJoin(inspirationSources, eq(inspirationSources.id, bookInspirations.sourceId))
    .where(eq(bookInspirations.bookIssueId, bookIssueId));
  return rows.map(({ bookInspiration, source }) => ({
    id: bookInspiration.id,
    sourceId: source.id,
    sourceSlug: source.slug,
    sourceLabel: source.label,
    itemId: bookInspiration.itemId,
    themeId: bookInspiration.themeId,
    title: bookInspiration.title,
    childFacingMode: normalizeMode(bookInspiration.childFacingMode),
    promptGuidance: bookInspiration.promptGuidance,
    sourceRef: bookInspiration.sourceRef,
    sourceUrl: bookInspiration.sourceUrl,
    metadata: parseJson(bookInspiration.metadataJson, recordSchema),
  }));
}

export async function getInspirationsForDate(
  db: Db,
  input: { date: string; sourceSlug?: string; config?: Record<string, string | number | boolean | null> },
  fetcher: typeof fetch = fetch
) {
  const source = await db.query.inspirationSources.findFirst({
    where: eq(inspirationSources.slug, input.sourceSlug ?? weeklyTorahSourceSlug),
  });
  if (!source) throw new Error("Inspiration source is not configured");
  if (source.kind !== "SEFARIA_CALENDAR") return [];
  const item = await resolveSefariaCalendarItem(db, source, input.date, JSON.stringify(input.config ?? {}), fetcher);
  const mapped = await mapItemToInspiration(db, source, item, "[]");
  return mapped ? [mapped] : [];
}

async function resolveSefariaCalendarItem(
  db: Db,
  source: typeof inspirationSources.$inferSelect,
  scheduledFor: string,
  configJson: string,
  fetcher: typeof fetch
) {
  const config = { ...parseJson(source.configJson, recordSchema), ...parseJson(configJson, recordSchema) };
  const date = new Date(scheduledFor);
  const timezone = typeof config.timezone === "string" ? config.timezone : "America/New_York";
  const calendarProfile = config.calendarProfile === "ISRAEL" ? "ISRAEL" : "DIASPORA";
  const externalKey = `${calendarProfile}:${date.toISOString().slice(0, 10)}`;
  const cached = await db.query.inspirationItems.findFirst({
    where: and(eq(inspirationItems.sourceId, source.id), eq(inspirationItems.externalKey, externalKey)),
  });
  if (cached) return cached;

  const url = new URL("https://www.sefaria.org/api/calendars");
  url.searchParams.set("diaspora", calendarProfile === "DIASPORA" ? "1" : "0");
  url.searchParams.set("year", String(date.getUTCFullYear()));
  url.searchParams.set("month", String(date.getUTCMonth() + 1));
  url.searchParams.set("day", String(date.getUTCDate()));
  url.searchParams.set("timezone", timezone);
  const response = await fetcher(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Sefaria calendar lookup failed: ${response.status}`);
  const data = await response.json() as SefariaCalendarResponse;
  const parsha = data.calendar_items?.find((item) => item.title?.en === "Parashat Hashavua");
  const title = parsha?.displayValue?.en;
  if (!title) throw new Error("Sefaria calendar response did not include Parashat Hashavua");

  const values = {
    id: newId("insp_item"),
    sourceId: source.id,
    externalKey,
    type: "CALENDAR_READING",
    title,
    displayTitle: `Parashat ${title}`,
    sourceRef: parsha.ref ?? null,
    sourceUrl: parsha.url ? `https://www.sefaria.org/${parsha.url}` : null,
    startsAt: date.toISOString().slice(0, 10),
    endsAt: date.toISOString().slice(0, 10),
    metadataJson: JSON.stringify({
      calendarProfile,
      timezone,
      heTitle: parsha.displayValue?.he ?? null,
      heRef: parsha.heRef ?? null,
      sefariaDate: data.date ?? null,
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.insert(inspirationItems).values(values).onConflictDoNothing();
  return await db.query.inspirationItems.findFirst({
    where: and(eq(inspirationItems.sourceId, source.id), eq(inspirationItems.externalKey, externalKey)),
  }) ?? values;
}

async function mapItemToInspiration(
  db: Db,
  source: typeof inspirationSources.$inferSelect,
  item: typeof inspirationItems.$inferSelect,
  enabledThemeIdsJson: string
): Promise<StoryInspiration | null> {
  const mapping = await selectMapping(db, source.id, item.externalKey, enabledThemeIdsJson);
  if (!mapping) return null;
  return {
    id: newId("book_insp"),
    sourceId: source.id,
    sourceSlug: source.slug,
    sourceLabel: source.label,
    itemId: item.id,
    themeId: mapping.theme.id,
    title: item.displayTitle,
    childFacingMode: normalizeMode(mapping.mapping.childFacingMode),
    promptGuidance: `${mapping.mapping.promptGuidance}\nSelected source: ${item.displayTitle}${item.sourceRef ? ` (${item.sourceRef})` : ""}.`,
    sourceRef: item.sourceRef,
    sourceUrl: item.sourceUrl,
    metadata: parseJson(item.metadataJson, recordSchema),
  };
}

async function mapSourceToDefaultInspiration(db: Db, source: typeof inspirationSources.$inferSelect, enabledThemeIdsJson: string) {
  const mapping = await selectMapping(db, source.id, null, enabledThemeIdsJson);
  if (!mapping) return null;
  return {
    id: newId("book_insp"),
    sourceId: source.id,
    sourceSlug: source.slug,
    sourceLabel: source.label,
    itemId: null,
    themeId: mapping.theme.id,
    title: mapping.theme.label,
    childFacingMode: normalizeMode(source.defaultMode),
    promptGuidance: mapping.mapping.promptGuidance,
    sourceRef: null,
    sourceUrl: null,
    metadata: {},
  } satisfies StoryInspiration;
}

async function selectMapping(db: Db, sourceId: string, itemExternalKey: string | null, enabledThemeIdsJson: string) {
  const enabledThemeIds = parseJson(enabledThemeIdsJson ?? "[]", stringArraySchema);
  const mappings = await db
    .select({ mapping: inspirationMappings, theme: storyThemes })
    .from(inspirationMappings)
    .innerJoin(storyThemes, eq(storyThemes.id, inspirationMappings.themeId))
    .where(and(
      eq(inspirationMappings.enabled, true),
      eq(storyThemes.enabled, true),
      eq(inspirationMappings.sourceId, sourceId),
      itemExternalKey ? or(eq(inspirationMappings.itemExternalKey, itemExternalKey), isNull(inspirationMappings.itemExternalKey)) : isNull(inspirationMappings.itemExternalKey)
    ));
  const allowed = enabledThemeIds.length > 0 ? mappings.filter((row) => enabledThemeIds.includes(row.theme.id)) : mappings;
  return allowed.sort((left, right) => right.mapping.strength - left.mapping.strength)[0] ?? null;
}

function normalizeMode(value: string): InspirationMode {
  return value === "OFF" || value === "EXPLICIT" ? value : "THEME";
}

const recordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).catch({});
