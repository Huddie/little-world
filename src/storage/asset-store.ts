import { eq } from "drizzle-orm";
import { newId } from "../domain/ids";
import type { AssetKind } from "../domain/types";
import type { Db } from "../server/db/client";
import { assets } from "../server/db/schema";

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
    private readonly appBaseUrl: string
  ) {}

  async put(input: StoreAssetInput): Promise<{ id: string; r2Key: string }> {
    const id = newId("asset");
    const r2Key = `assets/${id}`;
    await this.bucket.put(r2Key, input.bytes, { httpMetadata: { contentType: input.contentType } });
    await this.db.insert(assets).values({
      id,
      kind: input.kind,
      r2Key,
      contentType: input.contentType,
      metadataJson: JSON.stringify(input.metadata ?? {})
    });
    return { id, r2Key };
  }

  async signedDownloadUrl(assetId: string): Promise<string> {
    return `${this.appBaseUrl}/api/assets/${assetId}/download`;
  }

  async get(assetId: string): Promise<R2ObjectBody | null> {
    const asset = await this.db.query.assets.findFirst({ where: eq(assets.id, assetId) });
    if (!asset) return null;
    return this.bucket.get(asset.r2Key);
  }
}
