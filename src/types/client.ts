export type DeliveryMethod = "EMAIL" | "MAIL";
export type DeliveryAvailability = "ENABLED" | "COMING_SOON" | "DISABLED";
export type SubscriptionFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
export type DeliveryDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type BookIssueStatus =
  | "SCHEDULED"
  | "GENERATING"
  | "QA"
  | "READY"
  | "DELIVERY_PENDING"
  | "DELIVERED"
  | "FAILED";
export type WorkflowStepStatus = "COMPLETE" | "CURRENT" | "PENDING" | "FAILED";
export type AgeRange = "1-11 months" | "12-23 months" | "2-3" | "4-5" | "6-8" | "9-12";
export type StoryTypography = "storybook" | "adventure" | "cozy" | "mystery" | "bedtime";
export type WritingStyle = "rhymed_verse" | "rhythmic_repetition" | "call_and_response" | "gentle_prose";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface ChildProfile {
  id: string;
  firstName: string | null;
  birthDate: string | null;
  ageRange: AgeRange;
  readingLevel: "Pre-reader" | "Early reader" | "Growing reader" | null;
  storyGenres: string[];
  interests: string[];
  favoriteCharacters: string[];
  selectedCharacters: SelectedCharacter[];
  charactersLockedAt: string | null;
  worldBuildStatus: "BUILDING" | "READY";
  parentNotes: string;
  inspirationSettings?: ChildInspirationSettings;
}

export interface ChildSummary {
  id: string;
  firstName: string | null;
  birthDate: string | null;
  ageRange: AgeRange;
  readingLevel: "Pre-reader" | "Early reader" | "Growing reader" | null;
  parentNotes: string;
  worldBuildStatus: "BUILDING" | "READY";
  activeSubscriptionId: string | null;
  latestBookIssueId: string | null;
  latestBookStatus: BookIssueStatus | null;
  archivedAt: string | null;
  inspirationSettings?: ChildInspirationSettings;
}

export interface SelectedCharacter {
  characterId: string;
  sourceCharacterId?: string | null;
  displayName: string;
  species?: string | null;
  description?: string | null;
  personality?: string | null;
  profileImageUrls?: string[];
  imageStatus?: "PENDING" | "READY" | "FAILED";
  role: "MAIN" | "SUPPORTING";
}

export interface UniverseCharacter {
  id: string;
  name: string;
  species: string;
  description: string;
  personality: string;
  portraitUrl: string;
  profileImages: string[];
  hiddenStyleReferenceIds: string[];
  color: string;
}

export interface Universe {
  id: string;
  slug: string;
  name: string;
  description: string;
  characters: UniverseCharacter[];
  locations: string[];
}

export interface AdminWorldCatalog {
  universes: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    active: boolean;
  }>;
  characters: Array<{
    id: string;
    universeId: string;
    slug: string;
    name: string;
    description: string;
    personality: string;
    visualDescriptionJson: string;
    profileImagesJson: string;
    hiddenStyleReferencesJson: string;
    active: boolean;
  }>;
  locations: Array<{
    id: string;
    universeId: string;
    slug: string;
    name: string;
    description: string;
    canonicalPropertiesJson: string;
  }>;
  worldRules: Array<{
    id: string;
    universeId: string;
    category: string;
    rule: string;
    rationale: string | null;
    active: boolean;
  }>;
}

export interface ProductDeliveryOption {
  method: DeliveryMethod;
  availability: DeliveryAvailability;
  label: string;
  description: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  universe: Universe;
  frequencyLabel: string;
  deliveryOptions: ProductDeliveryOption[];
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  product: Product;
  frequency: SubscriptionFrequency;
  childSlots: number;
  usedChildSlots: number;
  deliveryEmail: string | null;
  deliveryDayOfWeek?: DeliveryDayOfWeek;
  nextIssueAt: string;
  nextPaymentAt: string | null;
  lastIssueAt: string | null;
  deliveryMethods: DeliveryMethod[];
}

export type InspirationSourceStatus = "ACTIVE" | "PAUSED" | "DISABLED" | "ERROR";
export type InspirationMappingStatus = "ACTIVE" | "DRAFT" | "DISABLED";

export interface StoryInspirationSource {
  id: string;
  key: string;
  label: string;
  description: string;
  type: string;
  status: InspirationSourceStatus;
}

