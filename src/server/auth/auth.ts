import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "../db/client";
import { userRoles } from "../db/schema";
import type { Env } from "../env";

export type AppRole = "ADMIN" | "OPS" | "SUPPORT";
export type AppPermission = "admin:read" | "admin:retry" | "users:read" | "content:review";

const permissionsByRole: Record<AppRole, AppPermission[]> = {
  ADMIN: ["admin:read", "admin:retry", "users:read", "content:review"],
  OPS: ["admin:read", "admin:retry", "content:review"],
  SUPPORT: ["admin:read"],
};

export function createAuth(env: Env) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_BASE_URL,
    user: {
      modelName: "users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    session: {
      modelName: "sessions",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
    },
    account: {
      modelName: "accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "verifications",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    emailAndPassword: {
      enabled: false
    },
    plugins: [
      magicLink({
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required for magic-link email");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL,
            to: email,
            subject: "Your Little World sign-in link",
            html: `<p>Open your Little World account:</p><p><a href="${url}">Sign in</a></p>`
          })
        });
        if (!response.ok) throw new Error(`Resend magic-link email failed with ${response.status}`);
      }
      }),
    ],
  });
}

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const accessEmail = request.headers.get("cf-access-authenticated-user-email");
  if (env.ENABLE_CLOUDFLARE_ACCESS_AUTH === "true" && accessEmail) {
    const db = createDb(env.DB);
    const existing = await db.query.users.findFirst({ where: (table, { eq: equals }) => equals(table.email, accessEmail) });
    return { id: existing?.id ?? accessEmail, email: accessEmail, name: existing?.name ?? null };
  }

  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  };
}

export async function requirePermission(db: Db, user: SessionUser, env: Env, permission: AppPermission): Promise<void> {
  const roles = await getUserRoles(db, user, env);
  const allowed = roles.some((role) => permissionsByRole[role]?.includes(permission));
  if (!allowed) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function getPrincipalAccess(db: Db, user: SessionUser, env: Env) {
  const roles = await getUserRoles(db, user, env);
  const permissions = [...new Set(roles.flatMap((role) => permissionsByRole[role] ?? []))];
  return { roles, permissions };
}

async function getUserRoles(db: Db, user: SessionUser, env: Env): Promise<AppRole[]> {
  const bootstrapped = bootstrapRoles(user.email, env);
  if (bootstrapped.length > 0) return bootstrapped;

  const rows = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
  return rows.map((row) => row.role).filter(isAppRole);
}

function bootstrapRoles(email: string, env: Env): AppRole[] {
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase()) ? ["ADMIN"] : [];
}

function isAppRole(role: string): role is AppRole {
  return role === "ADMIN" || role === "OPS" || role === "SUPPORT";
}
