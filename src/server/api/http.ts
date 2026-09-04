import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { CharacterCastGenerator } from "../../ai/characters/cast-generator";
import { CharacterNameSuggestionService } from "../../ai/characters/name-suggestions";
import { createBookIssueForSubscription, getBookDetailForUser, listBooksForUser } from "../../domain/books/service";
import { archiveChild, createChild, createChildInputSchema, listChildrenForUser, updateChild, updateChildInputSchema, updateStoryInspiration } from "../../domain/children/service";
import { createSubscription, listSubscriptionsForUser, updateSubscriptionDeliveryEmail, updateSubscriptionDeliveryMethods, updateSubscriptionFrequency, updateSubscriptionSchedule } from "../../domain/subscriptions/service";
import { getChildInspirationSettings, getInspirationsForDate, inspirationSettingsForChild, listBookInspirations, listInspirationCatalog, updateChildInspirationSettings } from "../../domain/inspirations/service";
import { isGenerationDue } from "../../domain/scheduling/schedule";
import { getActiveCatalog } from "../../domain/universes/service";
import { newId } from "../../domain/ids";
import { parseJson, stringArraySchema } from "../../domain/json";
import { loadStoryContextFromEnv } from "../../domain/story-context/service";
import { inviteRelationship, inviteRelationshipInputSchema, listRelationshipsForUser, updateRelationshipStatus, updateRelationshipStatusInputSchema } from "../../domain/relationships/service";
import { buildDeliveryInput, deliverBook, EmailDeliveryProvider } from "../../email/delivery";
import { R2AssetStore } from "../../storage/asset-store";
import { verifyInternalAssetSignature, verifyPublicAssetDownloadSignature } from "../../storage/internal-asset-signing";
import { createAuth, getPrincipalAccess, getSessionUser, requirePermission } from "../auth/auth";
import { createDb, type Db } from "../db/client";
import {
  assets,
  bookIssues,
  bookPages,
  books,
  canonEvents,
  characters,
  childPreferences,
  children,
  deliveries,
  episodeSummaries,
  generationSteps,
  characterImageMemories,
  characterProfileMemories,
  characterRelationshipMemories,
  memoryEmbeddings,
  memoryEventEntities,
  memoryEvents,
  productDeliveryOptions,
  products,
  qaResults,
  sessions,
  subscriptionChildSlots,
  subscriptionDeliveryMethods,
  subscriptions,
  universes,
  userRoles,
  users
} from "../db/schema";
import type { Env } from "../env";
import { generationStepLabels, type GenerationStepName } from "../../workflows/generation-steps";

type Variables = {
  userId: string;
  userEmail: string;
};

const weekdaySchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);

