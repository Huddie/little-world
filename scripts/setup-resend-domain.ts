import { Resend } from "resend";

const domainName = process.env.RESEND_DOMAIN ?? "mail.littleworldstory.com";
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error("Missing RESEND_API_KEY. Add it to .env or export it before running this script.");
  process.exit(1);
}

const resend = new Resend(apiKey);

async function main() {
  const existing = await resend.domains.list();
  if (existing.error) throw new Error(existing.error.message);

  const domain = existing.data?.data.find((candidate) => candidate.name === domainName)
    ?? await createDomain(domainName);

  console.log(`Resend domain: ${domain.name}`);
  console.log(`Status: ${domain.status}`);
  console.log("");
  console.log("Add these DNS records in Cloudflare:");
  console.log(JSON.stringify(domain.records, null, 2));
  console.log("");
  console.log("After DNS is added and propagated, run:");
  console.log(`RESEND_DOMAIN=${domainName} pnpm resend:verify-domain`);
}

async function createDomain(name: string) {
  const created = await resend.domains.create({ name });
  if (created.error) throw new Error(created.error.message);
  if (!created.data) throw new Error("Resend did not return domain data.");
  return created.data;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
