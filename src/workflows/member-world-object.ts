import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { parseJson } from "../domain/json";
import { createDb } from "../server/db/client";
import { bookIssues, childPreferences } from "../server/db/schema";
import type { Env } from "../server/env";
import { z } from "zod";

const startIssueRequestSchema = z.object({
  action: z.enum(["START_ISSUE", "CLEAR_ISSUE_LOCK"]),
  bookIssueId: z.string().min(1),
});

export class MemberWorldObject extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const input = startIssueRequestSchema.parse(await request.json());
    const db = createDb(this.env.DB);
    const issue = await db.query.bookIssues.findFirst({ where: eq(bookIssues.id, input.bookIssueId) });
    if (!issue) return Response.json({ error: "Book issue not found" }, { status: 404 });

    const lockKey = `issue:${issue.id}:started`;
    if (input.action === "CLEAR_ISSUE_LOCK") {
      await this.ctx.storage.delete(lockKey);
      return Response.json({ cleared: true });
    }

    const existing = await this.ctx.storage.get<string>(lockKey);
    if (existing) return Response.json({ started: false, reason: "already-started", startedAt: existing });

    const preferences = await db.query.childPreferences.findFirst({ where: eq(childPreferences.childId, issue.childId) });
    const startedAt = new Date().toISOString();
    await this.ctx.storage.put(lockKey, startedAt);

    if (!isWorldReady(preferences?.selectedCharacterCastJson)) {
      await this.env.BUILD_WORLD_WORKFLOW.create({
        id: `${issue.id}-world-${crypto.randomUUID()}`,
        params: { childId: issue.childId, firstIssueId: issue.id },
      });
      return Response.json({ started: true, workflow: "build-world", startedAt });
    }

    const continueExistingBook = issue.status === "READY" || issue.status === "DELIVERY_PENDING";
    await this.env.GENERATE_BOOK_WORKFLOW.create({
      id: `${issue.id}-${crypto.randomUUID()}`,
      params: {
        bookIssueId: issue.id,
        ...(continueExistingBook
          ? {
              continueBook: true,
              expectedStartedAt: issue.generationStartedAt,
              expectedGenerationRunId: issue.generationRunId,
            }
          : {}),
      },
    });
    return Response.json({ started: true, workflow: "generate-book", startedAt });
  }
}

function isWorldReady(selectedCharacterCastJson?: string | null) {
  const selected = parseJson(selectedCharacterCastJson ?? "[]", z.array(z.object({
    profileImageUrls: z.array(z.string()).optional(),
    imageStatus: z.enum(["PENDING", "READY", "FAILED"]).optional()
  })));
  return selected.length > 0 && selected.every((character) => character.imageStatus === "READY" && (character.profileImageUrls?.length ?? 0) >= 3);
}