export function createApi() {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();

  app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

  app.get("/api/internal/assets/:id/render", async (c) => {
    if (!c.env.BETTER_AUTH_SECRET) return c.json({ error: "Not found" }, 404);
    const assetId = c.req.param("id");
    const valid = await verifyInternalAssetSignature({
      assetId,
      expires: c.req.query("expires") ?? null,
      signature: c.req.query("signature") ?? null,
      secret: c.env.BETTER_AUTH_SECRET,
    });
    if (!valid) return c.json({ error: "Not found" }, 404);
    const object = await new R2AssetStore(createDb(c.env.DB), c.env.BOOK_ASSETS, c.env.APP_BASE_URL).get(assetId);
    if (!object || !object.httpMetadata?.contentType?.startsWith("image/")) return c.json({ error: "Not found" }, 404);
    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, max-age=900",
        "Content-Type": object.httpMetadata.contentType,
      },
    });
  });

  app.get("/api/public/assets/:id/download", async (c) => {
    if (!c.env.BETTER_AUTH_SECRET) return c.json({ error: "Not found" }, 404);
    const assetId = c.req.param("id");
    const valid = await verifyPublicAssetDownloadSignature({
      assetId,
      expires: c.req.query("expires") ?? null,
      signature: c.req.query("signature") ?? null,
      secret: c.env.BETTER_AUTH_SECRET,
    });
    if (!valid) return c.json({ error: "Not found" }, 404);
    const db = createDb(c.env.DB);
    const downloadable = await db
      .select({ asset: assets })
      .from(assets)
      .innerJoin(books, eq(books.pdfAssetId, assets.id))
      .innerJoin(bookIssues, eq(bookIssues.id, books.bookIssueId))
      .where(and(eq(assets.id, assetId), eq(assets.kind, "PDF"), eq(bookIssues.status, "DELIVERED")))
      .get();
    if (!downloadable) return c.json({ error: "Not found" }, 404);
    const object = await new R2AssetStore(db, c.env.BOOK_ASSETS, c.env.APP_BASE_URL).get(assetId);
    if (!object) return c.json({ error: "Not found" }, 404);
    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, max-age=604800",
        "Content-Disposition": `inline; filename="${assetId}.pdf"`,
        "Content-Type": object.httpMetadata?.contentType ?? "application/pdf",
      },
    });
  });

  app.use("/api/mcp/*", async (c, next) => {
    const configuredSecret = c.env.MCP_SHARED_SECRET;
    if (!configuredSecret) return c.json({ error: "MCP API is not configured" }, 404);
    const authorization = c.req.header("authorization") ?? "";
    if (authorization !== `Bearer ${configuredSecret}`) return c.json({ error: "Unauthorized" }, 401);
    return next();
  });

  app.get("/api/mcp/catalog", async (c) => c.json(await getActiveCatalog(createDb(c.env.DB))));

  app.get("/api/mcp/inspirations/catalog", async (c) => c.json(await listInspirationCatalog(createDb(c.env.DB))));

  app.get("/api/mcp/inspirations/date", async (c) => {
    const date = c.req.query("date") ?? new Date().toISOString();
    return c.json(await getInspirationsForDate(createDb(c.env.DB), { date }));
  });

  app.get("/api/mcp/generation-context/:id", async (c) => {
    const context = await loadStoryContextFromEnv(c.env, c.req.param("id"));
    return c.json(context);
  });

  app.use("/api/*", async (c, next) => {
    if (c.req.path.startsWith("/api/auth/")) return next();
    const user = await getSessionUser(c.req.raw, c.env);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    c.set("userId", user.id);
    c.set("userEmail", user.email);
    return next();
  });

  app.get("/api/catalog", async (c) => c.json(await getActiveCatalog(createDb(c.env.DB))));

  app.get("/api/inspirations/catalog", async (c) => c.json(toClientInspirationCatalog(await listInspirationCatalog(createDb(c.env.DB)))));

  app.get("/api/products", async (c) => c.json(await listProducts(createDb(c.env.DB))));

  app.get("/api/dashboard", async (c) => {
    const dashboard = await getDashboard(createDb(c.env.DB), c.get("userId"), c.get("userEmail"), c.req.query("childId") ?? null);
    if (!dashboard) return c.json({ error: "No active story subscription found" }, 404);
    return c.json(dashboard);
  });

  app.get("/api/profile", async (c) => {
    const user = await createDb(c.env.DB).query.users.findFirst({ where: eq(users.id, c.get("userId")) });
    return c.json({ id: c.get("userId"), email: c.get("userEmail"), name: user?.name ?? "" });
  });

  app.patch(
    "/api/profile",
    zValidator("json", z.object({ name: z.string().trim().max(120).nullable() })),
    async (c) => {
      await createDb(c.env.DB)
        .update(users)
        .set({ name: c.req.valid("json").name?.trim() || null, updatedAt: new Date().toISOString() })
        .where(eq(users.id, c.get("userId")));
      return c.json({ ok: true });
    }
  );

  app.post(
    "/api/character-names/suggest",
    zValidator(
      "json",
      z.object({
        universeName: z.string().min(1),
        characterSpecies: z.string().min(1).optional(),
        characterPersonality: z.string().min(1).optional(),
        count: z.number().int().min(1).max(100).optional()
      })
    ),
    async (c) => {
      const service = new CharacterNameSuggestionService(c.env.OPENAI_API_KEY, c.env.OPENAI_FAST_MODEL);
      return c.json({ names: await service.suggest(c.req.valid("json")) });
    }
  );

  app.post(
    "/api/characters/generate-cast",
    zValidator(
      "json",
      z.object({
        ageRange: z.enum(["1-11 months", "12-23 months", "2-3", "4-5", "6-8", "9-12"]),
        storyGenres: z.array(z.string().min(1)).max(12).default([]),
        interests: z.array(z.string().min(1)).max(16).default([])
      })
    ),
    async (c) => {
      const [product] = await listProducts(createDb(c.env.DB));
      if (!product) return c.json({ error: "No active story product found" }, 404);

      const generator = new CharacterCastGenerator(c.env.OPENAI_API_KEY, c.env.OPENAI_STORY_MODEL);
      const request = c.req.valid("json");
      const generationInput = {
        universeName: product.universe.name,
        universeDescription: product.universe.description,
        ageRange: request.ageRange,
        storyGenres: request.storyGenres,
        interests: request.interests,
        curatedCharacters: product.universe.characters
      };
      let generated;
      try {
        generated = await generator.generate(generationInput);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown character generation error";
        console.error("Character cast generation failed", { detail });
        return c.json({ error: "Character generation is temporarily unavailable. Please try again. If it continues, contact support." }, 503);
      }

      return c.json({ characters: generated });
    }
  );

  app.get("/api/children", async (c) => c.json(await listChildSummaries(createDb(c.env.DB), c.get("userId"))));

  app.post("/api/children", zValidator("json", createChildInputSchema), async (c) => {
    const child = await createChild(createDb(c.env.DB), c.get("userId"), c.req.valid("json"));
    return c.json(child, 201);
  });

  app.patch("/api/children/:id", zValidator("json", updateChildInputSchema), async (c) => {
    await updateChild(createDb(c.env.DB), c.get("userId"), c.req.param("id"), c.req.valid("json"));
    return c.json({ ok: true });
  });

  app.delete("/api/children/:id", async (c) => {
    const db = createDb(c.env.DB);
    await db
      .update(subscriptionChildSlots)
      .set({ status: "REMOVED", updatedAt: new Date().toISOString() })
      .where(eq(subscriptionChildSlots.childId, c.req.param("id")));
    await archiveChild(db, c.get("userId"), c.req.param("id"));
    return c.json({ ok: true });
  });

  app.patch(
    "/api/children/:id/inspiration",
    zValidator("json", z.object({ optionalParentNotes: z.string().max(1000).nullable() })),
    async (c) => {
      const child = await updateStoryInspiration(createDb(c.env.DB), c.get("userId"), c.req.param("id"), c.req.valid("json").optionalParentNotes);
      return c.json(child);
    }
  );

  app.get("/api/children/:id/inspiration-settings", async (c) => {
    return c.json(await getChildInspirationSettings(createDb(c.env.DB), c.get("userId"), c.req.param("id")));
  });

  app.patch(
    "/api/children/:id/inspiration-settings",
    zValidator("json", z.object({
      enabledSourceIds: z.array(z.string().min(1)),
      enabledThemeIds: z.array(z.string().min(1)),
      parentNotes: z.string().max(1000).nullable().optional(),
    })),
    async (c) => {
      const input = c.req.valid("json");
      return c.json(await updateChildInspirationSettings(createDb(c.env.DB), c.get("userId"), c.req.param("id"), {
        enabledSourceIds: input.enabledSourceIds,
        enabledThemeIds: input.enabledThemeIds,
        ...(input.parentNotes !== undefined ? { parentNotes: input.parentNotes } : {}),
      }));
    }
  );

  app.patch(
    "/api/children/current/inspiration",
    zValidator("json", z.object({ optionalParentNotes: z.string().max(1000).nullable() })),
    async (c) => {
      const db = createDb(c.env.DB);
      const current = await db.query.children.findFirst({
        where: eq(children.userId, c.get("userId")),
        orderBy: (table, { desc: descending }) => [descending(table.createdAt)]
      });
      if (!current) return c.json({ error: "Child not found" }, 404);
      const child = await updateStoryInspiration(db, c.get("userId"), current.id, c.req.valid("json").optionalParentNotes);
      return c.json({ notes: child.preferences?.optionalParentNotes ?? "" });
    }
  );

  app.get("/api/subscriptions", async (c) => c.json(await listSubscriptionsForUser(createDb(c.env.DB), c.get("userId"))));

  app.patch(
    "/api/subscriptions/:id/status",
    zValidator("json", z.object({ status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]) })),
    async (c) => {
      const db = createDb(c.env.DB);
      const subscription = await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.id, c.req.param("id")), eq(subscriptions.userId, c.get("userId"))) });
      if (!subscription) return c.json({ error: "Subscription not found" }, 404);
      await db.update(subscriptions).set({ status: c.req.valid("json").status, updatedAt: new Date().toISOString() }).where(eq(subscriptions.id, subscription.id));
      return c.json({ ok: true });
    }
  );

  app.patch(
    "/api/subscriptions/:id/frequency",
    zValidator("json", z.object({ frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]) })),
    async (c) => c.json(await updateSubscriptionFrequency(createDb(c.env.DB), c.get("userId"), c.req.param("id"), c.req.valid("json").frequency))
  );

  app.patch(
    "/api/subscriptions/:id/schedule",
    zValidator("json", z.object({
      frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
      deliveryDayOfWeek: weekdaySchema.optional()
    })),
    async (c) => {
      const input = c.req.valid("json");
      return c.json(await updateSubscriptionSchedule(createDb(c.env.DB), c.get("userId"), c.req.param("id"), {
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.deliveryDayOfWeek !== undefined ? { deliveryDayOfWeek: input.deliveryDayOfWeek } : {}),
      }));
    }
  );

  app.patch(
    "/api/subscriptions/:id/delivery",
    zValidator("json", z.object({ deliveryMethods: z.array(z.enum(["EMAIL", "MAIL"])).min(1) })),
    async (c) => c.json(await updateSubscriptionDeliveryMethods(createDb(c.env.DB), c.get("userId"), c.req.param("id"), c.req.valid("json").deliveryMethods))
  );

  app.patch(
    "/api/subscriptions/:id/delivery-email",
    zValidator("json", z.object({ deliveryEmail: z.string().trim().email().nullable() })),
    async (c) => c.json(await updateSubscriptionDeliveryEmail(createDb(c.env.DB), c.get("userId"), c.req.param("id"), c.req.valid("json").deliveryEmail))
  );

  app.delete("/api/subscriptions/:id", async (c) => {
    const db = createDb(c.env.DB);
    const subscription = await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.id, c.req.param("id")), eq(subscriptions.userId, c.get("userId"))) });
    if (!subscription) return c.json({ error: "Subscription not found" }, 404);
    await db.delete(subscriptions).where(eq(subscriptions.id, subscription.id));
    return c.json({ ok: true });
  });

  app.delete("/api/account", async (c) => {
    const db = createDb(c.env.DB);
    await db.delete(sessions).where(eq(sessions.userId, c.get("userId")));
    await db.delete(users).where(eq(users.id, c.get("userId")));
    return c.json({ ok: true });
  });

  app.get("/api/relationships", async (c) => c.json(await listRelationshipsForUser(createDb(c.env.DB), c.get("userId"))));

  app.post("/api/relationships", zValidator("json", inviteRelationshipInputSchema), async (c) => {
    return c.json(await inviteRelationship(createDb(c.env.DB), c.get("userId"), c.req.valid("json")), 201);
  });

  app.post(
    "/api/relationships/:id/status",
    zValidator("json", updateRelationshipStatusInputSchema),
    async (c) => c.json(await updateRelationshipStatus(createDb(c.env.DB), c.get("userId"), c.req.param("id"), c.req.valid("json")))
  );

  app.post(
    "/api/subscriptions",
    zValidator(
      "json",
      z.object({
        childId: z.string().min(1),
        productId: z.string().min(1),
        deliveryMethods: z.array(z.enum(["EMAIL", "MAIL"])).min(1),
        deliveryDayOfWeek: weekdaySchema.optional()
      })
    ),
    async (c) => {
      const db = createDb(c.env.DB);
      const input = c.req.valid("json");
      const result = await createSubscription(db, c.get("userId"), {
        childId: input.childId,
        productId: input.productId,
        deliveryMethods: input.deliveryMethods,
        ...(input.deliveryDayOfWeek !== undefined ? { deliveryDayOfWeek: input.deliveryDayOfWeek } : {}),
      });
      await startIssueWorkflow(db, c.env, result.firstIssue.id);
      return c.json(result, 201);
    }
  );

  app.get("/api/books", async (c) => {
    const db = createDb(c.env.DB);
    const records = await listBooksForUser(db, c.get("userId"));
    return c.json(await Promise.all(records.map(async (record) => (
      toClientBookIssue(record.issue, record.book, [], [], record.episodeSummary?.summary, await listBookInspirations(db, record.issue.id))
    ))));
  });

  app.get("/api/books/:id", async (c) => {
    const db = createDb(c.env.DB);
    const detail = await getBookDetailForUser(db, c.get("userId"), c.req.param("id"));
    return c.json(toClientBookIssue(detail.issue, detail.book, detail.pages, [], detail.episodeSummary?.summary, await listBookInspirations(db, detail.issue.id)));
  });

  app.post("/api/books/:id/resend-email", async (c) => {
    const db = createDb(c.env.DB);
    const detail = await getBookDetailForUser(db, c.get("userId"), c.req.param("id"));
    if (detail.issue.status !== "DELIVERED" || !detail.book?.pdfAssetId) {
      return c.json({ error: "This story is not ready to resend yet." }, 400);
    }
    if (!c.env.RESEND_API_KEY) return c.json({ error: "Email delivery is not configured." }, 503);
    await db
      .insert(deliveries)
      .values({
        id: newId("delivery"),
        bookIssueId: detail.issue.id,
        subscriptionId: detail.issue.subscriptionId,
        method: "EMAIL",
        provider: "resend",
        status: "PENDING",
      })
      .onConflictDoUpdate({
        target: [deliveries.bookIssueId, deliveries.subscriptionId, deliveries.method],
        set: {
          status: "PENDING",
          lastError: null,
        },
      });
    const delivery = await db.query.deliveries.findFirst({
      where: and(eq(deliveries.bookIssueId, detail.issue.id), eq(deliveries.subscriptionId, detail.issue.subscriptionId), eq(deliveries.method, "EMAIL")),
    });
    if (!delivery) return c.json({ error: "Could not prepare email delivery." }, 500);
    const provider = new EmailDeliveryProvider(c.env.RESEND_API_KEY, c.env.RESEND_FROM_EMAIL, new R2AssetStore(db, c.env.BOOK_ASSETS, c.env.APP_BASE_URL, c.env.BETTER_AUTH_SECRET), c.env.APP_BASE_URL);
    const result = await deliverBook(db, provider, await buildDeliveryInput(db, delivery.id));
    if (result.status === "FAILED") return c.json({ error: result.error ?? "Email delivery failed." }, 502);
    return c.json({ ok: true });
  });

  app.get("/api/r2/*", async (c) => {
    const key = c.req.path.replace("/api/r2/", "");
    const object = await c.env.BOOK_ASSETS.get(key);
    if (!object) return c.json({ error: "Not found" }, 404);
    return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream" } });
  });

  app.get("/api/assets/:id/download", async (c) => {
    const db = createDb(c.env.DB);
    const owned = await db
      .select({ asset: assets })
      .from(assets)
      .innerJoin(books, eq(books.pdfAssetId, assets.id))
      .innerJoin(bookIssues, eq(bookIssues.id, books.bookIssueId))
      .innerJoin(subscriptions, eq(subscriptions.id, bookIssues.subscriptionId))
      .where(and(eq(assets.id, c.req.param("id")), eq(subscriptions.userId, c.get("userId"))))
      .get();
    const adminEmails = (c.env.ADMIN_EMAILS ?? "").split(",").map((email: string) => email.trim().toLowerCase());
    const characterAssetOwned = owned ? true : await userOwnsCharacterAsset(db, c.get("userId"), c.req.param("id"));
    if (!owned && !characterAssetOwned && !adminEmails.includes(c.get("userEmail").toLowerCase())) return c.json({ error: "Not found" }, 404);
    const object = await new R2AssetStore(db, c.env.BOOK_ASSETS, c.env.APP_BASE_URL).get(c.req.param("id"));
    if (!object) return c.json({ error: "Not found" }, 404);
    return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream" } });
  });

  app.use("/api/admin/*", async (c, next) => {
    await requirePermission(createDb(c.env.DB), { id: c.get("userId"), email: c.get("userEmail") }, c.env, "admin:read");
    return next();
  });

  app.get("/api/admin/me", async (c) => {
    return c.json(await getPrincipalAccess(createDb(c.env.DB), { id: c.get("userId"), email: c.get("userEmail") }, c.env));
  });

  app.get("/api/admin/users", async (c) => {
    const db = createDb(c.env.DB);
    await requirePermission(db, { id: c.get("userId"), email: c.get("userEmail") }, c.env, "users:read");
    return c.json(await listAdminUsers(db));
  });

  app.get("/api/admin/children", async (c) => {
    const db = createDb(c.env.DB);
    return c.json(await listAdminChildren(db));
  });

  app.patch("/api/admin/children/:id", zValidator("json", updateChildInputSchema), async (c) => {
    const db = createDb(c.env.DB);
    await requirePermission(db, { id: c.get("userId"), email: c.get("userEmail") }, c.env, "content:review");
    const input = c.req.valid("json");
    await db
      .update(children)
      .set({
        firstName: input.firstName?.trim() || null,
        birthDate: input.birthDate ?? null,
        ageRange: input.ageRange,
        readingLevel: input.readingLevel ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(children.id, c.req.param("id")));
    if (input.optionalParentNotes !== undefined) {
      await db.update(childPreferences).set({ optionalParentNotes: input.optionalParentNotes, updatedAt: new Date().toISOString() }).where(eq(childPreferences.childId, c.req.param("id")));
    }
    return c.json({ ok: true });
  });

  app.post("/api/admin/children/:id/build-story-now", async (c) => {
    const db = createDb(c.env.DB);
    await requirePermission(db, { id: c.get("userId"), email: c.get("userEmail") }, c.env, "admin:retry");
    const childId = c.req.param("id");
    const slot = await db
      .select({ subscription: subscriptions })
      .from(subscriptionChildSlots)
      .innerJoin(subscriptions, eq(subscriptions.id, subscriptionChildSlots.subscriptionId))
      .where(and(eq(subscriptionChildSlots.childId, childId), eq(subscriptionChildSlots.status, "ACTIVE"), eq(subscriptions.status, "ACTIVE")))
      .get();
    const subscription = slot?.subscription ?? await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.childId, childId), eq(subscriptions.status, "ACTIVE")) });
    if (!subscription) return c.json({ error: "No active subscription for this child." }, 400);
    const existing = await db.query.bookIssues.findFirst({
      where: and(eq(bookIssues.subscriptionId, subscription.id), eq(bookIssues.childId, childId), inArray(bookIssues.status, ["SCHEDULED", "GENERATING", "READY", "DELIVERY_PENDING", "FAILED"])),
      orderBy: (table, { desc: descending }) => [descending(table.createdAt)]
    });
    const issue = existing ?? await createBookIssueForSubscription(db, subscription.id, new Date(), childId);
    if (issue.status === "FAILED") {
      await resetBookIssueForRetry(db, issue.id);
      await clearIssueWorkflowLock(db, c.env, issue.id);
    }
    await startIssueWorkflow(db, c.env, issue.id);
    return c.json({ issueId: issue.id });
  });

  app.get("/api/admin/subscriptions", async (c) => {
    const db = createDb(c.env.DB);
    return c.json(await listAdminSubscriptions(db));
  });

  app.get("/api/admin/book-issues", async (c) => {
    const db = createDb(c.env.DB);
    return c.json(await listAdminIssues(db));
  });

  app.get("/api/admin/book-issues/:id", async (c) => {
    const issue = await getAdminIssue(createDb(c.env.DB), c.req.param("id"));
    if (!issue) return c.json({ error: "Book issue not found" }, 404);
    return c.json(issue);
  });

  app.get("/api/admin/deliveries", async (c) => {
    const db = createDb(c.env.DB);
    return c.json(await db.select().from(deliveries).orderBy(desc(deliveries.createdAt)).limit(100));
  });

  app.get("/api/admin/memory", async (c) => {
    const db = createDb(c.env.DB);
    return c.json(await listAdminMemory(db));
  });

  app.get("/api/admin/world", async (c) => {
    return c.json(await getActiveCatalog(createDb(c.env.DB)));
  });

  app.get("/api/admin/inspirations", async (c) => {
    const catalog = await listInspirationCatalog(createDb(c.env.DB));
    return c.json(toAdminInspirationOverview(catalog));
  });

  app.post("/api/admin/memory/backfill", async (c) => {
    const db = createDb(c.env.DB);
    await requirePermission(db, { id: c.get("userId"), email: c.get("userEmail") }, c.env, "admin:retry");
    const rows = await db
      .select({ issue: bookIssues, book: books })
      .from(books)
      .innerJoin(bookIssues, eq(bookIssues.id, books.bookIssueId))
      .orderBy(desc(bookIssues.createdAt))
      .limit(100);
    let queued = 0;
    for (const row of rows) {
      const existing = await db.query.memoryEvents.findFirst({ where: eq(memoryEvents.sourceBookIssueId, row.issue.id) });
      if (existing) continue;
      await c.env.GENERATE_BOOK_WORKFLOW.create({
        id: `${row.issue.id}-memory-backfill-${crypto.randomUUID()}`,
        params: { bookIssueId: row.issue.id, memoryBackfillOnly: true },
      });
      queued += 1;
      if (queued >= 25) break;
    }
    return c.json({ queued });
  });

  app.post("/api/admin/book-issues/:id/retry", async (c) => {
    const db = createDb(c.env.DB);
    await requirePermission(db, { id: c.get("userId"), email: c.get("userEmail") }, c.env, "admin:retry");
    const issueId = c.req.param("id");
    await resetBookIssueForRetry(db, issueId);
    await clearIssueWorkflowLock(db, c.env, issueId);
    await startIssueWorkflow(db, c.env, issueId);
    return c.json({ ok: true });
  });

  app.post("/api/admin/book-issues/:id/steps/:stepId/retry", async (c) => {
    const db = createDb(c.env.DB);
    await requirePermission(db, { id: c.get("userId"), email: c.get("userEmail") }, c.env, "admin:retry");
    const issueId = c.req.param("id");
    await resetBookIssueForRetry(db, issueId);
    await clearIssueWorkflowLock(db, c.env, issueId);
    await startIssueWorkflow(db, c.env, issueId);
    return c.json({ ok: true });
  });

  app.get("/api/admin/failures", async (c) => {
    const db = createDb(c.env.DB);
    const failedIssues = await db.select().from(bookIssues).where(eq(bookIssues.status, "FAILED")).orderBy(desc(bookIssues.updatedAt)).limit(50);
    const failedDeliveries = await db.select().from(deliveries).where(eq(deliveries.status, "FAILED")).orderBy(desc(deliveries.createdAt)).limit(50);
    return c.json({ failedIssues, failedDeliveries });
  });

  app.notFound((c) => {
    if (!["GET", "HEAD"].includes(c.req.method) || c.req.path.startsWith("/api/")) {
      return c.text("Not found", 404);
    }
    if (c.req.path.split("/").some((part) => part.startsWith("."))) {
      return c.text("Not found", 404);
    }

    const url = new URL(c.req.url);
    url.pathname = "/";
    return c.env.ASSETS.fetch(new Request(url, c.req.raw));
  });

  return app;
}

