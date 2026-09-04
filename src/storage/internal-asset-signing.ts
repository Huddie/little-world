const encoder = new TextEncoder();

export async function signInternalAssetUrl(input: {
  appBaseUrl: string;
  assetId: string;
  secret: string;
  expiresAt: Date;
}) {
  const expires = Math.floor(input.expiresAt.getTime() / 1000).toString();
  const signature = await signPayload(input.secret, `${input.assetId}:${expires}`);
  const baseUrl = input.appBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/api/internal/assets/${input.assetId}/render?expires=${expires}&signature=${signature}`;
}

export async function signPublicAssetDownloadUrl(input: {
  appBaseUrl: string;
  assetId: string;
  secret: string;
  expiresAt: Date;
}) {
  const expires = Math.floor(input.expiresAt.getTime() / 1000).toString();
  const signature = await signPayload(input.secret, publicDownloadPayload(input.assetId, expires));
  const baseUrl = input.appBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/api/public/assets/${input.assetId}/download?expires=${expires}&signature=${signature}`;
}

export async function verifyPublicAssetDownloadSignature(input: {
  assetId: string;
  expires: string | null;
  signature: string | null;
  secret: string;
  now?: Date;
}) {
  if (!input.expires || !input.signature) return false;
  const expiresAt = Number(input.expires);
  if (!Number.isFinite(expiresAt)) return false;
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (expiresAt < nowSeconds) return false;
  const expected = await signPayload(input.secret, publicDownloadPayload(input.assetId, input.expires));
  return constantTimeEqual(expected, input.signature);
}

export async function verifyInternalAssetSignature(input: {
  assetId: string;
  expires: string | null;
  signature: string | null;
  secret: string;
  now?: Date;
}) {
  if (!input.expires || !input.signature) return false;
  const expiresAt = Number(input.expires);
  if (!Number.isFinite(expiresAt)) return false;
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (expiresAt < nowSeconds) return false;
  const expected = await signPayload(input.secret, `${input.assetId}:${input.expires}`);
  return constantTimeEqual(expected, input.signature);
}

async function signPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function publicDownloadPayload(assetId: string, expires: string) {
  return `public-download:${assetId}:${expires}`;
}