export interface StoryInspirationTheme {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface ChildInspirationSettings {
  childId: string;
  enabledSourceIds: string[];
  enabledThemeIds: string[];
  parentNotes: string;
}

export interface StoryInspirationCatalog {
  sources: StoryInspirationSource[];
  themes: StoryInspirationTheme[];
}

export interface StoryInspirationSelection {
  id: string;
  sourceId: string;
  sourceLabel: string;
  itemLabel: string;
  themeLabels: string[];
  childFacingMode: "HIDDEN" | "THEME" | "EXPLICIT";
}

export interface AdminInspirationMapping {
  id: string;
  sourceId: string;
  sourceLabel: string;
  itemLabel: string;
  themeLabels: string[];
  ageGuidance: string | null;
  promptGuidance: string | null;
  status: InspirationMappingStatus;
  updatedAt: string;
}

export interface AdminInspirationProviderStatus {
  sourceId: string;
  sourceLabel: string;
  status: InspirationSourceStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface AdminInspirationOverview {
  catalog: StoryInspirationCatalog;
  mappings: AdminInspirationMapping[];
  providerStatuses: AdminInspirationProviderStatus[];
}

export interface WorkflowStep {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  timestamp: string | null;
}

export interface BookPage {
  id: string;
  pageNumber: number;
  pageType: "COVER" | "STORY" | "ENDING" | "COLLECTION";
  text: string;
  illustrationUrl: string;
}

export interface BookIssue {
  id: string;
  supportCode: string;
  episodeNumber: number;
  title: string;
  subtitle: string | null;
  typography: StoryTypography;
  writingStyle: WritingStyle;
  status: BookIssueStatus;
  scheduledFor: string;
  readyAt: string | null;
  deliveredAt: string | null;
  coverUrl: string;
  pdfUrl: string | null;
  summary: string;
  pages: BookPage[];
  workflow: WorkflowStep[];
  inspirations?: StoryInspirationSelection[];
}

export interface DeliveryAttempt {
  id: string;
  method: DeliveryMethod;
  status: "SENT" | "FAILED" | "PENDING";
  attemptedAt: string;
  detail: string;
}

export interface AdminBookIssue extends BookIssue {
  childLabel: string;
  parentEmail: string;
  qaResult: "PASS" | "REVIEW" | "FAIL";
  rawError: string | null;
  deliveryAttempts: DeliveryAttempt[];
}

export interface AdminAccess {
  roles: string[];
  permissions: string[];
}

export interface AdminDelivery {
  id: string;
  bookIssueId: string;
  subscriptionId: string;
  method: DeliveryMethod;
  status: "PENDING" | "PROCESSING" | "SENT" | "DELIVERED" | "FAILED";
  provider: string;
  providerReference: string | null;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
}

export interface AdminFailures {
  failedIssues: Array<{
    id: string;
    subscriptionId: string;
    childId: string;
    episodeNumber: number;
    scheduledFor: string;
    status: BookIssueStatus;
    lastError: string | null;
    updatedAt: string;
  }>;
  failedDeliveries: AdminDelivery[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  childrenCount: number;
  subscriptionsCount: number;
  createdAt: string;
}

export interface AdminChildRow {
  id: string;
  parentEmail: string;
  firstName: string | null;
  birthDate: string | null;
  ageRange: AgeRange;
  readingLevel: string | null;
  worldBuildStatus: "BUILDING" | "READY";
  selectedCharacterCount: number;
  activeSubscriptionId: string | null;
  latestIssueStatus: BookIssueStatus | null;
  createdAt: string;
}

export interface AdminSubscriptionRow {
  id: string;
  parentEmail: string;
  status: SubscriptionStatus;
  productName: string;
  frequency: SubscriptionFrequency;
  childSlots: number;
  usedChildSlots: number;
  deliveryMethods: DeliveryMethod[];
  deliveryEmail: string | null;
  deliveryDayOfWeek?: DeliveryDayOfWeek;
  nextIssueAt: string;
  lastIssueAt: string | null;
  createdAt: string;
}

export interface AdminMemory {
  events: Array<{
    id: string;
    childId: string | null;
    universeId: string;
    sourceBookIssueId: string | null;
    scope: string;
    eventType: string;
    summary: string;
    importance: number;
    confidence: number;
    storyTime: string | null;
    createdAt: string;
    entities: Array<{ entityType: string; entityId: string }>;
    embeddingStatus: string;
  }>;
  characterProfiles: Array<{
    id: string;
    childId: string;
    characterId: string;
    sourceBookIssueId: string | null;
    memoryType: string;
    summary: string;
    importance: number;
    createdAt: string;
  }>;
  relationships: Array<{
    id: string;
    childId: string;
    characterAId: string;
    characterBId: string;
    sourceBookIssueId: string | null;
    relationshipType: string;
    summary: string;
    importance: number;
    createdAt: string;
  }>;
  imageMemories: Array<{
    id: string;
    childId: string;
    characterId: string;
    assetId: string;
    sourceBookIssueId: string | null;
    pageNumber: number;
    caption: string;
    importance: number;
    active: boolean;
    usageCount: number;
    createdAt: string;
  }>;
}

export interface DashboardData {
  user: UserProfile;
  children: ChildSummary[];
  child: ChildProfile;
  subscription: Subscription;
  currentIssue: BookIssue;
  books: BookIssue[];
  relationships: WorldRelationship[];
}

export interface WorldRelationship {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "REMOVED";
  childAId: string;
  childBId: string | null;
  direction: "INCOMING" | "OUTGOING";
  canAccept: boolean;
  createdAt: string;
  acceptedAt: string | null;
}
