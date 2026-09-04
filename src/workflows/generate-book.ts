import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import type { IllustrationGenerator } from "../ai/illustrations/illustration-generator";
import { OpenAiIllustrationGenerator } from "../ai/illustrations/openai-illustration-generator";
import type { QaResult, StoryContext, StoryManuscript, StoryOutline } from "../ai/story/schemas";
import { OpenAiStoryGenerator } from "../ai/story/openai-story-generator";
import type { StoryGenerator } from "../ai/story/story-generator";
import { addCanonEvents, relevantCanon } from "../domain/canon/service";
import { claimBookIssueForGeneration, failClaimedBookIssue, listEpisodeSummaries, setBookIssueStatus } from "../domain/books/service";
import { newId } from "../domain/ids";
import { parseJson, stringArraySchema } from "../domain/json";
import { listActiveConnectedChildren } from "../domain/relationships/service";
import { advanceSubscriptionAfterIssue } from "../domain/subscriptions/service";
import { renderBookHtml } from "../rendering/book-html/render-book";
import { BrowserPdfRenderer } from "../rendering/pdf/pdf-renderer";
import { buildDeliveryInput, deliverBook, EmailDeliveryProvider } from "../email/delivery";
import { createDb, type Db } from "../server/db/client";
import type { Env } from "../server/env";
import {
  bookPages,
  books,
  characters,
  deliveries,
  episodeSummaries,
  qaResults,
  storyExamples,
  subscriptionDeliveryMethods,
  subscriptions,
  universes
} from "../server/db/schema";
import { R2AssetStore } from "../storage/asset-store";
import { D1GenerationStepStore } from "./d1-generation-step-store";
import { runGenerationStep, stableInputHash } from "./generation-steps";
import type { IllustrationReferenceImage } from "../ai/illustrations/illustration-generator";

type GenerateBookParams = {
  bookIssueId: string;
};

const selectedCharacterCastSchema = z.array(z.object({
  characterId: z.string().min(1),
  sourceCharacterId: z.string().min(1).nullable().optional(),
  displayName: z.string().min(1),
  species: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  personality: z.string().nullable().optional(),
  profileImageUrls: z.array(z.string()).optional(),
  imageStatus: z.enum(["PENDING", "READY", "FAILED"]).optional(),
  role: z.enum(["MAIN", "SUPPORTING"])
}));

