import OpenAI from "openai";
import { z } from "zod";
import { cuteCharacterNameExamples } from "../../lib/character-name-suggestions";

const nameSuggestionSchema = z.object({
  names: z.array(z.string().trim().min(1).max(40)).min(20).max(100),
});

export type CharacterNameSuggestionInput = {
  universeName: string;
  characterSpecies?: string | undefined;
  characterPersonality?: string | undefined;
  count?: number | undefined;
};

export class CharacterNameSuggestionService {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(apiKey?: string, model = "gpt-5.6-luna") {
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = model;
  }

  async suggest(input: CharacterNameSuggestionInput): Promise<string[]> {
    const count = input.count ?? 100;
    if (!this.client) return cuteCharacterNameExamples.slice(0, count);

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: "system",
          content: "Generate cute, kid-friendly character display names. Names should be short, warm, playful, pronounceable, and safe for children. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({ ...input, count }),
        },
      ],
    });

    const parsed = nameSuggestionSchema.parse(JSON.parse(response.output_text));
    return parsed.names.slice(0, count);
  }
}
