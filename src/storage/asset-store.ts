import { eq } from "drizzle-orm";
import { newId } from "../domain/ids";
import type { AssetKind } from "../domain/types";
import type { Db } from "../server/db/client";
import { assets } from "../server/db/schema";
import { signPublicAssetDownloadUrl } from "./internal-asset-signing";

export type StoreAssetInput = {
  kind: AssetKind;
  contentType: string;
  bytes: Uint8Array | ArrayBuffer | ReadableStream;
  metadata?: Record<string, unknown>;
};

export interface AssetStore {
  put(input: StoreAssetInput): Promise<{ id: string; r2Key: string }>;
  signedDownloadUrl(assetId: string, expiresInSeconds: number): Promise<string>;
  get(assetId: string): Promise<R2ObjectBody | null>;
}

export class R2AssetStore implements AssetStore {
  constructor(
    private readonly db: Db,
    private readonly bucket: R2Bucket,
    private readonly appBaseUrl: string,
    private readonly publicDownloadSecret?: string
  ) {}

  async put(input: StoreAssetInput): Promise<{ id: string; r2Key: string }> {
    const id = newId("asset");
    const r2Key = `assets/${id}`;
    const assetStats = await assetStatsFor(input.bytes);
    await this.bucket.put(r2Key, input.bytes, { httpMetadata: { contentType: input.contentType } });
    const stored = await this.bucket.head(r2Key);
    if (!stored) {
      throw new Error(`R2 upload verification failed for ${r2Key}`);
    }
    await this.db.insert(assets).values({
      id,
      kind: input.kind,
      r2Key,
      contentType: input.contentType,
      byteSize: assetStats.byteSize,
      checksum: assetStats.checksum,
      metadataJson: JSON.stringify(input.metadata ?? {})
    });
    return { id, r2Key };
  }

  async signedDownloadUrl(assetId: string, expiresInSeconds: number): Promise<string> {
    if (this.publicDownloadSecret) {
      return signPublicAssetDownloadUrl({
        appBaseUrl: this.appBaseUrl,
        assetId,
        secret: this.publicDownloadSecret,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      });
    }
    return `${this.appBaseUrl}/api/assets/${assetId}/download`;
  }

  async get(assetId: string): Promise<R2ObjectBody | null> {
    const asset = await this.db.query.assets.findFirst({ where: eq(assets.id, assetId) });
    if (!asset) return null;
    return this.bucket.get(asset.r2Key);
  }
}

async function assetStatsFor(bytes: StoreAssetInput["bytes"]) {
  if (bytes instanceof ReadableStream) return { byteSize: null, checksum: null };
  const buffer = bytes instanceof Uint8Array
    ? new Uint8Array(bytes).buffer
    : bytes;
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return {
    byteSize: buffer.byteLength,
    checksum: [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  };
}