export async function runScheduler(env: Env, now = new Date()) {
  const db = createDb(env.DB);
  const candidates = await db.select().from(subscriptions).where(eq(subscriptions.status, "ACTIVE")).limit(100);
  const due = candidates.filter((subscription) => isGenerationDue(subscription, now)).slice(0, 25);
  for (const subscription of due) {
    const { createBookIssueForSubscription } = await import("../../domain/books/service");
    const slots = await db.select().from(subscriptionChildSlots).where(and(eq(subscriptionChildSlots.subscriptionId, subscription.id), eq(subscriptionChildSlots.status, "ACTIVE")));
    const targetChildIds = slots.length > 0 ? slots.map((slot) => slot.childId) : [subscription.childId];
    for (const childId of targetChildIds) {
      const openIssue = await db.query.bookIssues.findFirst({
        where: and(eq(bookIssues.subscriptionId, subscription.id), eq(bookIssues.childId, childId), inArray(bookIssues.status, ["SCHEDULED", "GENERATING", "READY", "DELIVERY_PENDING", "FAILED"])),
        orderBy: (table, { desc: descending }) => [descending(table.createdAt)]
      });
      if (openIssue) {
        if (openIssue.status === "SCHEDULED" || openIssue.status === "FAILED") await startIssueWorkflow(db, env, openIssue.id);
        continue;
      }
      const issue = await createBookIssueForSubscription(db, subscription.id, new Date(subscription.nextIssueAt), childId);
      await startIssueWorkflow(db, env, issue.id);
    }
  }
}

