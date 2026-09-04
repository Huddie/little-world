import OpenAI, { toFile } from "openai";
import type { GeneratedIllustration, IllustrationGenerator, IllustrationInput } from "./illustration-generator";

export class OpenAiIllustrationGenerator implements IllustrationGenerator {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = "gpt-image-2") {
    this.client = new OpenAI({ apiKey, maxRetries: 2, timeout: 120_000 });
    this.model = model;
  }

  async generate(input: IllustrationInput): Promise<GeneratedIllustration> {
    const prompt = [
      input.styleGuide,
      input.referenceImages?.length
        ? "Use the attached character reference images as the canonical cast. Match their species, silhouettes, proportions, colors, clothing/accessories, and illustration style. Do not substitute other animals or invent replacement cast members. Generate a new scene; do not copy the reference poses or backgrounds."
        : null,
      input.prompt,
    ].filter(Boolean).join("\n\n");
    const response = input.referenceImages?.length
      ? await this.client.images.edit({
          model: this.model,
          image: await Promise.all(input.referenceImages.map((reference, index) => toFile(reference.bytes, reference.name || `reference-${index + 1}.png`, { type: reference.contentType }))),
          prompt,
          quality: "medium",
          size: "1024x1024"
        })
      : await this.client.images.generate({
          model: this.model,
          prompt,
          quality: "medium",
          size: "1024x1024"
        });
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) throw new Error("OpenAI image response did not include image data");
    const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return {
      contentType: "image/png",
      bytes: binary,
      metadata: { model: this.model, prompt: input.prompt, referenceImages: input.referenceImages?.map((reference) => reference.name) ?? [] }
    };
  }
}
