export const deliveryMethods = ["EMAIL", "MAIL"] as const;
export type DeliveryMethod = (typeof deliveryMethods)[number];

export const deliveryAvailability = ["ENABLED", "COMING_SOON", "DISABLED"] as const;
export type DeliveryAvailability = (typeof deliveryAvailability)[number];

export const subscriptionFrequencies = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type SubscriptionFrequency = (typeof subscriptionFrequencies)[number];

export const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof weekdays)[number];

export const subscriptionStatuses = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const inspirationSourceKinds = ["CURATED", "SEFARIA_CALENDAR", "CUSTOM"] as const;
export type InspirationSourceKind = (typeof inspirationSourceKinds)[number];

export const inspirationItemTypes = ["THEME", "CALENDAR_READING", "HOLIDAY", "CUSTOM_NOTE"] as const;
export type InspirationItemType = (typeof inspirationItemTypes)[number];

export const inspirationModes = ["OFF", "THEME", "EXPLICIT"] as const;
export type InspirationMode = (typeof inspirationModes)[number];

export const bookIssueStatuses = [
  "SCHEDULED",
  "GENERATING",
  "QA",
  "READY",
  "DELIVERY_PENDING",
  "DELIVERED",
  "FAILED",
] as const;
export type BookIssueStatus = (typeof bookIssueStatuses)[number];

export const bookPageTypes = ["COVER", "STORY", "ENDING", "COLLECTION"] as const;
export type BookPageType = (typeof bookPageTypes)[number];

export const assetKinds = ["ILLUSTRATION", "CHARACTER_PROFILE", "CHARACTER_STYLE_REFERENCE", "PDF", "THUMBNAIL", "INTERMEDIATE"] as const;
export type AssetKind = (typeof assetKinds)[number];

export const deliveryStatuses = ["PENDING", "PROCESSING", "SENT", "DELIVERED", "FAILED"] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

export const generationStepStatuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;
export type GenerationStepStatus = (typeof generationStepStatuses)[number];

export const relationshipStatuses = ["PENDING", "ACTIVE", "REJECTED", "REMOVED"] as const;
export type RelationshipStatus = (typeof relationshipStatuses)[number];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

export type NewChildInput = {
  userId: string;
  firstName?: string | null;
  birthDate?: string | null;
  ageRange: "1-11 months" | "12-23 months" | "2-3" | "4-5" | "6-8" | "9-12";
  readingLevel?: string;
};

export type SelectedCharacterRole = "MAIN" | "SUPPORTING";

export type SelectedCharacterInput = {
  characterId: string;
  sourceCharacterId?: string | null;
  displayName: string;
  species?: string | null;
  description?: string | null;
  personality?: string | null;
  role: SelectedCharacterRole;
};

export type ChildPreferencesInput = {
  childId: string;
  interests: string[];
  favoriteCharacterIds: string[];
  selectedCharacters: SelectedCharacterInput[];
  mainCharacterId: string;
  likedThemes: string[];
  dislikedThemes: string[];
  storyGenres: string[];
  optionalParentNotes?: string;
};

export type CreateSubscriptionInput = {
  userId: string;
  childId: string;
  productSlug: string;
  deliveryMethods: DeliveryMethod[];
  now?: Date;
};

export type CanonRetrievalInput = {
  childId: string;
  universeId: string;
  recentEpisodeLimit?: number;
  highImportanceLimit?: number;
};
