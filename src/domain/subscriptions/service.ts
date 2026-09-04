import { and, eq, lte } from "drizzle-orm";
import { createBookIssueForSubscription } from "../books/service";
import { newId } from "../ids";
import { nextIssueDate } from "../scheduling/schedule";
import type { DeliveryMethod, SubscriptionFrequency } from "../types";
import type { Db } from "../../server/db/client";
import { children, productDeliveryOptions, products, subscriptionChildSlots, subscriptionDeliveryMethods, subscriptions } from "../../server/db/schema";

export async function createSubscription(
  db: Db,
  userId: string,
  input: { childId: string; productId: string; deliveryMethods: DeliveryMethod[] },
  now = new Date()
) {
  const child = await db.query.children.findFirst({ where: and(eq(children.id, input.childId), eq(children.userId, userId)) });
  if (!child) throw new Response("Child not found", { status: 404 });
  const product = await db.query.products.findFirst({ where: and(eq(products.id, input.productId), eq(products.active, true)) });
  if (!product) throw new Response("Product not found", { status: 404 });

  const enabledOptions = await db
    .select()
    .from(productDeliveryOptions)
    .where(and(eq(productDeliveryOptions.productId, product.id), eq(productDeliveryOptions.availability, "ENABLED")));
  const enabledMethods = new Set(enabledOptions.map((option) => option.method));
  for (const method of input.deliveryMethods) {
    if (!enabledMethods.has(method)) throw new Response(`Delivery method ${method} is not available`, { status: 400 });
  }

  let subscription = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, userId), eq(subscriptions.productId, product.id), eq(subscriptions.status, "ACTIVE")),
    orderBy: (table, { desc }) => [desc(table.createdAt)]
  });

  if (!subscription) {
    const id = newId("sub");
    await db.insert(subscriptions).values({
      id,
      userId,
      childId: child.id,
      productId: product.id,
      status: "ACTIVE",
      frequency: product.frequency,
      childSlots: 3,
      nextIssueAt: now.toISOString()
    });
    subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, id) });
  }
  if (!subscription) throw new Error("Failed to create or load subscription");

  const existingSlots = await db.select().from(subscriptionChildSlots).where(and(eq(subscriptionChildSlots.subscriptionId, subscription.id), eq(subscriptionChildSlots.status, "ACTIVE")));
  const existingSlot = existingSlots.find((slot) => slot.childId === child.id);
  if (!existingSlot && existingSlots.length >= subscription.childSlots) {
    throw new Response("This subscription has no available child slots", { status: 400 });
  }

  await db
    .insert(subscriptionChildSlots)
    .values({ id: newId("slot"), subscriptionId: subscription.id, childId: child.id, status: "ACTIVE" })
    .onConflictDoUpdate({ target: [subscriptionChildSlots.subscriptionId, subscriptionChildSlots.childId], set: { status: "ACTIVE", updatedAt: new Date().toISOString() } });

  for (const method of input.deliveryMethods) {
    await db
      .insert(subscriptionDeliveryMethods)
      .values({ id: newId("sdm"), subscriptionId: subscription.id, method, enabled: true })
      .onConflictDoUpdate({ target: [subscriptionDeliveryMethods.subscriptionId, subscriptionDeliveryMethods.method], set: { enabled: true } });
  }

  const issue = await createBookIssueForSubscription(db, subscription.id, now, child.id);
  return { subscription, firstIssue: issue };
}

export async function updateSubscriptionDeliveryMethods(
  db: Db,
  userId: string,
  subscriptionId: string,
  deliveryMethods: DeliveryMethod[]
) {
  const subscription = await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)) });
  if (!subscription) throw new Response("Subscription not found", { status: 404 });

  const enabledOptions = await db
    .select()
    .from(productDeliveryOptions)
    .where(and(eq(productDeliveryOptions.productId, subscription.productId), eq(productDeliveryOptions.availability, "ENABLED")));
  const enabledMethods = new Set(enabledOptions.map((option) => option.method));
  for (const method of deliveryMethods) {
    if (!enabledMethods.has(method)) throw new Response(`Delivery method ${method} is not available`, { status: 400 });
  }
  if (deliveryMethods.length === 0) throw new Response("At least one delivery method is required", { status: 400 });

  await db.update(subscriptionDeliveryMethods).set({ enabled: false, updatedAt: new Date().toISOString() }).where(eq(subscriptionDeliveryMethods.subscriptionId, subscription.id));
  for (const method of deliveryMethods) {
    await db
      .insert(subscriptionDeliveryMethods)
      .values({ id: newId("sdm"), subscriptionId: subscription.id, method, enabled: true })
      .onConflictDoUpdate({
        target: [subscriptionDeliveryMethods.subscriptionId, subscriptionDeliveryMethods.method],
        set: { enabled: true, updatedAt: new Date().toISOString() },
      });
  }

  return { ok: true };
}

export async function updateSubscriptionFrequency(
  db: Db,
  userId: string,
  subscriptionId: string,
  frequency: SubscriptionFrequency,
  now = new Date()
) {
  const subscription = await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)) });
  if (!subscription) throw new Response("Subscription not found", { status: 404 });
  await db.update(subscriptions).set({
    frequency,
    nextIssueAt: nextIssueDate(now, frequency).toISOString(),
    updatedAt: now.toISOString(),
  }).where(eq(subscriptions.id, subscription.id));
  return { ok: true };
}

export async function updateSubscriptionDeliveryEmail(db: Db, userId: string, subscriptionId: string, deliveryEmail: string | null) {
  const subscription = await db.query.subscriptions.findFirst({ where: and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)) });
  if (!subscription) throw new Response("Subscription not found", { status: 404 });
  await db.update(subscriptions).set({
    deliveryEmail: deliveryEmail?.trim().toLowerCase() || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(subscriptions.id, subscription.id));
  return { ok: true };
}

export async function listSubscriptionsForUser(db: Db, userId: string) {
  return db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, userId),
    orderBy: (table, { desc }) => [desc(table.createdAt)]
  });
}

export async function findDueSubscriptions(db: Db, now = new Date()) {
  return db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "ACTIVE"), lte(subscriptions.nextIssueAt, now.toISOString())));
}

export async function advanceSubscriptionAfterIssue(db: Db, subscriptionId: string, issueDate: Date) {
  const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!subscription) throw new Error(`Subscription ${subscriptionId} not found`);
  if (new Date(subscription.nextIssueAt).getTime() > issueDate.getTime()) {
    return { advanced: false, nextIssueAt: subscription.nextIssueAt };
  }
  const nextIssueAt = nextIssueDate(issueDate, subscription.frequency as SubscriptionFrequency).toISOString();
  await db
    .update(subscriptions)
    .set({
      lastIssueAt: issueDate.toISOString(),
      nextIssueAt
    })
    .where(eq(subscriptions.id, subscriptionId));
  return { advanced: true, nextIssueAt };
}
