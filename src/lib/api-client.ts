import { adminIssues, dashboardData, moonlightMonthly } from "./mock-data";
import { cuteCharacterNameExamples } from "./character-name-suggestions";
import { httpApiClient } from "./http-api-client";
import type { AdminAccess, AdminBookIssue, AdminChildRow, AdminDelivery, AdminFailures, AdminSubscriptionRow, AdminUserRow, AgeRange, BookIssue, ChildSummary, DashboardData, Product, SelectedCharacter, UserProfile } from "../types/client";

const delay = async (): Promise<void> => {
  await new Promise((resolve) => window.setTimeout(resolve, 120));
};

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
  getAdminUsers(): Promise<AdminUserRow[]>;
  getAdminChildren(): Promise<AdminChildRow[]>;
  getAdminSubscriptions(): Promise<AdminSubscriptionRow[]>;
  getCharacterNameSuggestions(): Promise<string[]>;
  generateCharacterCast(input: GenerateCharacterCastRequest): Promise<SelectedCharacter[]>;
  signOut(): Promise<void>;
  createChild(input: CreateChildRequest): Promise<{ id: string }>;
  archiveChild(id: string): Promise<{ ok: true }>;
  createSubscription(input: CreateSubscriptionRequest): Promise<{ subscription: { id: string }; firstIssue: { id: string } }>;
  updateSubscriptionStatus(id: string, status: "ACTIVE" | "PAUSED" | "CANCELLED"): Promise<{ ok: true }>;
  updateSubscriptionFrequency(id: string, frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY"): Promise<{ ok: true }>;
  updateSubscriptionDeliveryMethods(id: string, deliveryMethods: Array<"EMAIL" | "MAIL">): Promise<{ ok: true }>;
  deleteSubscription(id: string): Promise<{ ok: true }>;
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

const mockApiClient: ApiClient = {
  async getDashboard() {
    await delay();
    return dashboardData;
  },

  async getProfile() {
    await delay();
    return dashboardData.user;
  },

  async updateProfile() {
    await delay();
    return { ok: true };
  },

  async getChildren() {
    await delay();
    return dashboardData.children;
  },

  async getProducts() {
    await delay();
    return [moonlightMonthly];
  },

  async getBookIssue(id) {
    await delay();
    const book = dashboardData.books.find((candidate) => candidate.id === id);
    if (!book) {
      throw new Error("Book issue not found");
    }
    return book;
  },

  async getAdminIssues() {
    await delay();
    return adminIssues;
  },

  async getAdminIssue(id) {
    await delay();
    const issue = adminIssues.find((candidate) => candidate.id === id);
    if (!issue) {
      throw new Error("Admin book issue not found");
    }
    return issue;
  },

  async getAdminAccess() {
    await delay();
    return { roles: ["ADMIN"], permissions: ["admin:read", "admin:retry"] };
  },

  async getAdminDeliveries() {
    await delay();
    return [];
  },

  async getAdminFailures() {
    await delay();
    return { failedIssues: [], failedDeliveries: [] };
  },

  async getAdminUsers() {
    await delay();
    return [];
  },

  async getAdminChildren() {
    await delay();
    return [];
  },

  async getAdminSubscriptions() {
    await delay();
    return [];
  },

  async getCharacterNameSuggestions() {
    await delay();
    return [...cuteCharacterNameExamples];
  },

  async generateCharacterCast() {
    await delay();
    return dashboardData.child.selectedCharacters;
  },

  async signOut() {
    await delay();
  },

  async createChild() {
    await delay();
    return { id: dashboardData.child.id };
  },

  async archiveChild() {
    await delay();
    return { ok: true };
  },

  async createSubscription() {
    await delay();
    return { subscription: { id: dashboardData.subscription.id }, firstIssue: { id: dashboardData.currentIssue.id } };
  },

  async updateSubscriptionStatus() {
    await delay();
    return { ok: true };
  },

  async updateSubscriptionFrequency() {
    await delay();
    return { ok: true };
  },

  async updateSubscriptionDeliveryMethods() {
    await delay();
    return { ok: true };
  },

  async deleteSubscription() {
    await delay();
    return { ok: true };
  },

  async deleteAccount() {
    await delay();
    return { ok: true };
  },

  async retryBookIssue() {
    await delay();
    return { ok: true };
  },

  async retryBookIssueStep() {
    await delay();
    return { ok: true };
  },

  async inviteRelationship() {
    await delay();
    return dashboardData.relationships;
  },

  async updateRelationshipStatus() {
    await delay();
    return dashboardData.relationships;
  },

  async saveStoryInspiration(notes) {
    await delay();
    return { notes };
  },
};

export const apiClient: ApiClient = import.meta.env.VITE_USE_MOCK_API === "true" ? mockApiClient : httpApiClient;
