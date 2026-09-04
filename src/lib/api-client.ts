import { httpApiClient } from "./http-api-client";
import type { AdminAccess, AdminBookIssue, AdminChildRow, AdminDelivery, AdminFailures, AdminMemory, AdminSubscriptionRow, AdminUserRow, AdminWorldCatalog, AgeRange, BookIssue, ChildSummary, DashboardData, Product, SelectedCharacter, UserProfile } from "../types/client";

export interface ApiClient {
  getDashboard(childId?: string): Promise<DashboardData>;
  getProfile(): Promise<UserProfile>;
  updateProfile(input: { name: string | null }): Promise<{ ok: true }>;
  getChildren(): Promise<ChildSummary[]>;
  getProducts(): Promise<Product[]>;
  getBookIssue(id: string): Promise<BookIssue>;
  getAdminIssues(): Promise<AdminBookIssue[]>;
  getAdminIssue(id: string): Promise<AdminBookIssue>;
  getAdminAccess(): Promise<AdminAccess>;
  getAdminDeliveries(): Promise<AdminDelivery[]>;
  getAdminFailures(): Promise<AdminFailures>;
  getAdminMemory(): Promise<AdminMemory>;
  getAdminWorldCatalog(): Promise<AdminWorldCatalog>;
  backfillAdminMemory(): Promise<{ queued: number }>;
  getAdminUsers(): Promise<AdminUserRow[]>;
  getAdminChildren(): Promise<AdminChildRow[]>;
  getAdminSubscriptions(): Promise<AdminSubscriptionRow[]>;
  updateAdminChild(id: string, input: UpdateChildRequest): Promise<{ ok: true }>;
  buildAdminChildStoryNow(id: string): Promise<{ issueId: string }>;
  getCharacterNameSuggestions(): Promise<string[]>;
  generateCharacterCast(input: GenerateCharacterCastRequest): Promise<SelectedCharacter[]>;
  signOut(): Promise<void>;
  createChild(input: CreateChildRequest): Promise<{ id: string }>;
  updateChild(id: string, input: UpdateChildRequest): Promise<{ ok: true }>;
  archiveChild(id: string): Promise<{ ok: true }>;
  createSubscription(input: CreateSubscriptionRequest): Promise<{ subscription: { id: string }; firstIssue: { id: string } }>;
  updateSubscriptionStatus(id: string, status: "ACTIVE" | "PAUSED" | "CANCELLED"): Promise<{ ok: true }>;
  updateSubscriptionFrequency(id: string, frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY"): Promise<{ ok: true }>;
  updateSubscriptionDeliveryEmail(id: string, deliveryEmail: string | null): Promise<{ ok: true }>;
  updateSubscriptionDeliveryMethods(id: string, deliveryMethods: Array<"EMAIL" | "MAIL">): Promise<{ ok: true }>;
  deleteSubscription(id: string): Promise<{ ok: true }>;
  resendBookEmail(id: string): Promise<{ ok: true }>;
  deleteAccount(): Promise<{ ok: true }>;
  retryBookIssue(id: string): Promise<{ ok: true }>;
  retryBookIssueStep(issueId: string, stepId: string): Promise<{ ok: true }>;
  inviteRelationship(input: { childId: string; inviteeParentEmail: string }): Promise<DashboardData["relationships"]>;
  updateRelationshipStatus(id: string, status: "ACTIVE" | "REJECTED" | "REMOVED"): Promise<DashboardData["relationships"]>;
  saveStoryInspiration(notes: string): Promise<{ notes: string }>;
}

export interface CreateChildRequest {
  firstName?: string | null;
  birthDate?: string | null;
  ageRange: AgeRange;
  readingLevel?: string | null;
  interests: string[];
  favoriteCharacterIds: string[];
  selectedCharacters: Array<{
    characterId: string;
    sourceCharacterId?: string | null;
    displayName: string;
    species?: string | null;
    description?: string | null;
    personality?: string | null;
    profileImageUrls?: string[];
    imageStatus?: "PENDING" | "READY" | "FAILED";
    role: "MAIN" | "SUPPORTING";
  }>;
  mainCharacterId: string;
  likedThemes: string[];
  dislikedThemes: string[];
  storyGenres: string[];
  optionalParentNotes?: string | null;
}

export interface GenerateCharacterCastRequest {
  ageRange: AgeRange;
  storyGenres: string[];
  interests: string[];
}

export interface CreateSubscriptionRequest {
  childId: string;
  productId: string;
  deliveryMethods: Array<"EMAIL" | "MAIL">;
}

export interface UpdateChildRequest {
  firstName?: string | null;
  birthDate?: string | null;
  ageRange: AgeRange;
  readingLevel?: string | null;
  optionalParentNotes?: string | null;
}

export const apiClient: ApiClient = httpApiClient;
