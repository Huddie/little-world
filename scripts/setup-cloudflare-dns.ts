type CloudflareListResponse<T> = {
  success: boolean;
  result: T[];
  errors?: { message: string }[];
};

type CloudflareItemResponse<T> = {
  success: boolean;
  result: T;
  errors?: { message: string }[];
};

type DnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
};

type DesiredDnsRecord = {
  type: "TXT" | "MX";
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
};

const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const zoneName = process.env.CLOUDFLARE_ZONE ?? "littleworldstory.com";

if (!apiToken) {
  console.error("Missing CLOUDFLARE_API_TOKEN. Add it to .env or export it before running this script.");
  process.exit(1);
}

const desiredRecords: DesiredDnsRecord[] = [
  {
    type: "TXT",
    name: "resend._domainkey.mail",
    content:
      "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXD5BwCEBSoyUcKCJn4aGdGL1ge4xqAv+dI2aogB6MU54gxZFlzMhPEId/qIzXRHrX5WT4FqZG3EU/rghmJyz9QoOJ3CFpfDR9PElDnjh4B36bb1deRj7LFqbLvr/FYrNjwUtRA4pv+r3AAtxb5xowTjJXjo/1oqjAVPOX3SbZWQIDAQAB",
    ttl: 1,
  },
  {
    type: "MX",
    name: "send.mail",
    content: "feedback-smtp.us-east-1.amazonses.com",
    priority: 10,
    ttl: 1,
  },
  {
    type: "TXT",
    name: "send.mail",
    content: "v=spf1 include:amazonses.com ~all",
    ttl: 1,
  },
];

async function main() {
  const zone = await getZone(zoneName);
  console.log(`Cloudflare zone: ${zone.name} (${zone.id})`);

  for (const record of desiredRecords) {
    await upsertRecord(zone.id, record);
  }
}

async function getZone(name: string) {
  const response = await cloudflare<CloudflareListResponse<{ id: string; name: string }>>(`/zones?name=${encodeURIComponent(name)}`);
  const zone = response.result[0];
  if (!zone) throw new Error(`Cloudflare zone not found: ${name}`);
  return zone;
}

async function upsertRecord(zoneId: string, record: DesiredDnsRecord) {
  const name = `${record.name}.${zoneName}`;
  const existing = await cloudflare<CloudflareListResponse<DnsRecord>>(
    `/zones/${zoneId}/dns_records?type=${record.type}&name=${encodeURIComponent(name)}`
  );

  const matching = existing.result.find((candidate) => candidate.content === record.content);
  if (matching) {
    console.log(`DNS unchanged: ${record.type} ${name}`);
    return;
  }

  const body = {
    type: record.type,
    name,
    content: record.content,
    ttl: record.ttl,
    proxied: record.proxied ?? false,
    ...(record.priority ? { priority: record.priority } : {}),
  };

  if (existing.result.length > 0) {
    await cloudflare<CloudflareItemResponse<DnsRecord>>(`/zones/${zoneId}/dns_records/${existing.result[0]?.id}`, "PUT", body);
    console.log(`DNS updated: ${record.type} ${name}`);
    return;
  }

  await cloudflare<CloudflareItemResponse<DnsRecord>>(`/zones/${zoneId}/dns_records`, "POST", body);
  console.log(`DNS created: ${record.type} ${name}`);
}

async function cloudflare<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as T & { success?: boolean; errors?: { message: string }[] };
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.map((error) => error.message).join("; ") || `Cloudflare request failed with ${response.status}`);
  }
  return payload;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
