import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { and, asc, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
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
import {
  buildMemoryRetrievalQuery,
  OpenAiEmbeddingClient,
  pageAssetIdsByNumber,
  persistExtractedMemory,
  retrieveStoryMemory,
  semanticMemoryMatches,
  syncMemoryEmbeddings,
} from "../domain/memory/service";
import { listActiveConnectedChildren } from "../domain/relationships/service";
import { advanceSubscriptionAfterIssue } from "../domain/subscriptions/service";
import { renderBookHtml } from "../rendering/book-html/render-book";
import { BrowserPdfRenderer } from "../rendering/pdf/pdf-renderer";
import { buildDeliveryInput, deliverBook, EmailDeliveryProvider } from "../email/delivery";
import { createDb, type Db } from "../server/db/client";
import type { Env } from "../server/env";
import {
  bookPages,
  bookIssues,
  books,
  characters,
  deliveries,
  episodeSummaries,
  memoryEvents,
  qaResults,
  storyExamples,
  subscriptionDeliveryMethods,
  subscriptions,
  universes
} from "../server/db/schema";
import { R2AssetStore } from "../storage/asset-store";
import { signInternalAssetUrl } from "../storage/internal-asset-signing";
import { D1GenerationStepStore } from "./d1-generation-step-store";
import { runGenerationStep, stableInputHash } from "./generation-steps";
import type { IllustrationReferenceImage } from "../ai/illustrations/illustration-generator";

type GenerateBookParams = {
  bookIssueId: string;
  backfillOnly?: boolean;
  continueBook?: boolean;
  expectedStartedAt?: string | null;
  memoryBackfillOnly?: boolean;
};

const ILLUSTRATIONS_PER_WORKFLOW_RUN = 1;

class StaleGenerationError extends Error {
  constructor() {
    super("Stale generation run stopped before writing output");
    this.name = "StaleGenerationError";
  }
}

type ReferencePointer = {
  assetId: string;
  name: string;
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
    if (event.payload.expectedStartedAt && issue.generationStartedAt !== event.payload.expectedStartedAt) {
      return { skipped: true, reason: "stale-generation-token" };
    }

    const assetStore = new R2AssetStore(db, this.env.BOOK_ASSETS, this.env.APP_BASE_URL);
    if (!this.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required to generate books");
    }
    const storyGenerator = new OpenAiStoryGenerator(this.env.OPENAI_API_KEY, this.env.OPENAI_STORY_MODEL);
    const illustrationGenerator = new OpenAiIllustrationGenerator(this.env.OPENAI_API_KEY, this.env.OPENAI_IMAGE_MODEL);
    const pdfRenderer = new BrowserPdfRenderer(this.env.BROWSER);
    let claimedAt: string | null = null;

    try {
      if (event.payload.memoryBackfillOnly) {
        const context = await step.do("load context", async () => loadStoryContext(db, issueId, this.env));
        const book = await db.query.books.findFirst({ where: eq(books.bookIssueId, issueId) });
        if (!book) throw new Error(`Book issue ${issueId} has no book to backfill memory`);
        await step.do("persist canon if needed", async () => runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "PERSIST_CANON",
          reuseCompleted: false,
          run: async () => persistCanonIfNeeded(db, issueId, issue.episodeNumber, book, context, storyGenerator),
        }));
        await step.do("index memory if needed", async () => runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "EMBED_MEMORY",
          reuseCompleted: false,
          run: async () => syncMemoryEmbeddings({
            db,
            ...(this.env.STORY_MEMORY_INDEX ? { index: this.env.STORY_MEMORY_INDEX } : {}),
            ...(this.env.OPENAI_API_KEY ? { embedder: new OpenAiEmbeddingClient(this.env.OPENAI_API_KEY, this.env.OPENAI_EMBEDDING_MODEL, Number(this.env.OPENAI_EMBEDDING_DIMENSIONS ?? 1536)) } : {}),
            childId: context.child.id,
            universeId: context.universe.id,
            sourceBookIssueId: issueId,
          }),
        }));
        return;
      }

      if (event.payload.backfillOnly || event.payload.continueBook) {
        claimedAt = issue.generationStartedAt;
        const context = await step.do("load context", async () => loadStoryContext(db, issueId));
        const book = await db.query.books.findFirst({ where: eq(books.bookIssueId, issueId) });
        if (!book) throw new Error(`Book issue ${issueId} has no book to continue`);
        const illustrationResult = await generateIllustrationsIfNeeded(step, stepStore, db, issueId, book.id, context, illustrationGenerator, assetStore, claimedAt);
        if (illustrationResult.remaining > 0) {
          await queueBookContinuation(step, this.env, issueId, issue.generationStartedAt, event.payload.backfillOnly === true);
          return;
        }
        if (event.payload.backfillOnly) {
          await renderPdfForBook(db, issueId, issue.episodeNumber, book.id, context, assetStore, pdfRenderer, this.env.APP_BASE_URL, this.env.BETTER_AUTH_SECRET, true, claimedAt);
          return;
        }
      }

      if (!event.payload.continueBook) {
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
      }
      const context = await step.do("load context", async () => runGenerationStep({
        store: stepStore,
        bookIssueId: issueId,
        step: "LOAD_CONTEXT",
        reuseCompleted: false,
        run: async () => loadStoryContext(db, issueId, this.env),
      }));
      const book = await step.do("generate story if needed", async () => generateStoryIfNeeded(db, issueId, context, storyGenerator, stepStore));

      const illustrationResult = await generateIllustrationsIfNeeded(step, stepStore, db, issueId, book.id, context, illustrationGenerator, assetStore, claimedAt);
      if (illustrationResult.remaining > 0) {
        await queueBookContinuation(step, this.env, issueId, claimedAt, false);
        return;
      }

      await step.do("render pdf if needed", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "RENDER_PDF",
          run: async () => renderPdfForBook(db, issueId, issue.episodeNumber, book.id, context, assetStore, pdfRenderer, this.env.APP_BASE_URL, this.env.BETTER_AUTH_SECRET, false, claimedAt),
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

      await step.do("index memory if needed", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "EMBED_MEMORY",
          run: async () => syncMemoryEmbeddings({
            db,
            ...(this.env.STORY_MEMORY_INDEX ? { index: this.env.STORY_MEMORY_INDEX } : {}),
            ...(this.env.OPENAI_API_KEY ? { embedder: new OpenAiEmbeddingClient(this.env.OPENAI_API_KEY, this.env.OPENAI_EMBEDDING_MODEL, Number(this.env.OPENAI_EMBEDDING_DIMENSIONS ?? 1536)) } : {}),
            childId: context.child.id,
            universeId: context.universe.id,
            sourceBookIssueId: issueId,
          }),
        });
      });

      await step.do("deliver pending email", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "SEND_DELIVERIES",
          run: async () => deliverPendingEmail(db, issueId, issue.subscriptionId, book.id, this.env.RESEND_API_KEY, this.env.RESEND_FROM_EMAIL, this.env.APP_BASE_URL, assetStore, claimedAt),
        });
      });

      await step.do("advance schedule", async () => {
        return runGenerationStep({
          store: stepStore,
          bookIssueId: issueId,
          step: "ADVANCE_SUBSCRIPTION",
          reuseCompleted: false,
          run: async () => {
            await assertCurrentGeneration(db, issueId, claimedAt);
            await setBookIssueStatus(db, issueId, "DELIVERED");
            const schedule = await advanceSubscriptionAfterIssue(db, issue.subscriptionId, new Date(issue.scheduledFor));
            return { status: "DELIVERED", schedule };
          },
        });
      });
    } catch (error) {
      if (error instanceof StaleGenerationError) {
        return { skipped: true, reason: "stale-generation-token" };
      }
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
  assetStore: R2AssetStore,
  expectedStartedAt: string | null
) {
  const storyPages = await db.select().from(bookPages).where(and(eq(bookPages.bookId, bookId), eq(bookPages.pageType, "STORY"))).orderBy(asc(bookPages.pageNumber));
  const cover = await db.query.bookPages.findFirst({ where: and(eq(bookPages.bookId, bookId), eq(bookPages.pageType, "COVER")) });
  const missingPages = [cover, ...storyPages].filter((page) => page && !page.illustrationAssetId);
  const existing = await stepStore.getStep<{ generated: number; total: number }>(issueId, "GENERATE_ILLUSTRATIONS");
  if (existing?.status === "COMPLETED" && missingPages.length === 0) return { ...existing.output, remaining: 0 };
  await stepStore.startStep({ bookIssueId: issueId, step: "GENERATE_ILLUSTRATIONS", idempotencyKey: `${issueId}:GENERATE_ILLUSTRATIONS:default` });
  const pages = missingPages.slice(0, ILLUSTRATIONS_PER_WORKFLOW_RUN);
  let generated = 0;
  try {
    for (const page of pages) {
      if (!page) continue;
      await step.do(`generate illustration page ${page.pageNumber}`, async () => generateIllustrationForPage(db, issueId, context, page.id, illustrationGenerator, assetStore, expectedStartedAt));
      generated += 1;
    }
    const remaining = Math.max(0, missingPages.length - generated);
    const output = { generated, total: storyPages.length + (cover ? 1 : 0), missingBefore: missingPages.length, remaining };
    if (remaining === 0) {
      await stepStore.completeStep({ bookIssueId: issueId, step: "GENERATE_ILLUSTRATIONS", output });
    }
    return output;
  } catch (error) {
    if (error instanceof StaleGenerationError) {
      throw error;
    }
    await stepStore.failStep({ bookIssueId: issueId, step: "GENERATE_ILLUSTRATIONS", error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function queueBookContinuation(step: WorkflowStep, env: Env, issueId: string, expectedStartedAt: string | null, backfillOnly: boolean) {
  return step.do("queue next illustration batch", async () => {
    await env.GENERATE_BOOK_WORKFLOW.create({
      id: `${issueId}-continue-${crypto.randomUUID()}`,
      params: { bookIssueId: issueId, continueBook: true, expectedStartedAt, backfillOnly },
    });
    return { queued: true };
  });
}

async function renderPdfForBook(
  db: Db,
  issueId: string,
  episodeNumber: number,
  bookId: string,
  context: StoryContext,
  assetStore: R2AssetStore,
  pdfRenderer: BrowserPdfRenderer,
  appBaseUrl: string,
  assetSigningSecret: string | undefined,
  force: boolean,
  expectedStartedAt: string | null
) {
  if (!assetSigningSecret) throw new Error("BETTER_AUTH_SECRET is required to render PDFs with private assets");
  await assertCurrentGeneration(db, issueId, expectedStartedAt);
  const latestBook = await db.query.books.findFirst({ where: eq(books.id, bookId) });
  if (!latestBook) throw new Error(`Book ${bookId} not found`);
  if (latestBook.pdfAssetId && !force) return { pdfAssetId: latestBook.pdfAssetId, reused: true };
  const manuscript = JSON.parse(latestBook.storyJson) as StoryManuscript;
  const collection = await listEpisodeSummaries(db, context.child.id, context.universe.id, 12);
  const html = renderBookHtml({
    title: latestBook.title,
    collectionName: collectionDisplayName(context.child.firstName),
    episodeNumber,
    manuscript,
    illustrations: await loadBookIllustrationRenderUrls(db, bookId, appBaseUrl, assetSigningSecret),
    collection: collection.map((summary) => ({ episodeNumber: summary.episodeNumber, title: summary.summary.split(":")[0] ?? `Episode ${summary.episodeNumber}` }))
  });
  const pdf = await pdfRenderer.render(html);
  const asset = await assetStore.put({ kind: "PDF", contentType: "application/pdf", bytes: pdf, metadata: { bookIssueId: issueId } });
  await assertCurrentGeneration(db, issueId, expectedStartedAt);
  await db.update(books).set({ pdfAssetId: asset.id }).where(eq(books.id, bookId));
  return { pdfAssetId: asset.id, reused: false };
}

async function generateIllustrationForPage(
  db: Db,
  issueId: string,
  context: StoryContext,
  pageId: string,
  illustrationGenerator: IllustrationGenerator,
  assetStore: R2AssetStore,
  expectedStartedAt: string | null
) {
  await assertCurrentGeneration(db, issueId, expectedStartedAt);
  const page = await db.query.bookPages.findFirst({ where: eq(bookPages.id, pageId) });
  if (!page) throw new Error(`Book page ${pageId} not found`);
  if (page.illustrationAssetId) return { assetId: page.illustrationAssetId, reused: true };
  const referenceImages = await buildIllustrationReferences(db, page, context, assetStore);
  await assertCurrentGeneration(db, issueId, expectedStartedAt);
  const image = await illustrationGenerator.generate({
    bookIssueId: issueId,
    pageNumber: page.pageNumber,
    prompt: illustrationPromptForPage(page, context),
    styleGuide: characterStyleGuide(context),
    referenceImages
  });
  const asset = await assetStore.put({ kind: "ILLUSTRATION", contentType: image.contentType, bytes: image.bytes, metadata: image.metadata });
  await assertCurrentGeneration(db, issueId, expectedStartedAt);
  const attach = await db.update(bookPages).set({ illustrationAssetId: asset.id }).where(and(eq(bookPages.id, page.id), isNull(bookPages.illustrationAssetId)));
  if (attach.meta.changes === 0) {
    const latestPage = await db.query.bookPages.findFirst({ where: eq(bookPages.id, page.id) });
    if (latestPage?.illustrationAssetId) return { assetId: latestPage.illustrationAssetId, reused: true, orphanedAssetId: asset.id };
    throw new Error(`Could not attach generated illustration for page ${page.pageNumber}`);
  }
  return { assetId: asset.id, reused: false };
}

async function buildIllustrationReferences(
  db: Db,
  page: typeof bookPages.$inferSelect,
  context: StoryContext,
  assetStore: R2AssetStore
): Promise<IllustrationReferenceImage[]> {
  const pageCharacters = pageCharactersForIllustration(page, context);
  const referencePointers: ReferencePointer[] = [];
  for (const character of pageCharacters) {
    const profileRefs = parseJson(character.profileImagesJson, stringArraySchema)
      .map(assetIdFromUrl)
      .filter((assetId): assetId is string => Boolean(assetId))
      .slice(0, 3)
      .map((assetId, index) => ({
        assetId,
        name: `${safeReferenceName(character.name)}-${safeReferenceName(character.baseName)}-${safeReferenceName(character.role)}-reference-${index + 1}`
      }));
    const memoryRefs = (context.memory?.visualMemories ?? [])
      .filter((memory) => memory.characterId === character.id)
      .slice(0, 2)
      .map((memory, index) => ({ assetId: memory.assetId, name: `${safeReferenceName(character.name)}-memory-${index + 1}` }))
    const loadedCharacterRefs = await loadReferenceImages(assetStore, [...profileRefs, ...memoryRefs]);
    if (loadedCharacterRefs.length === 0) {
      throw new Error(`Missing usable illustration reference images for ${character.name}`);
    }
    referencePointers.push(...[...profileRefs, ...memoryRefs].slice(0, 5));
  }
  const previousPages = await db
    .select()
    .from(bookPages)
    .where(and(eq(bookPages.bookId, page.bookId), eq(bookPages.pageType, "STORY"), lt(bookPages.pageNumber, page.pageNumber), isNotNull(bookPages.illustrationAssetId)))
    .orderBy(desc(bookPages.pageNumber))
    .limit(2);
  const previousRefs = previousPages
    .map((previousPage) => previousPage.illustrationAssetId)
    .filter((assetId): assetId is string => Boolean(assetId))
    .map((assetId, index) => ({ assetId, name: `previous-story-page-${index + 1}` }));
  const references = await loadReferenceImages(assetStore, [...referencePointers, ...previousRefs].slice(0, 14));
  if (references.length < pageCharacters.length) {
    throw new Error(`Missing required cast references for page ${page.pageNumber}`);
  }
  return references;
}

async function loadReferenceImages(assetStore: R2AssetStore, pointers: ReferencePointer[]): Promise<IllustrationReferenceImage[]> {
  const uniquePointers = pointers.filter((pointer, index, values) => values.findIndex((candidate) => candidate.assetId === pointer.assetId) === index);
  const references: IllustrationReferenceImage[] = [];
  for (const pointer of uniquePointers) {
    const object = await assetStore.get(pointer.assetId);
    const contentType = object?.httpMetadata?.contentType;
    if (!object || !isSupportedReferenceContentType(contentType)) continue;
    references.push({
      name: `${pointer.name}.${contentType.split("/")[1]}`,
      contentType,
      bytes: new Uint8Array(await object.arrayBuffer()),
    });
  }
  return references;
}

function illustrationPromptForPage(page: typeof bookPages.$inferSelect, context: StoryContext): string {
  const pageCharacters = pageCharactersForIllustration(page, context);
  const allowedCast = pageCharacters
    .map((character) => `${character.name}: ${character.description}`)
    .join("\n");
  return [
    "Illustrate exactly this Little World scene.",
    `Allowed visible cast:\n${allowedCast}`,
    hardCharacterRules(pageCharacters),
    "Do not add unlisted animal characters. Background creatures may only be tiny non-character insects or birds if the scene needs them.",
    page.illustrationPrompt ?? page.text,
  ].join("\n\n");
}

function pageCharactersForIllustration(page: typeof bookPages.$inferSelect, context: StoryContext) {
  const pageCharacterIds = parseJson(page.metadataJson || "{}", z.object({ charactersPresent: z.array(z.string()).optional() })).charactersPresent ?? [];
  return page.pageType === "COVER" || pageCharacterIds.length === 0
    ? context.characters
    : context.characters.filter((character) => pageCharacterIds.includes(character.id) || pageCharacterIds.includes(character.name));
}

function hardCharacterRules(charactersForPage: StoryContext["characters"]) {
  return `Hard character identity rules:\n${charactersForPage.map((character) => `- ${character.name} must remain ${character.baseName}. ${speciesGuardrail(`${character.baseName} ${character.description}`)}`).join("\n")}`;
}

function speciesGuardrail(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("mouse")) return "Show mouse traits: small round mouse ears, whiskers, tiny paws, and a thin tail. Never draw as a rabbit or bunny; no long rabbit ears.";
  if (lower.includes("kitten") || lower.includes("cat")) return "Show cat/kitten traits: tabby face, cat ears, whiskers, paws, and the described glowing tail. Never draw as a fox; no orange fox fur or bushy fox tail.";
  if (lower.includes("bear")) return "Show bear-cub traits: round bear ears, bear muzzle, fuzzy cub body. Never draw as a dog, fox, or raccoon.";
  return "Do not change species, silhouette, clothing, colors, or signature accessories.";
}

function safeReferenceName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reference";
}

async function loadBookIllustrationRenderUrls(db: Db, bookId: string, appBaseUrl: string, assetSigningSecret: string) {
  const pages = await db.select().from(bookPages).where(eq(bookPages.bookId, bookId));
  const urls: Record<number, string> = {};
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  for (const page of pages) {
    if (!page.illustrationAssetId) continue;
    urls[page.pageNumber] = await signInternalAssetUrl({
      appBaseUrl,
      assetId: page.illustrationAssetId,
      secret: assetSigningSecret,
      expiresAt,
    });
  }
  return urls;
}

function assetIdFromUrl(value: string) {
  const match = value.match(/\/api\/assets\/([^/]+)\/download/);
  return match?.[1] ?? null;
}

function isSupportedReferenceContentType(contentType: string | undefined): contentType is IllustrationReferenceImage["contentType"] {
  return contentType === "image/png" || contentType === "image/jpeg" || contentType === "image/webp";
}

async function assertCurrentGeneration(db: Db, issueId: string, expectedStartedAt: string | null) {
  if (!expectedStartedAt) return;
  const issue = await db.query.bookIssues.findFirst({ where: eq(bookIssues.id, issueId) });
  if (issue?.generationStartedAt !== expectedStartedAt) {
    throw new StaleGenerationError();
  }
}

async function persistCanonIfNeeded(
  db: Db,
  issueId: string,
  episodeNumber: number,
  book: typeof books.$inferSelect,
  context: StoryContext,
  storyGenerator: StoryGenerator
) {
  const existingSummary = await db.query.episodeSummaries.findFirst({ where: eq(episodeSummaries.bookIssueId, issueId) });
  const existingMemory = await db.query.memoryEvents.findFirst({ where: eq(memoryEvents.sourceBookIssueId, issueId) });
  if (existingSummary && existingMemory) return { persisted: false };
  const extracted = await storyGenerator.extractCanon(context, JSON.parse(book.storyJson) as StoryManuscript);
  if (!existingSummary) {
    await db.insert(episodeSummaries).values({
      id: newId("summary"),
      bookIssueId: issueId,
      childId: context.child.id,
      universeId: context.universe.id,
      episodeNumber,
      title: book.title,
      summary: extracted.episodeSummary
    });
  }
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
  const pageAssets = await pageAssetIdsByNumber(db, book.id);
  const memoryResult = await persistExtractedMemory({
    db,
    extraction: extracted,
    childId: context.child.id,
    universeId: context.universe.id,
    sourceBookIssueId: issueId,
    validCharacterIds: context.characters.map((character) => character.id),
    pageAssetIdsByNumber: pageAssets,
  });
  return { persisted: true, canonEvents: extracted.canonEvents.length, memory: memoryResult };
}

async function deliverPendingEmail(
  db: Db,
  issueId: string,
  subscriptionId: string,
  bookId: string,
  resendApiKey: string | undefined,
  resendFromEmail: string,
  appBaseUrl: string,
  assetStore: R2AssetStore,
  expectedStartedAt: string | null
) {
  await assertCurrentGeneration(db, issueId, expectedStartedAt);
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
    await assertCurrentGeneration(db, issueId, expectedStartedAt);
    await deliverBook(db, provider, await buildDeliveryInput(db, delivery.id));
    sent += 1;
  }
  return { sent };
}

async function loadStoryContext(db: Db, bookIssueId: string, env?: Env): Promise<StoryContext> {
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
  return {
    child,
    universe,
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
    connectedWorlds: {
      probability: connectedChildIds.length > 0 ? 0.18 : 0,
      childIds: connectedChildIds
    },
  };
}

function coverPrompt(context: StoryContext, title: string): string {
  return [
    `Cover illustration for the story "${title}".`,
    `Feature only the locked cast: ${context.characters.map((character) => character.name).join(", ")}.`,
    "Use the supplied character reference images as identity anchors.",
    "No words, no letters, no signage, no title text, no captions, and no typography anywhere in the image.",
    "Leave the story title to the PDF layout."
  ].join(" ");
}

function characterStyleGuide(context: StoryContext): string {
  return `Polished modern children's picture book art. Warm, simple, expressive, safe for ages ${context.child.ageRange}. Never render text, letters, numbers, captions, logos, watermarks, or title typography inside illustrations. ${hardCharacterRules(context.characters)} Character canon: ${context.characters
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

  const source = lockedCharacters.length > 0
    ? lockedCharacters
    : worldCharacters.map((character, index) => ({
        ...character,
        sourceCharacterId: character.id,
        baseName: character.name,
        role: index === 0 ? "MAIN" as const : "SUPPORTING" as const
      }));

  return [...source].sort((left, right) => Number(right.role === "MAIN") - Number(left.role === "MAIN"));
}
