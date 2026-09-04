export type GenerationStepName =
  | "LOAD_LOCKED_CAST"
  | "GENERATE_CHARACTER_IMAGE_SETS"
  | "PERSIST_CHARACTER_IMAGE_SETS"
  | "START_FIRST_STORY"
  | "CLAIM_ISSUE"
  | "LOAD_CONTEXT"
  | "GENERATE_OUTLINE"
  | "GENERATE_MANUSCRIPT"
  | "REVISE_MANUSCRIPT"
  | "GENERATE_ILLUSTRATION_BRIEFS"
  | "SAVE_BOOK"
  | "GENERATE_ILLUSTRATIONS"
  | "STORY_QA"
  | "ILLUSTRATION_QA"
  | "RENDER_HTML"
  | "RENDER_PDF"
  | "STORE_PDF"
  | "MARK_READY"
  | "CREATE_DELIVERIES"
  | "SEND_DELIVERIES"
  | "PERSIST_CANON"
  | "ADVANCE_SUBSCRIPTION";

export type GenerationStepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface GenerationStepRecord<TOutput = unknown> {
  id: string;
  bookIssueId: string;
  step: GenerationStepName;
  status: GenerationStepStatus;
  idempotencyKey: string;
  attemptCount: number;
  inputHash: string | null;
  output: TOutput | null;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface GenerationStepStore {
  getStep<TOutput>(bookIssueId: string, step: GenerationStepName): Promise<GenerationStepRecord<TOutput> | null>;
  startStep(input: {
    bookIssueId: string;
    step: GenerationStepName;
    idempotencyKey: string;
    inputHash?: string;
  }): Promise<void>;
  completeStep<TOutput>(input: {
    bookIssueId: string;
    step: GenerationStepName;
    output: TOutput;
  }): Promise<void>;
  failStep(input: {
    bookIssueId: string;
    step: GenerationStepName;
    error: string;
  }): Promise<void>;
}

export const generationStepLabels: Record<GenerationStepName, string> = {
  LOAD_LOCKED_CAST: "Load locked cast",
  GENERATE_CHARACTER_IMAGE_SETS: "Generate character images",
  PERSIST_CHARACTER_IMAGE_SETS: "Save character images",
  START_FIRST_STORY: "Start first story",
  CLAIM_ISSUE: "Claim issue",
  LOAD_CONTEXT: "Load story context",
  GENERATE_OUTLINE: "Generate outline",
  GENERATE_MANUSCRIPT: "Generate manuscript",
  REVISE_MANUSCRIPT: "Revise manuscript",
  GENERATE_ILLUSTRATION_BRIEFS: "Prepare illustration briefs",
  SAVE_BOOK: "Save book",
  GENERATE_ILLUSTRATIONS: "Generate illustrations",
  STORY_QA: "Review story",
  ILLUSTRATION_QA: "Review illustrations",
  RENDER_HTML: "Render HTML",
  RENDER_PDF: "Render PDF",
  STORE_PDF: "Store PDF",
  MARK_READY: "Mark ready",
  CREATE_DELIVERIES: "Create deliveries",
  SEND_DELIVERIES: "Send deliveries",
  PERSIST_CANON: "Persist story memory",
  ADVANCE_SUBSCRIPTION: "Advance subscription",
};

export async function runGenerationStep<TOutput>(input: {
  store: GenerationStepStore;
  bookIssueId: string;
  step: GenerationStepName;
  inputHash?: string;
  reuseCompleted?: boolean;
  run: () => Promise<TOutput>;
}): Promise<TOutput> {
  const existing = await input.store.getStep<TOutput>(input.bookIssueId, input.step);
  if (input.reuseCompleted !== false && existing?.status === "COMPLETED" && existing.output !== null) {
    return existing.output;
  }

  const idempotencyKey = `${input.bookIssueId}:${input.step}:${input.inputHash ?? "default"}`;
  const startInput: {
    bookIssueId: string;
    step: GenerationStepName;
    idempotencyKey: string;
    inputHash?: string;
  } = {
    bookIssueId: input.bookIssueId,
    step: input.step,
    idempotencyKey,
  };
  if (input.inputHash) {
    startInput.inputHash = input.inputHash;
  }
  await input.store.startStep(startInput);

  try {
    const output = await input.run();
    await input.store.completeStep({
      bookIssueId: input.bookIssueId,
      step: input.step,
      output,
    });
    return output;
  } catch (error) {
    await input.store.failStep({
      bookIssueId: input.bookIssueId,
      step: input.step,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function stableInputHash(value: unknown): string {
  const json = JSON.stringify(sortJson(value));
  let hash = 0;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 31 + json.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortJson(nested)]),
  );
}
