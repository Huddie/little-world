import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { UniverseCharacter } from "../../types/client";

export const generatedCastMemberSchema = z.object({
  characterId: z.string().trim().min(1).max(80),
  sourceCharacterId: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(80),
  species: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(600),
  personality: z.string().trim().min(1).max(600),
  role: z.enum(["MAIN", "SUPPORTING"]),
});

export const generatedCastSchema = z.object({
  characters: z.array(generatedCastMemberSchema).min(3).max(5),
}).superRefine((input, context) => {
  const ids = new Set(input.characters.map((character) => character.characterId));
  const names = new Set(input.characters.map((character) => character.displayName.toLowerCase()));
  const mainCount = input.characters.filter((character) => character.role === "MAIN").length;

  if (ids.size !== input.characters.length) {
    context.addIssue({ code: "custom", message: "Generated character IDs must be unique.", path: ["characters"] });
  }

  if (names.size !== input.characters.length) {
    context.addIssue({ code: "custom", message: "Generated character names must be unique.", path: ["characters"] });
  }

  if (mainCount !== 1) {
    context.addIssue({ code: "custom", message: "Exactly one generated character must be MAIN.", path: ["characters"] });
  }
});

export type GeneratedCastMember = z.infer<typeof generatedCastMemberSchema>;

export type GenerateCastInput = {
  universeName: string;
  universeDescription: string;
  ageRange: string;
  storyGenres: string[];
  interests: string[];
  curatedCharacters: UniverseCharacter[];
};

export const mockGeneratedCast: GeneratedCastMember[] = [
  {
    characterId: "generated-bramble",
    sourceCharacterId: "milo",
    displayName: "Bramble",
    species: "Tiny bear",
    description: "A brave little helper who carries a pouch of found buttons and notices when friends need courage.",
    personality: "Gentle, protective, curious, and quick to turn a problem into a team mission.",
    role: "MAIN",
  },
  {
    characterId: "generated-nori",
    sourceCharacterId: "pip",
    displayName: "Nori",
    species: "Moon rabbit",
    description: "A soft-footed map keeper who listens closely and finds clues in very small places.",
    personality: "Thoughtful, observant, a little cautious, and proud when careful plans work.",
    role: "SUPPORTING",
  },
  {
    characterId: "generated-lulu",
    sourceCharacterId: "juniper",
    displayName: "Lulu",
    species: "Little fox",
    description: "A bright idea-maker with paint on her paws and a habit of turning ordinary paths into parades.",
    personality: "Playful, inventive, warm, and happiest when a surprise becomes kind.",
    role: "SUPPORTING",
  },
];

export class CharacterCastGenerator {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(apiKey?: string, model = "gpt-5.6-terra") {
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = model;
  }

  async generate(input: GenerateCastInput): Promise<GeneratedCastMember[]> {
    if (!this.client) throw new Error("OPENAI_API_KEY is required for character cast generation");

    const response = await this.client.responses.parse({
      model: this.model,
      text: { format: zodTextFormat(generatedCastSchema, "generated_character_cast") },
      input: [
        {
          role: "system",
          content: [
            "Create a new unique recurring story cast for a child's Little World.",
            "Return only JSON that matches this schema: { characters: [{ characterId, sourceCharacterId, displayName, species, description, personality, role }] }.",
            "Field rules:",
            "- characterId: stable generated slug/id, never a curated source id.",
            "- sourceCharacterId: one curated example id used only as style/personality inspiration.",
            "- displayName: short, warm, pronounceable, kid-friendly, unique in this cast.",
            "- species: concrete storybook creature or friendly character type.",
            "- description: external story/profile description, specific and visual.",
            "- personality: durable persona traits for future stories.",
            "- role: exactly one MAIN; all others SUPPORTING.",
            "Use curatedCharacters as examples of tone, scope, and visual consistency. Do not copy their names or exact personas.",
            "Every returned character must be new, distinct, safe for the requested age range, and reusable across future stories.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            requestedCastSize: 3,
            fieldExamples: {
              characterId: "generated-sprig",
              sourceCharacterId: "pip",
              displayName: "Sprig",
              species: "Pocket rabbit",
              description: "A tiny listener with oversized rain boots and a satchel of folded maps.",
              personality: "Careful, hopeful, funny when nervous, and proud after solving small clues.",
              role: "MAIN",
            },
            input,
          }),
        },
      ],
    });

    if (!response.output_parsed) throw new Error("OpenAI did not return a generated character cast");
    return response.output_parsed.characters;
  }
}
