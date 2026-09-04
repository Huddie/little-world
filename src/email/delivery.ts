import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { newId } from "../domain/ids";
import type { DeliveryMethod } from "../domain/types";
import type { Db } from "../server/db/client";
import { books, deliveries, deliveryAttempts, users } from "../server/db/schema";
import type { AssetStore } from "../storage/asset-store";

export type DeliveryInput = {
  deliveryId: string;
  parentEmail: string;
  collectionName: string;
  episodeNumber: number;
  bookIssueId: string;
  bookTitle: string;
  pdfAssetId: string;
};

export type DeliveryResult = {
  providerReference: string | null;
  status: "SENT" | "FAILED";
  error?: string;
};

export interface DeliveryProvider {
  method: DeliveryMethod;
  deliver(input: DeliveryInput): Promise<DeliveryResult>;
}

export class EmailDeliveryProvider implements DeliveryProvider {
  readonly method = "EMAIL" as const;
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly fromEmail: string,
    private readonly assetStore: AssetStore,
    private readonly appBaseUrl = "https://littleworldstory.com"
  ) {
    this.resend = new Resend(apiKey);
  }

  async deliver(input: DeliveryInput): Promise<DeliveryResult> {
    const url = await this.assetStore.signedDownloadUrl(input.pdfAssetId, 60 * 60 * 24 * 7);
    const html = renderBookReadyEmail(input, url, this.appBaseUrl);
    const result = await this.resend.emails.send({
      from: this.fromEmail,
      to: input.parentEmail,
      subject: `${input.collectionName} adventure is here`,
      html,
      text: [
        `${input.collectionName} adventure is here.`,
        `Episode ${input.episodeNumber}: ${input.bookTitle}`,
        `Read and download: ${url}`,
      ].join("\n\n")
    });
    return {
      status: "SENT",
      providerReference: result.data?.id ?? null
    };
  }
}

function renderBookReadyEmail(input: DeliveryInput, downloadUrl: string, appBaseUrl: string) {
  const collectionName = escapeHtml(input.collectionName);
  const bookTitle = escapeHtml(input.bookTitle);
  const episodeNumber = escapeHtml(String(input.episodeNumber));
  const logoUrl = `${appBaseUrl.replace(/\/$/, "")}/brand/little-world-icon.svg`;
  const shelfUrl = `${appBaseUrl.replace(/\/$/, "")}/app`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${collectionName} adventure is here</title>
  </head>
  <body style="margin:0;background:#f6f0dc;color:#21351f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#f8f2df 0%,#eef6e6 100%);padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border-radius:28px;background:#fffdf6;border:1px solid #dfe9cf;box-shadow:0 18px 50px rgba(33,53,31,0.14);">
            <tr>
              <td style="padding:30px 30px 12px;text-align:center;">
                <img src="${logoUrl}" width="72" height="72" alt="Little World" style="display:inline-block;border-radius:22px;">
                <p style="margin:18px 0 0;color:#5a704a;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Little World</p>
                <h1 style="margin:10px 0 0;color:#21351f;font-size:32px;line-height:1.08;font-weight:900;">A new adventure is ready</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 30px 0;">
                <div style="border-radius:24px;background:#eaf5dc;padding:24px;text-align:center;border:1px solid #d9e9c7;">
                  <p style="margin:0;color:#5a704a;font-size:14px;font-weight:800;">Episode ${episodeNumber}</p>
                  <h2 style="margin:8px 0 0;color:#21351f;font-size:24px;line-height:1.2;font-weight:900;">${bookTitle}</h2>
                  <p style="margin:14px auto 0;max-width:420px;color:#4a623d;font-size:15px;line-height:1.6;">
                    ${collectionName} has a new illustrated story to read together, save, and download.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 30px 10px;">
                <a href="${downloadUrl}" style="display:inline-block;border-radius:999px;background:#315638;color:#ffffff;font-size:16px;font-weight:900;text-decoration:none;padding:15px 26px;">Read and download</a>
                <p style="margin:14px 0 0;color:#6a7d5c;font-size:13px;line-height:1.5;">This private download link expires in 7 days.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px 30px;text-align:center;">
                <a href="${shelfUrl}" style="color:#315638;font-size:14px;font-weight:800;text-decoration:none;">Open your story shelf</a>
                <p style="margin:18px 0 0;color:#7a8d6c;font-size:12px;line-height:1.5;">You’re receiving this because this email is connected to a Little World parent account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function deliverBook(db: Db, provider: DeliveryProvider, input: DeliveryInput) {
  await db.update(deliveries).set({ status: "PROCESSING", attemptCount: 1 }).where(eq(deliveries.id, input.deliveryId));
  try {
    const result = await provider.deliver(input);
    await db.insert(deliveryAttempts).values({
      id: newId("attempt"),
      deliveryId: input.deliveryId,
      status: result.status,
      provider: provider.method === "EMAIL" ? "resend" : "unknown",
      providerReference: result.providerReference,
      error: result.error ?? null
    });
    await db
      .update(deliveries)
      .set({ status: result.status, providerReference: result.providerReference, sentAt: new Date().toISOString(), lastError: result.error ?? null })
      .where(eq(deliveries.id, input.deliveryId));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown delivery error";
    await db.insert(deliveryAttempts).values({ id: newId("attempt"), deliveryId: input.deliveryId, status: "FAILED", provider: provider.method === "EMAIL" ? "resend" : "unknown", error: message });
    await db.update(deliveries).set({ status: "FAILED", lastError: message }).where(eq(deliveries.id, input.deliveryId));
    return { status: "FAILED" as const, providerReference: null, error: message };
  }
}

export async function buildDeliveryInput(db: Db, deliveryId: string): Promise<DeliveryInput> {
  const delivery = await db.query.deliveries.findFirst({ where: eq(deliveries.id, deliveryId) });
  if (!delivery) throw new Error(`Delivery ${deliveryId} not found`);
  const issue = await db.query.bookIssues.findFirst({ where: (table, { eq: equals }) => equals(table.id, delivery.bookIssueId) });
  if (!issue) throw new Error(`Issue ${delivery.bookIssueId} not found`);
  const subscription = await db.query.subscriptions.findFirst({ where: (table, { eq: equals }) => equals(table.id, delivery.subscriptionId) });
  if (!subscription) throw new Error(`Subscription ${delivery.subscriptionId} not found`);
  const parent = await db.query.users.findFirst({ where: eq(users.id, subscription.userId) });
  const child = await db.query.children.findFirst({ where: (table, { eq: equals }) => equals(table.id, issue.childId) });
  const book = await db.query.books.findFirst({ where: eq(books.bookIssueId, issue.id) });
  if (!parent || !child || !book?.pdfAssetId) throw new Error("Delivery is missing parent, child, or PDF");
  return {
    deliveryId,
    parentEmail: subscription.deliveryEmail ?? parent.email,
    collectionName: child.firstName ? `${child.firstName}'s Little World` : "Little World",
    episodeNumber: issue.episodeNumber,
    bookIssueId: issue.id,
    bookTitle: book.title,
    pdfAssetId: book.pdfAssetId
  };
}