async function startIssueWorkflow(db: Db, env: Env, bookIssueId: string) {
  const issue = await db.query.bookIssues.findFirst({ where: eq(bookIssues.id, bookIssueId) });
  if (!issue) throw new Error(`Book issue ${bookIssueId} not found`);
  if (env.MEMBER_WORLD) {
    const objectId = env.MEMBER_WORLD.idFromName(issue.childId);
    const object = env.MEMBER_WORLD.get(objectId);
    const response = await object.fetch("https://member-world/start-issue", {
      method: "POST",
      body: JSON.stringify({ action: "START_ISSUE", bookIssueId }),
    });
    if (!response.ok) throw new Error(`Member world coordination failed: ${response.status}`);
    return;
  }
  const preferences = await db.query.childPreferences.findFirst({ where: eq(childPreferences.childId, issue.childId) });
  if (!isWorldReady(preferences?.selectedCharacterCastJson)) {
    await env.BUILD_WORLD_WORKFLOW.create({
      id: `${bookIssueId}-world-${crypto.randomUUID()}`,
      params: { childId: issue.childId, firstIssueId: bookIssueId },
    });
    return;
  }
  await startWorkflow(env, bookIssueId);
}

const storyRetrySteps: GenerationStepName[] = [
  "CLAIM_ISSUE",
  "LOAD_CONTEXT",
  "GENERATE_OUTLINE",
  "GENERATE_MANUSCRIPT",
  "REVISE_MANUSCRIPT",
  "STORY_QA",
  "SAVE_BOOK",
  "GENERATE_ILLUSTRATIONS",
  "RENDER_PDF",
  "PERSIST_CANON",
  "SEND_DELIVERIES",
  "ADVANCE_SUBSCRIPTION",
  "EMBED_MEMORY",
  "PROMOTE_IMAGE_MEMORIES",
];

