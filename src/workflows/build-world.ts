import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { generateCharacterImageSets } from "../ai/characters/image-set-generator";
import { OpenAiIllustrationGenerator } from "../ai/illustrations/openai-illustration-generator";
import { setBookIssueStatus } from "../domain/books/service";
import { parseJson } from "../domain/json";
import { stringifyJson } from "../domain/json";
import { createDb, type Db } from "../server/db/client";
import { assets, childPreferences } from "../server/db/schema";
import type { Env } from "../server/env";
import { R2AssetStore } from "../storage/asset-store";
import { D1GenerationStepStore } from "./d1-generation-step-store";
import { runGenerationStep } from "./generation-steps";
import type { CharacterImageSet } from "../ai/characters/image-set-generator";

type BuildWorldParams = {
  childId: string;
  firstIssueId: string;
};

const castMemberSchema = z.object({
  characterId: z.string().min(1),
  sourceCharacterId: z.string().min(1),
  displayName: z.string().min(1),
  species: z.string().min(1),
  description: z.string().min(1),
  personality: z.string().min(1),
  role: z.enum(["MAIN", "SUPPORTING"]),
  profileImageUrls: z.array(z.string()).optional(),
  imageStatus: z.enum(["PENDING", "READY", "FAILED"]).optional(),
});

export class BuildWorldWorkflow extends WorkflowEntrypoint<Env, BuildWorldParams> {
  async run(event: WorkflowEvent<BuildWorldParams>, step: WorkflowStep) {
    const db = createDb(this.env.DB);
    const stepStore = new D1GenerationStepStore(db);
    const assetStore = new R2AssetStore(db, this.env.BOOK_ASSETS, this.env.APP_BASE_URL);

    try {
      if (!this.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required to build character image sets");
      }
      const imageGenerator = new OpenAiIllustrationGenerator(this.env.OPENAI_API_KEY, this.env.OPENAI_IMAGE_MODEL);

      const cast = await step.do("load locked cast", async () => runGenerationStep({
        store: stepStore,
        bookIssueId: event.payload.firstIssueId,
        step: "LOAD_LOCKED_CAST",
        run: async () => {
          const preferences = await db.query.childPreferences.findFirst({ where: eq(childPreferences.childId, event.payload.childId) });
          if (!preferences) throw new Error(`Preferences not found for child ${event.payload.childId}`);
          return parseJson(preferences.selectedCharacterCastJson, z.array(castMemberSchema));
        },
      }));

      const imageSets = await step.do("generate character image sets", async () => runGenerationStep<CharacterImageSet[]>({
        store: stepStore,
        bookIssueId: event.payload.firstIssueId,
        step: "GENERATE_CHARACTER_IMAGE_SETS",
        run: async () => {
          const pendingCast = cast.filter((character) => character.imageStatus !== "READY" || (character.profileImageUrls?.length ?? 0) < 3);
          if (pendingCast.length === 0) return [];
          const existing = await existingProfileImageSets(db, pendingCast.map((character) => character.characterId));
          const reusable = pendingCast
            .map((character) => ({ character, assetIds: existing.get(character.characterId) ?? [] }))
            .filter((entry) => entry.assetIds.length >= 3)
            .map((entry) => ({
              characterId: entry.character.characterId,
              profileImageAssetIds: entry.assetIds.slice(0, 3),
              hiddenStyleReferenceAssetIds: [],
            }));
          const toGenerate = pendingCast.filter((character) => (existing.get(character.characterId)?.length ?? 0) < 3);
          if (toGenerate.length === 0) return reusable;
          return generateCharacterImageSets({
            childId: event.payload.childId,
            cast: toGenerate,
            imageGenerator,
            assetStore,
          }).then((generated) => [...reusable, ...generated]);
        },
      }));

      await step.do("persist character image sets", async () => runGenerationStep({
        store: stepStore,
        bookIssueId: event.payload.firstIssueId,
        step: "PERSIST_CHARACTER_IMAGE_SETS",
        run: async () => {
          if (imageSets.length === 0) return { updated: 0 };
          const byCharacterId = new Map(imageSets.map((set: CharacterImageSet) => [set.characterId, set]));
          const updatedCast = cast.map((character) => {
            const imageSet = byCharacterId.get(character.characterId);
            if (!imageSet) return character;
            return {
              ...character,
              profileImageUrls: imageSet.profileImageAssetIds.map((assetId) => `/api/assets/${assetId}/download`),
              imageStatus: "READY" as const,
            };
          });
          await db
            .update(childPreferences)
            .set({ selectedCharacterCastJson: stringifyJson(updatedCast), updatedAt: new Date().toISOString() })
            .where(and(eq(childPreferences.childId, event.payload.childId)));
          return { updated: imageSets.length };
        },
      }));

      await step.do("start first story", async () => runGenerationStep({
        store: stepStore,
        bookIssueId: event.payload.firstIssueId,
        step: "START_FIRST_STORY",
        run: async () => {
          await this.env.GENERATE_BOOK_WORKFLOW.create({
            id: `${event.payload.firstIssueId}-${crypto.randomUUID()}`,
            params: { bookIssueId: event.payload.firstIssueId },
          });
          return { started: true };
        },
      }));
    } catch (error) {
      await setBookIssueStatus(db, event.payload.firstIssueId, "FAILED", error instanceof Error ? error.message : "Unknown world build error");
      throw error;
    }
  }
}

async function existingProfileImageSets(db: Db, characterIds: string[]) {
  const idSet = new Set(characterIds);
  const rows = await db.select().from(assets).where(eq(assets.kind, "CHARACTER_PROFILE"));
  const byCharacterId = new Map<string, string[]>();
  for (const asset of rows) {
    const metadata = parseJson(asset.metadataJson ?? "{}", z.object({ characterId: z.string().optional() }));
    if (!metadata.characterId || !idSet.has(metadata.characterId)) continue;
    byCharacterId.set(metadata.characterId, [...(byCharacterId.get(metadata.characterId) ?? []), asset.id]);
  }
  return byCharacterId;
}
