import { and, eq, sql } from "drizzle-orm";
import { newId } from "../domain/ids";
import type { Db } from "../server/db/client";
import { generationSteps } from "../server/db/schema";
import type { GenerationStepName, GenerationStepRecord, GenerationStepStore } from "./generation-steps";

export class D1GenerationStepStore implements GenerationStepStore {
  constructor(private readonly db: Db) {}

  async getStep<TOutput>(bookIssueId: string, step: GenerationStepName): Promise<GenerationStepRecord<TOutput> | null> {
    const row = await this.db.query.generationSteps.findFirst({ where: and(eq(generationSteps.bookIssueId, bookIssueId), eq(generationSteps.step, step)) });
    if (!row) return null;
    return {
      id: row.id,
      bookIssueId: row.bookIssueId,
      step: row.step as GenerationStepName,
      status: row.status as GenerationStepRecord["status"],
      idempotencyKey: row.idempotencyKey,
      attemptCount: row.attemptCount,
      inputHash: row.inputHash,
      output: row.outputRef ? JSON.parse(row.outputRef) as TOutput : null,
      lastError: row.lastError,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }

  async startStep(input: { bookIssueId: string; step: GenerationStepName; idempotencyKey: string; inputHash?: string }): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .insert(generationSteps)
      .values({
        id: newId("gstep"),
        bookIssueId: input.bookIssueId,
        step: input.step,
        status: "RUNNING",
        idempotencyKey: input.idempotencyKey,
        attemptCount: 1,
        inputHash: input.inputHash ?? null,
        lastError: null,
        startedAt: now,
        completedAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: generationSteps.idempotencyKey,
        set: {
          status: "RUNNING",
          attemptCount: sql`${generationSteps.attemptCount} + 1`,
          lastError: null,
          startedAt: now,
          completedAt: null,
          updatedAt: now,
        },
      });
  }

  async completeStep<TOutput>(input: { bookIssueId: string; step: GenerationStepName; output: TOutput }): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(generationSteps)
      .set({ status: "COMPLETED", outputRef: JSON.stringify(input.output ?? null), lastError: null, completedAt: now, updatedAt: now })
      .where(and(eq(generationSteps.bookIssueId, input.bookIssueId), eq(generationSteps.step, input.step)));
  }

  async failStep(input: { bookIssueId: string; step: GenerationStepName; error: string }): Promise<void> {
    await this.db
      .update(generationSteps)
      .set({ status: "FAILED", lastError: input.error, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(and(eq(generationSteps.bookIssueId, input.bookIssueId), eq(generationSteps.step, input.step)));
  }
}