async function resetBookIssueForRetry(db: Db, bookIssueId: string) {
  const sourcedMemoryEvents = await db.select().from(memoryEvents).where(eq(memoryEvents.sourceBookIssueId, bookIssueId));
  const sourcedMemoryEventIds = sourcedMemoryEvents.map((event) => event.id);
  if (sourcedMemoryEventIds.length > 0) {
    await db.delete(memoryEmbeddings).where(and(eq(memoryEmbeddings.recordType, "memory_event"), inArray(memoryEmbeddings.recordId, sourcedMemoryEventIds)));
  }
  await db.delete(characterImageMemories).where(eq(characterImageMemories.sourceBookIssueId, bookIssueId));
  await db.delete(characterProfileMemories).where(eq(characterProfileMemories.sourceBookIssueId, bookIssueId));
  await db.delete(characterRelationshipMemories).where(eq(characterRelationshipMemories.sourceBookIssueId, bookIssueId));
  await db.delete(memoryEvents).where(eq(memoryEvents.sourceBookIssueId, bookIssueId));
  await db.delete(deliveries).where(eq(deliveries.bookIssueId, bookIssueId));
  await db.delete(qaResults).where(eq(qaResults.bookIssueId, bookIssueId));
  await db.delete(episodeSummaries).where(eq(episodeSummaries.bookIssueId, bookIssueId));
  await db.update(canonEvents).set({ bookIssueId: null }).where(eq(canonEvents.bookIssueId, bookIssueId));
  await db.delete(books).where(eq(books.bookIssueId, bookIssueId));
  await db.delete(generationSteps).where(and(eq(generationSteps.bookIssueId, bookIssueId), inArray(generationSteps.step, storyRetrySteps)));
  await db
    .update(bookIssues)
    .set({
      status: "SCHEDULED",
      generationStartedAt: null,
      generationRunId: null,
      readyAt: null,
      deliveredAt: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bookIssues.id, bookIssueId));
}

async function clearIssueWorkflowLock(db: Db, env: Env, bookIssueId: string) {
  if (!env.MEMBER_WORLD) return;
  const issue = await db.query.bookIssues.findFirst({ where: eq(bookIssues.id, bookIssueId) });
  if (!issue) return;
  const object = env.MEMBER_WORLD.get(env.MEMBER_WORLD.idFromName(issue.childId));
  await object.fetch("https://member-world/clear-issue-lock", {
    method: "POST",
    body: JSON.stringify({ action: "CLEAR_ISSUE_LOCK", bookIssueId }),
  });
}

async function startWorkflow(env: Env, bookIssueId: string) {
  await env.GENERATE_BOOK_WORKFLOW.create({
    id: `${bookIssueId}-${crypto.randomUUID()}`,
    params: { bookIssueId }
  });
}

