export type IllustrationInput = {
  bookIssueId: string;
  pageNumber: number;
  prompt: string;
  styleGuide: string;
  referenceImages?: IllustrationReferenceImage[];
};

export type IllustrationReferenceImage = {
  name: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  bytes: Uint8Array;
};

export type GeneratedIllustration = {
  contentType: "image/png";
  bytes: Uint8Array;
  metadata: Record<string, unknown>;
};

export interface IllustrationGenerator {
  generate(input: IllustrationInput): Promise<GeneratedIllustration>;
}

export class MockIllustrationGenerator implements IllustrationGenerator {
  async generate(input: IllustrationInput): Promise<GeneratedIllustration> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><rect width="1024" height="768" fill="#f8efd2"/><text x="64" y="384" font-family="serif" font-size="48" fill="#244536">Little World page ${input.pageNumber}</text></svg>`;
    return {
      contentType: "image/png",
      bytes: new TextEncoder().encode(svg),
      metadata: { prompt: input.prompt, mock: true }
    };
  }
}