export class GenerateBookWorkflow extends WorkflowEntrypoint<Env, GenerateBookParams> {
  async run(event: WorkflowEvent<GenerateBookParams>, step: WorkflowStep) {
    const db = createDb(this.env.DB);
    const stepStore = new D1GenerationStepStore(db);
    const issueId = event.payload.bookIssueId;
    const issue = await db.query.bookIssues.findFirst({ where: (table, { eq: equals }) => equals(table.id, issueId) });
    if (!issue) throw new Error(`Book issue ${issueId} not found`);

    const assetStore = new R2AssetStore(db, this.env.BOOK_ASSETS, this.env.APP_BASE_URL);
    if (!this.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required to generate books");
    }
    const storyGenerator = new OpenAiStoryGenerator(this.env.OPENAI_API_KEY, this.env.OPENAI_STORY_MODEL);
    const illustrationGenerator = new OpenAiIllustrationGenerator(this.env.OPENAI_API_KEY, this.env.OPENAI_IMAGE_MODEL);
    const pdfRenderer = new BrowserPdfRenderer(this.env.BROWSER);
    let claimedAt: string | null = null;

    try {
      const claimResult = await step.do("claim issue", async () => runGenerationStep({
        store: stepStore,
        bookIssueId: issueId,
        step: "CLAIM_ISSUE",
        reuseCompleted: false,
        run: async () => {
          const claim = await claimBookIssueForGeneration(db, issueId);
          return { ...claim, status: claim.claimed ? "GENERATING" : issue.status };
        },
      }));
      claimedAt = claimResult.claimedAt;
      if (!claimResult.claimed) return;
      const context = await step.do("load context", async () => runGenerationStep({
        store: stepStore,
        bookIssueId: issueId,
        step: "LOAD_CONTEXT",
        run: async () => loadStoryContext(db, issueId),
      }));
      const book = await step.do("generate story if needed", async () => generateStoryIfNeeded(db, issueId, context, storyGenerator, stepStore));

      await generateIllustrationsIfNeeded(step, stepStore, db, issueId, book.id, context, illustrationGenerator, assetStore);

      await step.do("render pdf if needed", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "RENDER_PDF",
          run: async () => {
            const latestBook = await db.query.books.findFirst({ where: eq(books.id, book.id) });
            if (latestBook?.pdfAssetId) return { pdfAssetId: latestBook.pdfAssetId, reused: true };
            const manuscript = JSON.parse(book.storyJson) as StoryManuscript;
            const collection = await listEpisodeSummaries(db, context.child.id, context.universe.id, 12);
            const html = renderBookHtml({
              title: book.title,
              collectionName: collectionDisplayName(context.child.firstName),
              episodeNumber: issue.episodeNumber,
              manuscript,
              illustrations: await loadBookIllustrationDataUrls(db, book.id, assetStore),
              collection: collection.map((summary) => ({ episodeNumber: summary.episodeNumber, title: summary.summary.split(":")[0] ?? `Episode ${summary.episodeNumber}` }))
            });
            const pdf = await pdfRenderer.render(html);
            const asset = await assetStore.put({ kind: "PDF", contentType: "application/pdf", bytes: pdf, metadata: { bookIssueId: issueId } });
            await db.update(books).set({ pdfAssetId: asset.id }).where(eq(books.id, book.id));
            return { pdfAssetId: asset.id, reused: false };
          },
        });
      });

      await step.do("persist canon if needed", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "PERSIST_CANON",
          run: async () => persistCanonIfNeeded(db, issueId, issue.episodeNumber, book, context, storyGenerator),
        });
      });

      await step.do("deliver pending email", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "SEND_DELIVERIES",
          run: async () => deliverPendingEmail(db, issueId, issue.subscriptionId, book.id, this.env.RESEND_API_KEY, this.env.RESEND_FROM_EMAIL, this.env.APP_BASE_URL, assetStore),
        });
      });

      await step.do("advance schedule", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "ADVANCE_SUBSCRIPTION",
          run: async () => {
            await setBookIssueStatus(db, issueId, "DELIVERED");
            await advanceSubscriptionAfterIssue(db, issue.subscriptionId, new Date(issue.scheduledFor));
            return { status: "DELIVERED" };
          },
        });
      });
    } catch (error) {
      await failClaimedBookIssue(db, issueId, claimedAt, error instanceof Error ? error.message : "Unknown workflow error");
      throw error;
    }
  }
}