async function getDashboard(db: Db, userId: string, userEmail: string, childId: string | null = null) {
  const subscription = childId
    ? await findSubscriptionForChild(db, userId, childId)
    : await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
        orderBy: (table, { desc: descending }) => [descending(table.createdAt)]
      });
  if (!subscription) return null;

  const child = await db.query.children.findFirst({ where: eq(children.id, childId ?? subscription.childId), with: { preferences: true } });
  const product = await db.query.products.findFirst({ where: eq(products.id, subscription.productId) });
  if (!child || !product) return null;

  const [clientProduct] = await listProducts(db);
  const allChildren = await listChildSummaries(db, userId);
  const bookRecords = await listBooksForUser(db, userId);
  const clientBooks = await Promise.all(bookRecords.map(async (record) => {
    if (record.issue.childId !== child.id) return null;
    const pages = record.book ? await db.select().from(bookPages).where(eq(bookPages.bookId, record.book.id)) : [];
    return toClientBookIssue(record.issue, record.book, pages, [], record.episodeSummary?.summary, await listBookInspirations(db, record.issue.id));
  }));
  const childBooks = clientBooks.filter((book): book is NonNullable<typeof book> => Boolean(book));
  const currentIssue = pickCurrentDashboardIssue(childBooks);
  if (!clientProduct || !currentIssue) return null;
  const methods = await db.select().from(subscriptionDeliveryMethods).where(and(eq(subscriptionDeliveryMethods.subscriptionId, subscription.id), eq(subscriptionDeliveryMethods.enabled, true)));

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  return {
    user: { id: userId, email: userEmail, name: user?.name ?? "" },
    children: allChildren,
    child: {
      id: child.id,
      firstName: child.firstName,
      birthDate: child.birthDate,
      ageRange: child.ageRange,
      readingLevel: normalizeReadingLevel(child.readingLevel),
      storyGenres: parseJson(child.preferences?.storyGenresJson ?? "[]", stringArraySchema),
      interests: parseJson(child.preferences?.interestsJson ?? "[]", stringArraySchema),
      favoriteCharacters: parseJson(child.preferences?.favoriteCharacterIdsJson ?? "[]", stringArraySchema),
      selectedCharacters: parseJson(child.preferences?.selectedCharacterCastJson ?? "[]", z.array(z.object({
        characterId: z.string(),
        sourceCharacterId: z.string().nullable().optional(),
        displayName: z.string(),
        species: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        personality: z.string().nullable().optional(),
        profileImageUrls: z.array(z.string()).optional(),
        imageStatus: z.enum(["PENDING", "READY", "FAILED"]).optional(),
        role: z.enum(["MAIN", "SUPPORTING"])
      }))),
      charactersLockedAt: child.preferences?.charactersLockedAt ?? null,
      worldBuildStatus: isWorldReady(child.preferences?.selectedCharacterCastJson) ? "READY" : "BUILDING",
      parentNotes: child.preferences?.optionalParentNotes ?? "",
      inspirationSettings: inspirationSettingsForChild(child.id, child.preferences)
    },
    subscription: {
      id: subscription.id,
      status: subscription.status,
      product: clientProduct,
      frequency: subscription.frequency,
      childSlots: subscription.childSlots,
      usedChildSlots: await countUsedChildSlots(db, subscription.id),
      deliveryEmail: subscription.deliveryEmail,
      deliveryDayOfWeek: subscription.deliveryDayOfWeek,
      generationLeadHours: subscription.generationLeadHours,
      nextIssueAt: subscription.nextIssueAt,
      nextPaymentAt: subscription.nextIssueAt,
      lastIssueAt: subscription.lastIssueAt,
      deliveryMethods: methods.map((method) => method.method)
    },
    currentIssue,
    books: childBooks,
    relationships: await listRelationshipsForUser(db, userId)
  };
}

async function findSubscriptionForChild(db: Db, userId: string, childId: string) {
  const slot = await db
    .select({ subscription: subscriptions })
    .from(subscriptionChildSlots)
    .innerJoin(subscriptions, eq(subscriptions.id, subscriptionChildSlots.subscriptionId))
    .where(and(eq(subscriptions.userId, userId), eq(subscriptionChildSlots.childId, childId), eq(subscriptionChildSlots.status, "ACTIVE")))
    .get();
  if (slot) return slot.subscription;
  return db.query.subscriptions.findFirst({ where: and(eq(subscriptions.userId, userId), eq(subscriptions.childId, childId)) });
}

async function listProducts(db: Db) {
  const productRows = await db.select().from(products).where(eq(products.active, true));
  const universeRows = await db.select().from(universes).where(eq(universes.active, true));
  const characterRows = await db.select().from(characters).where(eq(characters.active, true));
  const deliveryRows = await db.select().from(productDeliveryOptions);

  return productRows.map((product) => {
    const universe = universeRows.find((row) => row.id === product.universeId);
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      frequencyLabel: product.frequency.toLowerCase(),
      universe: {
        id: universe?.id ?? product.universeId,
        slug: universe?.slug ?? "",
        name: universe?.name ?? "Story World",
        description: universe?.description ?? "",
        locations: [],
        characters: characterRows.filter((character) => character.universeId === product.universeId).map(toClientCharacter)
      },
      deliveryOptions: deliveryRows.filter((option) => option.productId === product.id).map((option) => ({
        method: option.method,
        availability: option.availability,
        label: option.method === "EMAIL" ? "Email PDF" : "Printed mail",
        description: option.method === "EMAIL" ? "A secure download link arrives automatically." : "Physical storybooks are planned for a future release."
      }))
    };
  });
}

async function listChildSummaries(db: Db, userId: string) {
  const rows = await listChildrenForUser(db, userId);
  const subscriptionRows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  const slotRows = await db.select().from(subscriptionChildSlots).innerJoin(subscriptions, eq(subscriptions.id, subscriptionChildSlots.subscriptionId)).where(eq(subscriptions.userId, userId));
  const issueRows = await db
    .select({ issue: bookIssues })
    .from(bookIssues)
    .innerJoin(subscriptions, eq(subscriptions.id, bookIssues.subscriptionId))
    .where(eq(subscriptions.userId, userId));

  return rows.map((child) => {
    const activeSlot = slotRows.find((row) => row.subscription_child_slots.childId === child.id && row.subscription_child_slots.status === "ACTIVE");
    const activeSubscription = activeSlot
      ? subscriptionRows.find((subscription) => subscription.id === activeSlot.subscription_child_slots.subscriptionId) ?? null
      : subscriptionRows.find((subscription) => subscription.childId === child.id && subscription.status === "ACTIVE") ?? null;
    const latestIssue = issueRows
      .map((row) => row.issue)
      .filter((issue) => issue.childId === child.id)
      .sort((left, right) => right.episodeNumber - left.episodeNumber)[0] ?? null;

    return {
      id: child.id,
      firstName: child.firstName,
      birthDate: child.birthDate,
      ageRange: child.ageRange,
      readingLevel: normalizeReadingLevel(child.readingLevel),
      parentNotes: child.preferences?.optionalParentNotes ?? "",
      inspirationSettings: inspirationSettingsForChild(child.id, child.preferences),
      worldBuildStatus: isWorldReady(child.preferences?.selectedCharacterCastJson) ? "READY" : "BUILDING",
      activeSubscriptionId: activeSubscription?.id ?? null,
      latestBookIssueId: latestIssue?.id ?? null,
      latestBookStatus: latestIssue?.status ?? null,
      archivedAt: null
    };
  });
}

async function countUsedChildSlots(db: Db, subscriptionId: string) {
  const slots = await db.select().from(subscriptionChildSlots).where(and(eq(subscriptionChildSlots.subscriptionId, subscriptionId), eq(subscriptionChildSlots.status, "ACTIVE")));
  return slots.length;
}

async function listAdminUsers(db: Db) {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
  const childRows = await db.select().from(children);
  const subscriptionRows = await db.select().from(subscriptions);
  const roleRows = await db.select().from(userRoles);
  return rows.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    roles: roleRows.filter((role) => role.userId === user.id).map((role) => role.role),
    childrenCount: childRows.filter((child) => child.userId === user.id).length,
    subscriptionsCount: subscriptionRows.filter((subscription) => subscription.userId === user.id).length,
    createdAt: user.createdAt,
  }));
}

