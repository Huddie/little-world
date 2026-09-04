import type { z } from "zod";
import type { CanonExtraction, QaResult, StoryContext, StoryManuscript, StoryOutline } from "./schemas";
import { canonExtractionSchema, qaResultSchema, storyManuscriptSchema, storyOutlineSchema } from "./schemas";

export interface StoryGenerator {
  generateOutline(context: StoryContext): Promise<StoryOutline>;
  generateManuscript(context: StoryContext, outline: StoryOutline): Promise<StoryManuscript>;
  polishManuscript(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript): Promise<StoryManuscript>;
  reviseManuscript(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript, qa: QaResult): Promise<StoryManuscript>;
  reviewStory(context: StoryContext, outline: StoryOutline, manuscript: StoryManuscript): Promise<QaResult>;
  extractCanon(context: StoryContext, manuscript: StoryManuscript): Promise<CanonExtraction>;
}

export async function parseWithRetry<T>(operation: () => Promise<unknown>, schema: z.ZodType<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return schema.parse(await operation());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export class MockStoryGenerator implements StoryGenerator {
  async generateOutline(context: StoryContext): Promise<StoryOutline> {
    const collectionLabel = childDisplayName(context.child.firstName);
    const mainCharacter = context.characters.find((character) => character.role === "MAIN") ?? context.characters[0];
    return storyOutlineSchema.parse({
      title: `${mainCharacter?.name ?? "Juniper"} and the Tiny Door in the Sky`,
      premise: `${collectionLabel} gets a gentle evolving-world adventure led by ${mainCharacter?.name ?? "a main character"} about trying again after a wobbly day.`,
      featuredCharacterIds: context.characters.slice(0, 3).map((character) => character.id),
      theme: "Trying again after frustration",
      continuityReferences: context.memory.importantEvents.slice(0, 2).map((event) => ({ memoryId: event.id, entityIds: event.entityIds, purpose: "Gentle continuity callback" })),
      beats: [
        { order: 1, description: `${mainCharacter?.name ?? "Juniper"} finds a tiny door where the sky meets the tallest hill.` },
        { order: 2, description: "Pip worries they cannot fix it before moonrise." },
        { order: 3, description: "Milo suggests trying one small step at a time." },
        { order: 4, description: "The friends discover moonberries glow when everyone helps." }
      ]
    });
  }

  async generateManuscript(context: StoryContext, outline: StoryOutline): Promise<StoryManuscript> {
    const title = outline.title;
    return storyManuscriptSchema.parse({
      title,
      writingStyle: "rhymed_verse",
      pages: Array.from({ length: 10 }, (_, index) => ({
        pageNumber: index + 1,
        text: storyPageText(index),
        sceneDescription: `A warm picture-book forest scene for page ${index + 1}.`,
        charactersPresent: outline.featuredCharacterIds
      }))
    });
  }

  async reviewStory(): Promise<QaResult> {
    return qaResultSchema.parse({ passed: true, issues: [], revisionGuidance: null });
  }

  async polishManuscript(_context: StoryContext, _outline: StoryOutline, manuscript: StoryManuscript): Promise<StoryManuscript> {
    return manuscript;
  }

  async reviseManuscript(_context: StoryContext, _outline: StoryOutline, manuscript: StoryManuscript): Promise<StoryManuscript> {
    return manuscript;
  }

  async extractCanon(context: StoryContext, manuscript: StoryManuscript): Promise<CanonExtraction> {
    return canonExtractionSchema.parse({
      episodeSummary: `${manuscript.title}: the locked cast solved a lantern problem by trying again together.`,
      canonEvents: [
        {
          eventType: "CHARACTER_DEVELOPMENT",
          summary: "Juniper learned that patient teamwork can make mischief kinder.",
          importance: 3
        },
        {
          eventType: "CHILD_PREFERENCE",
          summary: `${childDisplayName(context.child.firstName)} stories can gently explore trying again after frustration.`,
          importance: 4
        }
      ],
      memoryEvents: [
        {
          scope: "CHILD",
          eventType: "CHARACTER_DEVELOPMENT",
          summary: "Juniper learned that patient teamwork can make mischief kinder.",
          importance: 3,
          confidence: 4,
          entities: [{ entityType: "CHARACTER", entityId: context.characters[0]?.id ?? "character_juniper" }]
        }
      ],
      characterProfileMemories: [
        {
          characterId: context.characters[0]?.id ?? "character_juniper",
          memoryType: "GROWTH",
          summary: "Patient teamwork helps this character turn big ideas into kinder surprises.",
          importance: 3
        }
      ],
      characterRelationshipMemories: [],
      imageMemoryCandidates: []
    });
  }
}

function storyPageText(index: number): string {
  const pages = [
    "The little world was quiet, except for one tiny clink near a hill that had not been there yesterday.",
    "Juniper held up a little key. It should have opened something, but it only blinked once.",
    "Pip's ears trembled. \"What if the moon path stays dark?\"",
    "Milo smiled. \"Then we try one small thing, and then another.\"",
    "Tuck looked closely and found a moonberry caught inside the latch.",
    "Juniper tugged too fast. The lantern popped shut again with a plunk.",
    "She took a breath and tried more slowly. Pip counted softly beside her.",
    "This time the latch opened, and silver light spilled over the moss.",
    "The friends carried the key to a new blue door, where the path began to sparkle.",
    "The little world had grown by one secret, and next month another corner might appear."
  ];
  return pages[index] ?? pages.at(-1) ?? "";
}

function childDisplayName(firstName: string | null): string {
  return firstName ? `${firstName}'s Little World` : "This Little World";
}