async function generateStoryIfNeeded(db: Db, issueId: string, context: StoryContext, storyGenerator: StoryGenerator, stepStore: D1GenerationStepStore) {
  const existingBook = await db.query.books.findFirst({ where: eq(books.bookIssueId, issueId) });
  if (existingBook) {
    const existingPages = await db.select().from(bookPages).where(eq(bookPages.bookId, existingBook.id));
    if (existingPages.length > 0) return existingBook;
    await db.delete(books).where(eq(books.id, existingBook.id));
  }
  const outline = await runGenerationStep({ store: stepStore, bookIssueId: issueId, step: "GENERATE_OUTLINE", run: async () => storyGenerator.generateOutline(context) });
  const initialManuscript = await runGenerationStep({ store: stepStore, bookIssueId: issueId, step: "GENERATE_MANUSCRIPT", run: async () => storyGenerator.generateManuscript(context, outline) });
  const initialQa = await runGenerationStep({
    store: stepStore,
    bookIssueId: issueId,
    step: "STORY_QA",
    run: async () => {
      const qa = await storyGenerator.reviewStory(context, outline, initialManuscript);
      await db.insert(qaResults).values({ id: newId("qa"), bookIssueId: issueId, kind: "STORY", passed: qa.passed, resultJson: JSON.stringify(qa) }).onConflictDoNothing();
      return qa;
    },
  });
  const manuscript = initialQa.passed
    ? initialManuscript
    : await repairManuscript(db, issueId, context, storyGenerator, stepStore, outline, initialManuscript, initialQa);
  const bookId = await runGenerationStep({
    store: stepStore,
    bookIssueId: issueId,
    step: "SAVE_BOOK",
    run: async () => {
      const id = newId("book");
      await db.insert(books).values({
        id,
        bookIssueId: issueId,
        title: manuscript.title,
        storyJson: JSON.stringify(manuscript),
        outlineJson: JSON.stringify(outline),
        generationMetadataJson: JSON.stringify({ provider: "openai" })
      }).onConflictDoNothing();
      const pageInputs = [
        { id: newId("page"), bookId: id, pageNumber: 1, pageType: "COVER" as const, text: manuscript.title, illustrationPrompt: coverPrompt(context, manuscript.title), metadataJson: "{}" },
        ...manuscript.pages.map((page) => ({
          id: newId("page"),
          bookId: id,
          pageNumber: page.pageNumber + 1,
          pageType: "STORY" as const,
          text: page.text,
          illustrationPrompt: page.sceneDescription,
          metadataJson: JSON.stringify({ charactersPresent: page.charactersPresent })
        })),
        { id: newId("page"), bookId: id, pageNumber: manuscript.pages.length + 2, pageType: "COLLECTION" as const, text: "Episode collection", illustrationPrompt: null, metadataJson: "{}" }
      ];
      for (const pageInput of pageInputs) {
        await db.insert(bookPages).values(pageInput).onConflictDoNothing();
      }
      return id;
    },
  });
  const created = await db.query.books.findFirst({ where: eq(books.id, bookId) }) ?? await db.query.books.findFirst({ where: eq(books.bookIssueId, issueId) });
  if (!created) throw new Error("Book was not created");
  return created;
}

async function repairManuscript(
  db: Db,
  issueId: string,
  context: StoryContext,
  storyGenerator: StoryGenerator,
  stepStore: D1GenerationStepStore,
  outline: StoryOutline,
  manuscript: StoryManuscript,
  qa: QaResult
) {
  const revised = await runGenerationStep({
    store: stepStore,
    bookIssueId: issueId,
    step: "REVISE_MANUSCRIPT",
    inputHash: stableInputHash(qa),
    run: async () => storyGenerator.reviseManuscript(context, outline, manuscript, qa),
  });
  const repairQa = await storyGenerator.reviewStory(context, outline, revised);
  await db
    .insert(qaResults)
    .values({ id: newId("qa"), bookIssueId: issueId, kind: "STORY_REPAIR", passed: repairQa.passed, resultJson: JSON.stringify(repairQa) })
    .onConflictDoUpdate({
      target: [qaResults.bookIssueId, qaResults.kind],
      set: { passed: repairQa.passed, resultJson: JSON.stringify(repairQa) },
    });
  if (!repairQa.passed) throw new Error(`Story QA failed after repair: ${repairQa.issues.join("; ")}`);
  return revised;
}