async function listAdminChildren(db: Db) {
  const records = await db
    .select({ child: children, preferences: childPreferences, user: users })
    .from(children)
    .innerJoin(users, eq(users.id, children.userId))
    .leftJoin(childPreferences, eq(childPreferences.childId, children.id))
    .orderBy(desc(children.createdAt))
    .limit(100);
  const slotRows = await db.select().from(subscriptionChildSlots).where(eq(subscriptionChildSlots.status, "ACTIVE"));
  const issueRows = await db.select().from(bookIssues).orderBy(desc(bookIssues.createdAt));

  return records.map((record) => {
    const selected = parseJson(record.preferences?.selectedCharacterCastJson ?? "[]", z.array(z.object({ characterId: z.string(), profileImageUrls: z.array(z.string()).optional(), imageStatus: z.string().optional() })));
    const activeSlot = slotRows.find((slot) => slot.childId === record.child.id);
    const latestIssue = issueRows.find((issue) => issue.childId === record.child.id);
    return {
      id: record.child.id,
      parentEmail: record.user.email,
      firstName: record.child.firstName,
      birthDate: record.child.birthDate,
      ageRange: record.child.ageRange,
      readingLevel: record.child.readingLevel,
      worldBuildStatus: isWorldReady(record.preferences?.selectedCharacterCastJson) ? "READY" : "BUILDING",
      selectedCharacterCount: selected.length,
      activeSubscriptionId: activeSlot?.subscriptionId ?? null,
      latestIssueStatus: latestIssue?.status ?? null,
      createdAt: record.child.createdAt,
    };
  });
}

async function listAdminSubscriptions(db: Db) {
  const records = await db
    .select({ subscription: subscriptions, product: products, user: users })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(100);
  const slotRows = await db.select().from(subscriptionChildSlots).where(eq(subscriptionChildSlots.status, "ACTIVE"));
  const methodRows = await db.select().from(subscriptionDeliveryMethods).where(eq(subscriptionDeliveryMethods.enabled, true));

  return records.map((record) => ({
    id: record.subscription.id,
    parentEmail: record.user.email,
    status: record.subscription.status,
    productName: record.product.name,
    frequency: record.subscription.frequency,
    childSlots: record.subscription.childSlots,
    usedChildSlots: slotRows.filter((slot) => slot.subscriptionId === record.subscription.id).length,
    deliveryMethods: methodRows.filter((method) => method.subscriptionId === record.subscription.id).map((method) => method.method),
    deliveryEmail: record.subscription.deliveryEmail,
    deliveryDayOfWeek: record.subscription.deliveryDayOfWeek,
    nextIssueAt: record.subscription.nextIssueAt,
    lastIssueAt: record.subscription.lastIssueAt,
    createdAt: record.subscription.createdAt,
  }));
}

async function listAdminMemory(db: Db) {
  const events = await db.select().from(memoryEvents).orderBy(desc(memoryEvents.createdAt)).limit(100);
  const eventIds = events.map((event) => event.id);
  const entities = eventIds.length > 0 ? await db.select().from(memoryEventEntities).where(inArray(memoryEventEntities.memoryEventId, eventIds)) : [];
  const embeddings = eventIds.length > 0 ? await db.select().from(memoryEmbeddings).where(and(eq(memoryEmbeddings.recordType, "memory_event"), inArray(memoryEmbeddings.recordId, eventIds))) : [];
  const imageRows = await db.select().from(characterImageMemories).orderBy(desc(characterImageMemories.createdAt)).limit(50);
  const profileRows = await db.select().from(characterProfileMemories).orderBy(desc(characterProfileMemories.createdAt)).limit(50);
  const relationshipRows = await db.select().from(characterRelationshipMemories).orderBy(desc(characterRelationshipMemories.createdAt)).limit(50);

  return {
    events: events.map((event) => ({
      id: event.id,
      childId: event.childId,
      universeId: event.universeId,
      sourceBookIssueId: event.sourceBookIssueId,
      scope: event.scope,
      eventType: event.eventType,
      summary: event.summary,
      importance: event.importance,
      confidence: event.confidence,
      storyTime: event.storyTime,
      createdAt: event.createdAt,
      entities: entities
        .filter((entity) => entity.memoryEventId === event.id)
        .map((entity) => ({ entityType: entity.entityType, entityId: entity.entityId })),
      embeddingStatus: embeddings.find((embedding) => embedding.recordId === event.id)?.status ?? "PENDING",
    })),
    characterProfiles: profileRows,
    relationships: relationshipRows,
    imageMemories: imageRows,
  };
}

async function listAdminIssues(db: Db) {
  const records = await db
    .select({ issue: bookIssues, book: books, child: children, subscription: subscriptions, user: users })
    .from(bookIssues)
    .innerJoin(subscriptions, eq(subscriptions.id, bookIssues.subscriptionId))
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .innerJoin(children, eq(children.id, bookIssues.childId))
    .leftJoin(books, eq(books.bookIssueId, bookIssues.id))
    .orderBy(desc(bookIssues.createdAt))
    .limit(100);

  return Promise.all(records.map(async (record) => {
    const pages = record.book ? await db.select().from(bookPages).where(eq(bookPages.bookId, record.book.id)) : [];
    const workflow = await db.select().from(generationSteps).where(eq(generationSteps.bookIssueId, record.issue.id));
    const qa = await db.select().from(qaResults).where(eq(qaResults.bookIssueId, record.issue.id));
    const attempts = await db.select().from(deliveries).where(eq(deliveries.bookIssueId, record.issue.id));
    return {
      ...toClientBookIssue(record.issue, record.book, pages, workflow, undefined, await listBookInspirations(db, record.issue.id)),
      childLabel: record.child.firstName ?? `Ages ${record.child.ageRange}`,
      parentEmail: record.user.email,
      qaResult: qa.some((result) => !result.passed) ? "FAIL" : record.issue.status === "GENERATING" ? "REVIEW" : "PASS",
      rawError: record.issue.lastError,
      deliveryAttempts: attempts.map((attempt) => ({
        id: attempt.id,
        method: attempt.method,
        status: attempt.status,
        attemptedAt: attempt.createdAt,
        detail: attempt.lastError ?? attempt.providerReference ?? attempt.status
      }))
    };
  }));
}

async function getAdminIssue(db: Db, issueId: string) {
  const issues = await listAdminIssues(db);
  return issues.find((issue) => issue.id === issueId) ?? null;
}

function toClientBookIssue(
  issue: typeof bookIssues.$inferSelect,
  book?: typeof books.$inferSelect | null,
  pages: Array<typeof bookPages.$inferSelect> = [],
  workflow: Array<typeof generationSteps.$inferSelect> = [],
  episodeSummary?: string | null,
  inspirations: Awaited<ReturnType<typeof listBookInspirations>> = []
) {
  return {
    id: issue.id,
    supportCode: supportCode(issue.id),
    episodeNumber: issue.episodeNumber,
    title: book?.title ?? `Episode ${issue.episodeNumber}`,
    subtitle: book?.subtitle ?? null,
    typography: book ? bookTypography(book.storyJson) : "storybook",
    writingStyle: book ? bookWritingStyle(book.storyJson) : "rhymed_verse",
    status: issue.status,
    scheduledFor: issue.scheduledFor,
    readyAt: issue.readyAt,
    deliveredAt: issue.deliveredAt,
    coverUrl: assetUrl(pages.find((page) => page.pageType === "COVER")?.illustrationAssetId),
    pdfUrl: book?.pdfAssetId ? `/api/assets/${book.pdfAssetId}/download` : null,
    summary: episodeSummary ?? (book ? summarizeBook(book.storyJson) : "This episode is scheduled."),
    pages: pages.map((page) => ({
      id: page.id,
      pageNumber: page.pageNumber,
      pageType: page.pageType,
      text: page.text,
      illustrationUrl: assetUrl(page.illustrationAssetId)
    })),
    workflow: workflow.map((step) => ({
      id: step.id,
      label: generationStepLabels[step.step as GenerationStepName] ?? step.step,
      status: normalizeStepStatus(step.status),
      timestamp: step.completedAt ?? step.startedAt
    })),
    inspirations: inspirations.map(toClientInspirationSelection)
  };
}

