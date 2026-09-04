import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { CanonExtraction, QaResult, StoryContext, StoryManuscript, StoryOutline } from "./schemas";
import { canonExtractionSchema, qaResultSchema, storyManuscriptSchema, storyOutlineSchema } from "./schemas";
import type { StoryGenerator } from "./story-generator";

export class OpenAiStoryGenerator implements StoryGenerator {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = "gpt-5.6-terra") {
    this.client = new OpenAI({ apiKey, maxRetries: 2, timeout: 120_000 });
    this.model = model;
  }

  async generateOutline(context: StoryContext): Promise<StoryOutline> {
    return this.generateJson(
      "Create a serialized children's story outline. Ground the story in the provided locations and worldRules. Prefer a known location unless the story intentionally discovers one small new nearby place.",
      context,
      storyOutlineSchema
    );
  }

  async generateManuscript(context: StoryContext, outline: StoryOutline): Promise<StoryManuscript> {
    return this.generateJson(
      "Create an 8-12 page warm read-aloud manuscript from this outline. Choose typography from the allowed enum based on the adventure mood. The final page must clearly resolve the central story question, satisfy the outline's closing beat, and gently wind down for the requested age range.",
      { context, outline },
      storyManuscriptSchema
    );
  }

  async reviseManuscript(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript, qa: QaResult): Promise<StoryManuscript> {
    return this.generateJson(
      "Revise this manuscript so it passes QA. Preserve the title, locked cast, age fit, page count range, and core story. Address every QA issue directly, especially missing resolution or continuity beats. Return the full revised manuscript JSON.",
      { context, outline, manuscript, qa },
      storyManuscriptSchema
    );
  }

  async reviewStory(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript): Promise<QaResult> {
    return this.generateJson(
      "Review this story for age appropriateness, coherence, safety, locked-cast consistency, worldRules compliance, location grounding, and continuity. Fail if it uses non-locked named cast, ignores hard world rules, or leaves the central story question unresolved. Return pass/fail JSON.",
      { context, outline, manuscript },
      qaResultSchema
    );
  }

  async extractCanon(context: StoryContext, manuscript: StoryManuscript): Promise<CanonExtraction> {
    return this.generateJson(
      [
        "Summarize the episode and extract durable story memory. Return JSON only.",
        "memoryEvents are durable facts future episodes may need: discoveries, promises, meetings, location changes, character development, and recurring objects.",
        "For facts created by this child-specific episode, use scope CHILD. Use GLOBAL only for admin-authored universe-wide facts that apply to every child.",
        "characterProfileMemories are only durable facts about a cast member's background, trait, skill, fear, preference, or growth.",
        "characterRelationshipMemories describe durable relationship history between two locked cast members, including when they first met if established.",
        "imageMemoryCandidates should include only important illustrated pages worth reusing as hidden visual continuity references.",
        "Use only character IDs, page numbers, and facts present in the manuscript/context.",
      ].join("\n"),
      { context, manuscript },
      canonExtractionSchema
    );
  }

  private async generateJson<T>(instruction: string, input: unknown, schema: z.ZodType<T>): Promise<T> {
    const response = await this.client.responses.parse({
      model: this.model,
      text: { format: zodTextFormat(schema, "story_generation_result") },
      input: [
        {
          role: "system",
          content: "You write safe, coherent children's stories for the requested age range. This is an evolving Little World, not a fixed canned series: use storyExamples for tone, structure, and variety, then create a unique episode that grows from recentSummaries, canon, memory, locations, and worldRules. Follow worldRules as hard constraints. Use known locations as anchors; if introducing a new place, relate it clearly to an existing location. Use only the locked character cast from input, keep their display names stable, and make the MAIN character the lead. Preserve retrieved memory facts, do not invent prior meetings or past events unless they are included in context, and reference memory only when it naturally supports the episode. Connected worlds are parent-approved and optional; include crossover elements only when the provided probability/context supports it, and never expose private family information. Do not assume the child appears in the story or has a provided name. Return only valid JSON matching the requested schema."
        },
        {
          role: "user",
          content: `${instruction}\n\nInput:\n${JSON.stringify(input)}`
        }
      ]
    });
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("OpenAI story response did not match the required schema");
    return parsed;
  }
}