async function generateIllustrationsIfNeeded(
  step: WorkflowStep,
  stepStore: D1GenerationStepStore,
  db: Db,
  issueId: string,
  bookId: string,
  context: StoryContext,
  illustrationGenerator: IllustrationGenerator,
  assetStore: R2AssetStore
) {
  const existing = await stepStore.getStep<{ generated: number; total: number }>(issueId, "GENERATE_ILLUSTRATIONS");
  if (existing?.status === "COMPLETED") return existing.output;
  await stepStore.startStep({ bookIssueId: issueId, step: "GENERATE_ILLUSTRATIONS", idempotencyKey: `${issueId}:GENERATE_ILLUSTRATIONS:default` });
  const storyPages = await db.select().from(bookPages).where(and(eq(bookPages.bookId, bookId), eq(bookPages.pageType, "STORY")));
  const cover = await db.query.bookPages.findFirst({ where: and(eq(bookPages.bookId, bookId), eq(bookPages.pageType, "COVER")) });
  const pages = [cover, ...storyPages].filter((page) => page && !page.illustrationAssetId);
  let generated = 0;
  try {
    for (const page of pages) {
      if (!page) continue;
      await step.do(`generate illustration page ${page.pageNumber}`, async () => generateIllustrationForPage(db, issueId, context, page.id, illustrationGenerator, assetStore));
      generated += 1;
    }
    const output = { generated, total: pages.length };
    await stepStore.completeStep({ bookIssueId: issueId, step: "GENERATE_ILLUSTRATIONS", output });
    return output;
  } catch (error) {
    await stepStore.failStep({ bookIssueId: issueId, step: "GENERATE_ILLUSTRATIONS", error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function generateIllustrationForPage(
  db: Db,
  issueId: string,
  context: StoryContext,
  pageId: string,
  illustrationGenerator: IllustrationGenerator,
  assetStore: R2AssetStore
) {
  const page = await db.query.bookPages.findFirst({ where: eq(bookPages.id, pageId) });
  if (!page) throw new Error(`Book page ${pageId} not found`);
  if (page.illustrationAssetId) return { assetId: page.illustrationAssetId, reused: true };
  const image = await illustrationGenerator.generate({
    bookIssueId: issueId,
    pageNumber: page.pageNumber,
    prompt: page.illustrationPrompt ?? page.text,
    styleGuide: characterStyleGuide(context),
    referenceImages: await buildIllustrationReferences(db, page, context, assetStore)
  });
  const asset = await assetStore.put({ kind: "ILLUSTRATION", contentType: image.contentType, bytes: image.bytes, metadata: image.metadata });
  await db.update(bookPages).set({ illustrationAssetId: asset.id }).where(and(eq(bookPages.id, page.id), isNull(bookPages.illustrationAssetId)));
  return { assetId: asset.id, reused: false };
}

async function buildIllustrationReferences(
  db: Db,
  page: typeof bookPages.$inferSelect,
  context: StoryContext,
  assetStore: R2AssetStore
): Promise<IllustrationReferenceImage[]> {
  const pageCharacterIds = parseJson(page.metadataJson || "{}", z.object({ charactersPresent: z.array(z.string()).optional() })).charactersPresent ?? [];
  const pageCharacters = page.pageType === "COVER" || pageCharacterIds.length === 0
    ? context.characters
    : context.characters.filter((character) => pageCharacterIds.includes(character.id) || pageCharacterIds.includes(character.name));
  const characterAssetIds = pageCharacters
    .flatMap((character) => parseJson(character.profileImagesJson, stringArraySchema).map(assetIdFromUrl))
    .filter((assetId): assetId is string => Boolean(assetId))
    .slice(0, 9);
  const previousPages = await db
    .select()
    .from(bookPages)
    .where(and(eq(bookPages.bookId, page.bookId), eq(bookPages.pageType, "STORY"), lt(bookPages.pageNumber, page.pageNumber), isNotNull(bookPages.illustrationAssetId)))
    .orderBy(desc(bookPages.pageNumber))
    .limit(2);
  const previousAssetIds = previousPages
    .map((previousPage) => previousPage.illustrationAssetId)
    .filter((assetId): assetId is string => Boolean(assetId));
  return loadReferenceImages(assetStore, [...characterAssetIds, ...previousAssetIds].slice(0, 12));
}

async function loadReferenceImages(assetStore: R2AssetStore, assetIds: string[]): Promise<IllustrationReferenceImage[]> {
  const uniqueAssetIds = [...new Set(assetIds)];
  const references: IllustrationReferenceImage[] = [];
  for (const assetId of uniqueAssetIds) {
    const object = await assetStore.get(assetId);
    const contentType = object?.httpMetadata?.contentType;
    if (!object || !isSupportedReferenceContentType(contentType)) continue;
    references.push({
      name: `${assetId}.${contentType.split("/")[1]}`,
      contentType,
      bytes: new Uint8Array(await object.arrayBuffer()),
    });
  }
  return references;
}

async function loadBookIllustrationDataUrls(db: Db, bookId: string, assetStore: R2AssetStore) {
  const pages = await db.select().from(bookPages).where(eq(bookPages.bookId, bookId));
  const dataUrls: Record<number, string> = {};
  for (const page of pages) {
    if (!page.illustrationAssetId) continue;
    const object = await assetStore.get(page.illustrationAssetId);
    if (!object?.httpMetadata?.contentType?.startsWith("image/")) continue;
    const bytes = new Uint8Array(await object.arrayBuffer());
    dataUrls[page.pageNumber] = `data:${object.httpMetadata.contentType};base64,${uint8ToBase64(bytes)}`;
  }
  return dataUrls;
}

function uint8ToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function assetIdFromUrl(value: string) {
  const match = value.match(/\/api\/assets\/([^/]+)\/download/);
  return match?.[1] ?? null;
}

function isSupportedReferenceContentType(contentType: string | undefined): contentType is IllustrationReferenceImage["contentType"] {
  return contentType === "image/png" || contentType === "image/jpeg" || contentType === "image/webp";
}

async function persistCanonIfNeeded(
  db: Db,
  issueId: string,
  episodeNumber: number,
  book: typeof books.$inferSelect,
  context: StoryContext,
  storyGenerator: StoryGenerator
) {
  const existing = await db.query.episodeSummaries.findFirst({ where: eq(episodeSummaries.bookIssueId, issueId) });
  if (existing) return { persisted: false };
  const extracted = await storyGenerator.extractCanon(context, JSON.parse(book.storyJson) as StoryManuscript);
  await db.insert(episodeSummaries).values({
    id: newId("summary"),
    bookIssueId: issueId,
    childId: context.child.id,
    universeId: context.universe.id,
    episodeNumber,
    title: book.title,
    summary: extracted.episodeSummary
  });
  await addCanonEvents(
    db,
    extracted.canonEvents.map((event) => ({
      universeId: context.universe.id,
      childId: context.child.id,
      bookIssueId: issueId,
      eventType: event.eventType,
      summary: event.summary,
      importance: event.importance
    }))
  );
  return { persisted: true, canonEvents: extracted.canonEvents.length };
}

async function deliverPendingEmail(
  db: Db,
  issueId: string,
  subscriptionId: string,
  bookId: string,
  resendApiKey: string | undefined,
  resendFromEmail: string,
  appBaseUrl: string,
  assetStore: R2AssetStore
) {
  await setBookIssueStatus(db, issueId, "DELIVERY_PENDING");
  const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  const latestBook = await db.query.books.findFirst({ where: eq(books.id, bookId) });
  if (!subscription || !latestBook?.pdfAssetId) throw new Error("Issue is missing subscription or PDF");
  const methods = await db.select().from(subscriptionDeliveryMethods).where(and(eq(subscriptionDeliveryMethods.subscriptionId, subscription.id), eq(subscriptionDeliveryMethods.enabled, true)));
  for (const method of methods) {
    await db
      .insert(deliveries)
      .values({
        id: newId("delivery"),
        bookIssueId: issueId,
        subscriptionId: subscription.id,
        method: method.method,
        provider: method.method === "EMAIL" ? "resend" : "mail-placeholder",
        status: "PENDING"
      })
      .onConflictDoNothing();
  }
  const pending = await db.select().from(deliveries).where(and(eq(deliveries.bookIssueId, issueId), eq(deliveries.status, "PENDING")));
  const pendingEmail = pending.filter((delivery) => delivery.method === "EMAIL");
  const emailApiKey = resendApiKey;
  if (pendingEmail.length > 0 && !emailApiKey) {
    throw new Error("RESEND_API_KEY is required for email delivery");
  }
  if (pendingEmail.length === 0) return { sent: 0 };
  if (!emailApiKey) throw new Error("RESEND_API_KEY is required for email delivery");
  const provider = new EmailDeliveryProvider(emailApiKey, resendFromEmail, assetStore, appBaseUrl);
  let sent = 0;
  for (const delivery of pending) {
    if (delivery.method !== "EMAIL") continue;
    await deliverBook(db, provider, await buildDeliveryInput(db, delivery.id));
    sent += 1;
  }
  return { sent };
}

async function loadStoryContext(db: Db, bookIssueId: string): Promise<StoryContext> {
  const issue = await db.query.bookIssues.findFirst({ where: (table, { eq: equals }) => equals(table.id, bookIssueId) });
  if (!issue) throw new Error(`Issue ${bookIssueId} not found`);
  const child = await db.query.children.findFirst({ where: (table, { eq: equals }) => equals(table.id, issue.childId), with: { preferences: true } });
  const universe = await db.query.universes.findFirst({ where: eq(universes.id, issue.universeId) });
  if (!child || !universe) throw new Error("Issue context is incomplete");
  const worldCharacters = await db.select().from(characters).where(and(eq(characters.universeId, universe.id), eq(characters.active, true)));
  const selectedCast = parseJson(child.preferences?.selectedCharacterCastJson ?? "[]", selectedCharacterCastSchema);
  const canon = await relevantCanon(db, child.id, universe.id);
  const summaries = await listEpisodeSummaries(db, child.id, universe.id);
  const examples = await db.select().from(storyExamples).where(and(eq(storyExamples.universeId, universe.id), eq(storyExamples.active, true))).limit(16);
  const connectedChildIds = await listActiveConnectedChildren(db, child.id);
  return {
    child,
    universe,
    characters: resolveStoryCharacters(worldCharacters, selectedCast),
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
    connectedWorlds: {
      probability: connectedChildIds.length > 0 ? 0.18 : 0,
      childIds: connectedChildIds
    },
  };
}

function coverPrompt(context: StoryContext, title: string): string {
  return `Cover art for ${title}, featuring ${context.characters.map((character) => character.name).join(", ")} inside a growing Little World.`;
}

function characterStyleGuide(context: StoryContext): string {
  return `Polished modern children's picture book art. Warm, simple, expressive, safe for ages ${context.child.ageRange}. Character canon: ${context.characters
    .map((character) => `${character.name} (${character.baseName}, ${character.role.toLowerCase()}): ${character.visualDescriptionJson}. Hidden style references: ${character.hiddenStyleReferencesJson}`)
    .join(" ")}`;
}

function collectionDisplayName(firstName: string | null): string {
  return firstName ? `${firstName}'s Little World` : "Little World";
}

function resolveStoryCharacters(
  worldCharacters: Array<{ id: string; name: string; description: string; personality: string; visualDescriptionJson: string; profileImagesJson: string; hiddenStyleReferencesJson: string }>,
  selectedCast: Array<{
    characterId: string;
    sourceCharacterId?: string | null | undefined;
    displayName: string;
    species?: string | null | undefined;
    description?: string | null | undefined;
    personality?: string | null | undefined;
    profileImageUrls?: string[] | undefined;
    imageStatus?: "PENDING" | "READY" | "FAILED" | undefined;
    role: "MAIN" | "SUPPORTING";
  }>
): StoryContext["characters"] {
  const lockedCharacters = selectedCast
    .map((selected) => {
      const character = worldCharacters.find((candidate) => candidate.id === (selected.sourceCharacterId ?? selected.characterId));
      if (!character) return null;

      return {
        id: selected.characterId,
        name: selected.displayName || character.name,
        baseName: character.name,
        description: selected.description || character.description,
        personality: selected.personality || character.personality,
        visualDescriptionJson: character.visualDescriptionJson,
        profileImagesJson: JSON.stringify(selected.profileImageUrls ?? parseJson(character.profileImagesJson, stringArraySchema)),
        hiddenStyleReferencesJson: character.hiddenStyleReferencesJson,
        role: selected.role
      };
    })
    .filter((character): character is StoryContext["characters"][number] => Boolean(character));

  const source = lockedCharacters.length > 0
    ? lockedCharacters
    : worldCharacters.map((character, index) => ({
        ...character,
        baseName: character.name,
        role: index === 0 ? "MAIN" as const : "SUPPORTING" as const
      }));

  return [...source].sort((left, right) => Number(right.role === "MAIN") - Number(left.role === "MAIN"));
}
