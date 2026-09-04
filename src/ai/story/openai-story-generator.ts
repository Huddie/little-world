import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { CanonExtraction, QaResult, StoryContext, StoryManuscript, StoryOutline, WritingStyle } from "./schemas";
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
      "Create a serialized children's story outline. Ground the story in the provided locations and worldRules. Prefer a known location unless the story intentionally discovers one small new nearby place. If inspirations are provided, use them according to their childFacingMode and promptGuidance.",
      context,
      storyOutlineSchema
    );
  }

  async generateManuscript(context: StoryContext, outline: StoryOutline): Promise<StoryManuscript> {
    const writingStyle = selectWritingStyle(context);
    return this.generateJson(
      [
        "Create an 8-12 page warm read-aloud manuscript from this outline.",
        `Use this required writingStyle exactly: ${writingStyle}.`,
        writingStyleInstruction(writingStyle),
        `Use these original craft exemplars as quality targets, not as copy: ${JSON.stringify(storyCraftExamples)}`,
        "Choose typography from the allowed enum based on the story mood: storybook for classic playful adventures, adventure for energetic quests, cozy for gentle homey stories, mystery for clue-finding stories, bedtime for soft wind-down stories.",
        "The final page must clearly resolve the central story question, satisfy the outline's closing beat, and gently wind down for the requested age range.",
        "If an inspiration has childFacingMode EXPLICIT, name it naturally in the manuscript. If it has THEME, use the value without naming the source. Never quote long source text.",
      ].join(" "),
      { context, outline, writingStyle },
      storyManuscriptSchema
    );
  }

  async reviseManuscript(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript, qa: QaResult): Promise<StoryManuscript> {
    return this.generateJson(
      "Revise this manuscript so it passes QA. Preserve the title, writingStyle, typography, locked cast, age fit, page count range, and core story. Address every QA issue directly, especially missing resolution, continuity beats, or requested writing style. Return the full revised manuscript JSON.",
      { context, outline, manuscript, qa },
      storyManuscriptSchema
    );
  }

  async polishManuscript(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript): Promise<StoryManuscript> {
    return this.generateJson(
      [
        "Polish this children's picture-book manuscript for stronger read-aloud craft while preserving the schema, title, page count, typography, writingStyle, locked cast, inspirations, and core plot.",
        "Improve bouncy rhythm, clean rhyme, recurring refrain, playful surprise, page-turn tension, and emotional payoff.",
        `Use these original craft exemplars as quality targets, not as copy: ${JSON.stringify(storyCraftExamples)}`,
        "Use short page text with natural meter. Keep language musical but original; do not imitate any specific copyrighted book or author.",
        "Make each page visually distinct enough to illustrate, and make the final page feel satisfying and warm.",
      ].join(" "),
      { context, outline, manuscript },
      storyManuscriptSchema
    );
  }

  async reviewStory(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript): Promise<QaResult> {
    return this.generateJson(
      "Review this story for age appropriateness, coherence, safety, locked-cast consistency, requested writingStyle, worldRules compliance, inspiration compliance, location grounding, and continuity. Fail if it uses non-locked named cast, ignores hard world rules, ignores an EXPLICIT inspiration, does not follow the manuscript writingStyle, or leaves the central story question unresolved. Return pass/fail JSON.",
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
          content: "You write safe, coherent children's stories for the requested age range. This is an evolving Little World, not a fixed canned series: use storyExamples for tone, structure, and variety, then create a unique episode that grows from recentSummaries, canon, memory, locations, worldRules, and inspirations. Follow worldRules as hard constraints. Use inspirations as curated guidance: EXPLICIT means the child-facing story may name the inspiration, THEME means use only the underlying value. Keep religious, seasonal, family, or custom inspirations gentle, age-safe, and woven into the Little World plot rather than replacing it. Use known locations as anchors; if introducing a new place, relate it clearly to an existing location. Use only the locked character cast from input, keep their display names stable, and make the MAIN character the lead. Preserve retrieved memory facts, do not invent prior meetings or past events unless they are included in context, and reference memory only when it naturally supports the episode. Connected worlds are parent-approved and optional; include crossover elements only when the provided probability/context supports it, and never expose private family information. Do not assume the child appears in the story or has a provided name. Return only valid JSON matching the requested schema."
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

function selectWritingStyle(context: StoryContext): WritingStyle {
  const roll = Math.floor(Math.random() * 100) + 1;
  if (isUnderOne(context.child.ageRange)) {
    if (roll <= 70) return "rhymed_verse";
    if (roll <= 90) return "rhythmic_repetition";
    if (roll <= 97) return "call_and_response";
    return "gentle_prose";
  }

  if (roll <= 65) return "rhymed_verse";
  if (roll <= 80) return "rhythmic_repetition";
  if (roll <= 90) return "call_and_response";
  return "gentle_prose";
}

function isUnderOne(ageRange: string) {
  return ageRange === "1-11 months";
}

function writingStyleInstruction(style: WritingStyle) {
  const instructions = {
    rhymed_verse: "Write most page text in short, bouncy rhyming couplets with clear meter, simple vocabulary, and natural read-aloud rhythm. Do not force awkward rhymes.",
    rhythmic_repetition: "Use repeated rhythmic phrases, soft rhymes, and predictable sound patterns suitable for read-aloud picture books.",
    call_and_response: "Use playful repeated call-and-response lines, simple refrains, and occasional rhyme so caregivers and children can join in.",
    gentle_prose: "Write warm non-rhyming picture-book prose with clear sentences, sensory details, and a calm read-aloud cadence.",
  } satisfies Record<WritingStyle, string>;
  return instructions[style];
}

const storyCraftExamples = [
  {
    focus: "rhyming page beat",
    text: "Nora tapped once. The teacups rang. / Tink-a-link-ling went the cupboard clang.",
    note: "Two short lines, clear sound play, easy to read aloud."
  },
  {
    focus: "recurring refrain",
    text: "So they tiptoed together: one, two, three— / What tiny wonder waits for me?",
    note: "A repeatable page-turn line children can anticipate."
  },
  {
    focus: "comic escalation",
    text: "The hat was too tall for the doorway, too wide for the stair, / and somehow had crumbs in its curly blue hair.",
    note: "Silly complication without danger."
  },
  {
    focus: "gentle conflict",
    text: "Milo wanted the first turn fast. Pip wanted a careful start.",
    note: "Simple emotional tension that can be solved kindly."
  },
  {
    focus: "page turn",
    text: "Behind the green curtain came one little peep— / not loud like a roar, but not quite asleep.",
    note: "Creates curiosity for the next illustration."
  },
  {
    focus: "young toddler repetition",
    text: "Pat, pat, pat went the rain. / Tap, tap, tap went the pane.",
    note: "Concrete sounds and repetition for very young children."
  },
  {
    focus: "warm resolution",
    text: "The basket was mended, the berries were bright, / and every small helper felt ten feet of light.",
    note: "Resolves the object problem and emotional arc."
  },
  {
    focus: "character voice",
    text: "\"One paw at a time,\" said Tuck with a grin. / \"That is the way that brave things begin.\"",
    note: "Distinct voice plus memorable value."
  },
  {
    focus: "light magical image",
    text: "A moonbeam slid down like a silvery slide / and curled into stars at the pebble bridge side.",
    note: "Whimsical, bright imagery."
  },
  {
    focus: "closing softness",
    text: "The little world hummed its soft goodnight song, / and the friends carried kindness all evening long.",
    note: "Gentle final cadence for read-aloud closure."
  }
] as const;
