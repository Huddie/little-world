import type { AssetStore } from "../../storage/asset-store";
import type { GeneratedCastMember } from "./cast-generator";
import type { IllustrationGenerator } from "../illustrations/illustration-generator";

export type CharacterImageSet = {
  characterId: string;
  profileImageAssetIds: string[];
  hiddenStyleReferenceAssetIds: string[];
};

type GenerateCharacterImageSetsInput = {
  childId: string;
  cast: GeneratedCastMember[];
  imageGenerator: IllustrationGenerator;
  assetStore: AssetStore;
};

const profileViews = ["front portrait", "three-quarter portrait", "full-body standing portrait"] as const;

export async function generateCharacterImageSets(input: GenerateCharacterImageSetsInput): Promise<CharacterImageSet[]> {
  const sets: CharacterImageSet[] = [];

  for (const character of input.cast) {
    const profileImageAssetIds: string[] = [];

    for (const view of profileViews) {
      const image = await input.imageGenerator.generate({
        bookIssueId: input.childId,
        pageNumber: profileImageAssetIds.length + 1,
        prompt: characterReferencePrompt(character, view),
        styleGuide: characterReferenceStyleGuide(character),
      });
      const asset = await input.assetStore.put({
        kind: "CHARACTER_PROFILE",
        contentType: image.contentType,
        bytes: image.bytes,
        metadata: { ...image.metadata, characterId: character.characterId, sourceCharacterId: character.sourceCharacterId, view },
      });
      profileImageAssetIds.push(asset.id);
    }

    sets.push({
      characterId: character.characterId,
      profileImageAssetIds,
      hiddenStyleReferenceAssetIds: [],
    });
  }

  return sets;
}

function characterReferenceStyleGuide(character: GeneratedCastMember): string {
  return [
    "Polished modern children's picture book character reference art.",
    "Clean readable silhouette, warm expressive face, light airy pastel colors, simple bright cream or pale sky background.",
    "Use cheerful studio-style lighting. Avoid dark, muddy, gloomy, nighttime, heavy-shadow, or high-contrast dramatic color grading.",
    "The image must contain exactly one character and no other people, animals, companions, crowds, text, logos, props that imply another character, or story scene action.",
    `Character: ${character.displayName}, ${character.species}.`,
    `Description: ${character.description}`,
    `Personality: ${character.personality}`,
  ].join("\n");
}

function characterReferencePrompt(character: GeneratedCastMember, view: string): string {
  return [
    `${view} of ${character.displayName}.`,
    "Solo character reference image only.",
    "Centered composition with the complete character clearly visible.",
    "Neutral or very simple soft background.",
    "No other characters in the image.",
  ].join(" ");
}
