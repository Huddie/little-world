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

  const domain = existing.data?.data.find((candidate) => candidate.name === domainName);
  if (!domain) throw new Error(`Resend domain ${domainName} does not exist. Run pnpm resend:setup-domain first.`);

  const verified = await resend.domains.verify(domain.id);
  if (verified.error) throw new Error(verified.error.message);

  console.log(`Verification requested for ${domainName}.`);
  console.log("Resend verification is asynchronous; check Resend dashboard for final status.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
