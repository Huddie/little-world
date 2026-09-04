# Little World

Cloudflare-native TypeScript app for recurring personalized children's storybooks.

## Local Development

1. Install dependencies with `pnpm install`.
2. Copy `.dev.vars.example` to `.dev.vars` and fill local secrets as needed.
3. Run migrations with `pnpm db:migrate`.
4. Seed local data with `pnpm db:seed`.
5. Start the Worker API with `pnpm worker:dev`.

For UI-only work, set `VITE_USE_MOCK_API=true` and run `pnpm dev`.

For integrated Worker/API work, use `pnpm worker:dev`; Wrangler serves the Worker and static assets together.

## Cloudflare Setup

Target resources:

- Worker: `little-world`
- D1 database: `little-world`
- R2 bucket: `little-world-assets`
- workers.dev hostname first, custom domain later

Create resources:

```sh
wrangler d1 create little-world
wrangler r2 bucket create little-world-assets
```

Then update:

```txt
wrangler.jsonc → d1_databases[0].database_id
wrangler.jsonc → vars.APP_BASE_URL
wrangler.jsonc → vars.RESEND_FROM_EMAIL
wrangler.jsonc → vars.ADMIN_EMAILS
```

Apply remote migrations:

```sh
wrangler d1 migrations apply little-world --remote
wrangler d1 execute little-world --remote --file drizzle/seed.sql
```

Deploy:

```sh
pnpm run deploy
```

## GitHub Actions

CI runs on pull requests and pushes to `main`.

Production deploy runs on pushes to `main` when app, Worker, migration, config, or workflow files change.

Required repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `BETTER_AUTH_SECRET`

See `NEED_FROM_YOU.md` for exact setup steps.

## Cloudflare Workflows

Cloudflare Workflows are used at runtime for durable book generation. They are not a replacement for GitHub Actions.

Runtime flow:

```txt
subscription / scheduler
  → create book issue
  → start GenerateBookWorkflow
  → story
  → illustrations
  → PDF
  → delivery
```

The Workflow is declared in `wrangler.jsonc` and implemented by `GenerateBookWorkflow`. If Cloudflare shows "No Workflows found", deploy the Worker after D1/R2 resources and secrets are configured.

The Cloudflare hello-world workflow template is not needed for this repo.

## Resend Domain Setup

Preferred sending domain:

```txt
mail.littleworldstory.com
```

After adding `RESEND_API_KEY` to `.env`, run:

```sh
set -a; source .env; set +a; pnpm resend:setup-domain
```

The script prints the DNS records to add in Cloudflare. After DNS propagates:

```sh
set -a; source .env; set +a; pnpm resend:verify-domain
```

## Admin and RBAC

Admin APIs use DB-backed roles with `ADMIN`, `OPS`, and `SUPPORT`.

`ADMIN_EMAILS` is a bootstrap fallback so the first admin can access the portal before role-management screens exist.

Cloudflare Access can additionally protect the admin route as a perimeter gate. App-level RBAC is still enforced for action-level permissions.

## Connected Worlds

Parents can invite another Little World parent by email. Invites require explicit acceptance before worlds become connected.

Connected worlds are not a child social network:

- no child search
- no public child profiles
- no child messaging
- no location sharing

Generation receives connected-world metadata and may include crossover story elements probabilistically.

## MCP Story Context Server

The repo includes a read-only MCP server for story and illustration agents:

```sh
pnpm mcp:story-world
```

Current tools expose:

- universe catalog
- locked child cast
- character profile and R2 style references
- compact generation context

The first provider is mock-backed so the protocol contract is usable immediately. A D1/API-backed provider can be added without changing the MCP tool contract.

## Useful Scripts

- `pnpm dev` - run the Vite frontend locally.
- `pnpm worker:dev` - run the Cloudflare Worker locally.
- `pnpm typecheck` - run strict TypeScript checks.
- `pnpm node:typecheck` - typecheck Node-side tooling such as MCP.
- `pnpm mcp:story-world` - run the story context MCP server over stdio.
- `pnpm deploy` - build and deploy the Worker/assets.
- `pnpm db:generate` - generate Drizzle migrations from schema changes.
- `pnpm db:migrate` - apply local D1 migrations.
- `pnpm db:seed` - seed Little World product data.
