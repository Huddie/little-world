# Need From You

Current production deployment is live at:

```txt
https://littleworldstory.com
https://www.littleworldstory.com
```

Completed setup:

- Cloudflare zone: `littleworldstory.com`
- Cloudflare nameservers: `pam.ns.cloudflare.com`, `vin.ns.cloudflare.com`
- Worker: `little-world`
- D1 database: `little-world`
- D1 database id: `47dd449c-387a-47e9-a721-584ed226a93b`
- R2 bucket: `little-world-assets`
- Workflow binding: `generate-book`
- Cron trigger: every 15 minutes
- Resend domain: `mail.littleworldstory.com`
- Resend DNS records: added to Cloudflare
- Worker secrets uploaded: `OPENAI_API_KEY`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`

## Still needed

### 1. Confirm Resend verification

Resend verification was requested after DNS records were added. It is asynchronous.

Check:

1. Open Resend.
2. Go to Domains.
3. Open `mail.littleworldstory.com`.
4. Confirm the domain is verified.

If it is still pending, wait a few minutes and run:

```sh
set -a; source .env; set +a; RESEND_DOMAIN=mail.littleworldstory.com pnpm resend:verify-domain
```

### 2. Add GitHub Actions secrets

For deploy-on-merge to `main`, add these repository secrets:

```txt
CLOUDFLARE_ACCOUNT_ID=65c76cd478aba6575ed57de7d93480ad
CLOUDFLARE_API_TOKEN=<production deploy token>
OPENAI_API_KEY=<your OpenAI key>
RESEND_API_KEY=<your Resend key>
BETTER_AUTH_SECRET=<same production auth secret>
```

Location:

GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

### 3. Keep the Cloudflare token available locally

For future automation from this machine, `.env` should keep:

```txt
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_WORKERS_DEPLOY_API_TOKEN=<token>
```

The token needs at least:

- Account → Workers Scripts → Edit
- Account → D1 → Edit
- Account → Workers R2 Storage → Edit
- Account → Account Settings → Read
- Zone → Zone → Edit
- Zone → DNS → Edit
- User → User Details → Read
- User → Memberships → Read

### 4. Optional: Cloudflare Access for admin perimeter protection

The app already enforces server-side RBAC for `/api/admin/*`, and the UI only shows Admin navigation when the signed-in user has `admin:read`.

Cloudflare Access can still be added as an extra perimeter gate:

1. Cloudflare Dashboard → Zero Trust.
2. Access → Applications.
3. Add an application for:

```txt
https://littleworldstory.com/admin/*
```

4. Allow only your admin email or identity-provider group.

If enabled, set this Worker variable:

```txt
ENABLE_CLOUDFLARE_ACCESS_AUTH=true
```

### 5. First admin login

Current bootstrap admin email is configured in `wrangler.jsonc`:

```txt
ADMIN_EMAILS=adlerehud@gmail.com
```

Sign in at:

```txt
https://littleworldstory.com/sign-in
```

Admin navigation appears only after an admin user is signed in.
