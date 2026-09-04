import { z } from "zod";

export const storyOutlineSchema = z.object({
  title: z.string().min(1),
  premise: z.string().min(1),
  featuredCharacterIds: z.array(z.string().min(1)),
  theme: z.string().min(1),
  continuityReferences: z.array(
    z.object({
      canonEventId: z.string().min(1),
      purpose: z.string().min(1)
    })
  ),
  beats: z.array(
    z.object({
      order: z.number().int().positive(),
      description: z.string().min(1)
    })
  )
});

export type StoryOutline = z.infer<typeof storyOutlineSchema>;

export const storyManuscriptSchema = z.object({
  title: z.string().min(1),
  pages: z.array(
    z.object({
      pageNumber: z.number().int().positive(),
      text: z.string().min(1),
      sceneDescription: z.string().min(1),
      charactersPresent: z.array(z.string().min(1))
    })
  ).min(8).max(12)
});

export type StoryManuscript = z.infer<typeof storyManuscriptSchema>;

export const illustrationBriefSchema = z.object({
  pageNumber: z.number().int().positive(),
  prompt: z.string().min(1),
  characters: z.array(z.string().min(1))
});

export type IllustrationBrief = z.infer<typeof illustrationBriefSchema>;

export const qaResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()),
  revisionGuidance: z.string().nullable()
});

export type QaResult = z.infer<typeof qaResultSchema>;

export const canonExtractionSchema = z.object({
  episodeSummary: z.string().min(1),
  canonEvents: z.array(
    z.object({
      eventType: z.string().min(1),
      summary: z.string().min(1),
      importance: z.number().int().min(1).max(5)
    })
  )
});

export type CanonExtraction = z.infer<typeof canonExtractionSchema>;

export type StoryCharacter = {
  id: string;
  name: string;
  baseName: string;
  description: string;
  personality: string;
  visualDescriptionJson: string;
  profileImagesJson: string;
  hiddenStyleReferencesJson: string;
  role: "MAIN" | "SUPPORTING";
};

export type StoryContext = {
  child: { id: string; firstName: string | null; birthDate: string | null; ageRange: string };
  universe: { id: string; name: string; description: string };
  characters: StoryCharacter[];
  preferences: {
    interests: string[];
    favoriteCharacterIds: string[];
    mainCharacterId: string | null;
    charactersLockedAt: string | null;
    storyGenres: string[];
    optionalParentNotes: string | null;
  };
  recentSummaries: Array<{ episodeNumber: number; summary: string }>;
  storyExamples: Array<{ title: string; ageRange: string; genre: string; summary: string; beats: string[]; styleNotes: string }>;
  canon: Array<{ id: string; eventType: string; summary: string; importance: number }>;
  connectedWorlds: {
    probability: number;
    childIds: string[];
  };
};