function toClientInspirationSelection(inspiration: Awaited<ReturnType<typeof listBookInspirations>>[number]) {
  return {
    id: inspiration.id,
    sourceId: inspiration.sourceId,
    sourceLabel: inspiration.sourceLabel,
    itemLabel: inspiration.title,
    themeLabels: [],
    childFacingMode: inspiration.childFacingMode === "OFF" ? "HIDDEN" : inspiration.childFacingMode,
  };
}

function toClientInspirationCatalog(catalog: Awaited<ReturnType<typeof listInspirationCatalog>>) {
  return {
    sources: catalog.sources.map((source) => ({
      id: source.id,
      key: source.slug,
      label: source.label,
      description: source.description,
      type: source.kind,
      status: source.enabled ? "ACTIVE" : "DISABLED",
    })),
    themes: catalog.themes.map((theme) => ({
      id: theme.id,
      key: theme.slug,
      label: theme.label,
      description: theme.description,
      enabled: theme.enabled,
    })),
  };
}

function toAdminInspirationOverview(catalog: Awaited<ReturnType<typeof listInspirationCatalog>>) {
  const clientCatalog = toClientInspirationCatalog(catalog);
  const sourcesById = new Map(clientCatalog.sources.map((source) => [source.id, source]));
  const themesById = new Map(clientCatalog.themes.map((theme) => [theme.id, theme]));
  return {
    catalog: clientCatalog,
    mappings: catalog.mappings.map((mapping) => ({
      id: mapping.id,
      sourceId: mapping.sourceId ?? "",
      sourceLabel: mapping.sourceId ? sourcesById.get(mapping.sourceId)?.label ?? "Source" : "Any source",
      itemLabel: mapping.itemExternalKey ?? "Default mapping",
      themeLabels: [themesById.get(mapping.themeId)?.label ?? mapping.themeId],
      ageGuidance: null,
      promptGuidance: mapping.promptGuidance,
      status: mapping.enabled ? "ACTIVE" : "DISABLED",
      updatedAt: mapping.updatedAt,
    })),
    providerStatuses: clientCatalog.sources
      .filter((source) => source.type !== "CURATED")
      .map((source) => ({
        sourceId: source.id,
        sourceLabel: source.label,
        status: source.status,
        lastSyncedAt: null,
        lastError: null,
      })),
  };
}

function supportCode(issueId: string) {
  return `LW-${issueId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
}

function isWorldReady(selectedCharacterCastJson?: string | null) {
  const selected = parseJson(selectedCharacterCastJson ?? "[]", z.array(z.object({
    profileImageUrls: z.array(z.string()).optional(),
    imageStatus: z.enum(["PENDING", "READY", "FAILED"]).optional()
  })));
  return selected.length > 0 && selected.every((character) => character.imageStatus === "READY" && (character.profileImageUrls?.length ?? 0) >= 3);
}

function toClientCharacter(character: typeof characters.$inferSelect) {
  const profilePointers = parseJson(character.profileImagesJson, stringArraySchema).slice(0, 3);
  return {
    id: character.id,
    name: character.name,
    species: speciesFromVisualDescription(character.visualDescriptionJson),
    description: character.description,
    personality: character.personality,
    portraitUrl: r2PublicUrl(profilePointers[0]),
    profileImages: profilePointers.map(r2PublicUrl),
    hiddenStyleReferenceIds: parseJson(character.hiddenStyleReferencesJson, stringArraySchema),
    color: "#6f8f52"
  };
}

function assetUrl(assetId?: string | null) {
  return assetId ? `/api/assets/${assetId}/download` : "";
}

async function userOwnsCharacterAsset(db: Db, userId: string, assetId: string) {
  const rows = await db
    .select({ selectedCharacterCastJson: childPreferences.selectedCharacterCastJson })
    .from(childPreferences)
    .innerJoin(children, eq(children.id, childPreferences.childId))
    .where(eq(children.userId, userId));

  return rows.some((row) => {
    const cast = parseJson(row.selectedCharacterCastJson, z.array(z.object({ profileImageUrls: z.array(z.string()).optional() })));
    return cast.some((character) => character.profileImageUrls?.some((url) => url.includes(`/api/assets/${assetId}/download`)));
  });
}

function r2PublicUrl(pointer?: string) {
  if (!pointer) return "";
  return `/api/r2/${pointer.replace("r2://book-assets/", "")}`;
}

function speciesFromVisualDescription(value: string) {
  const parsed = JSON.parse(value) as { species?: string };
  return parsed.species ?? "Friend";
}

function summarizeBook(storyJson: string) {
  const parsed = JSON.parse(storyJson) as { pages?: Array<{ text?: string }> };
  const storyText = parsed.pages?.map((page) => page.text).filter(Boolean).join(" ");
  if (!storyText) return "A new story is ready.";
  return storyText.length > 280 ? `${storyText.slice(0, 277).trim()}...` : storyText;
}

function bookTypography(storyJson: string): "storybook" | "adventure" | "cozy" | "mystery" | "bedtime" {
  try {
    const parsed = JSON.parse(storyJson) as { typography?: string };
    if (parsed.typography === "adventure" || parsed.typography === "cozy" || parsed.typography === "mystery" || parsed.typography === "bedtime") {
      return parsed.typography;
    }
    return "storybook";
  } catch {
    return "storybook";
  }
}

function bookWritingStyle(storyJson: string): "rhymed_verse" | "rhythmic_repetition" | "call_and_response" | "gentle_prose" {
  try {
    const parsed = JSON.parse(storyJson) as { writingStyle?: string };
    if (parsed.writingStyle === "rhythmic_repetition" || parsed.writingStyle === "call_and_response" || parsed.writingStyle === "gentle_prose") {
      return parsed.writingStyle;
    }
    return "rhymed_verse";
  } catch {
    return "rhymed_verse";
  }
}

function normalizeReadingLevel(value: string | null) {
  if (value === "pre") return "Pre-reader";
  if (value === "early") return "Early reader";
  if (value === "growing") return "Growing reader";
  return value;
}

function pickCurrentDashboardIssue<T extends { episodeNumber: number; status: string }>(issues: T[]): T | undefined {
  const latestDelivered = issues.find((issue) => issue.status === "DELIVERED");
  const activeIssue = issues.find((issue) => issue.status !== "DELIVERED" && (!latestDelivered || issue.episodeNumber >= latestDelivered.episodeNumber));
  return activeIssue ?? latestDelivered ?? issues[0];
}

function normalizeStepStatus(status: string) {
  if (status === "COMPLETED") return "COMPLETE";
  if (status === "RUNNING") return "CURRENT";
  if (status === "FAILED") return "FAILED";
  return "PENDING";
}
