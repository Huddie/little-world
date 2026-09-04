import type { AdminAccess, AdminBookIssue, AdminChildRow, AdminDelivery, AdminFailures, AdminMemory, AdminSubscriptionRow, AdminUserRow, BookIssue, ChildSummary, DashboardData, Product, SelectedCharacter, UserProfile } from "../types/client";
import type { ApiClient } from "./api-client";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(parseApiErrorMessage(message) || `Request failed with ${status}`);
  }
}

function parseApiErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? message;
  } catch {
    return message;
  }
}

export async function requestMagicLink(input: { email: string; name?: string }) {
  const response = await fetch("/api/auth/sign-in/magic-link", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      callbackURL: "/app",
      newUserCallbackURL: "/onboarding",
      errorCallbackURL: "/sign-in",
    }),
  });

  if (!response.ok) throw new ApiError(response.status, await response.text());
}

export const httpApiClient: ApiClient = {
  getDashboard(childId) {
    return request<DashboardData>(childId ? `/api/dashboard?childId=${encodeURIComponent(childId)}` : "/api/dashboard");
  },

  getProfile() {
    return request<UserProfile>("/api/profile");
  },

  updateProfile(input) {
    return request<{ ok: true }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  getChildren() {
    return request<ChildSummary[]>("/api/children");
  },

  getProducts() {
    return request<Product[]>("/api/products");
  },

  getBookIssue(id) {
    return request<BookIssue>(`/api/books/${id}`);
  },

  getAdminIssues() {
    return request<AdminBookIssue[]>("/api/admin/book-issues");
  },

  getAdminIssue(id) {
    return request<AdminBookIssue>(`/api/admin/book-issues/${id}`);
  },

  getAdminAccess() {
    return request<AdminAccess>("/api/admin/me");
  },

  getAdminDeliveries() {
    return request<AdminDelivery[]>("/api/admin/deliveries");
  },

  getAdminFailures() {
    return request<AdminFailures>("/api/admin/failures");
  },

  getAdminMemory() {
    return request<AdminMemory>("/api/admin/memory");
  },

  backfillAdminMemory() {
    return request<{ queued: number }>("/api/admin/memory/backfill", { method: "POST" });
  },

  getAdminUsers() {
    return request<AdminUserRow[]>("/api/admin/users");
  },

  getAdminChildren() {
    return request<AdminChildRow[]>("/api/admin/children");
  },

  getAdminSubscriptions() {
    return request<AdminSubscriptionRow[]>("/api/admin/subscriptions");
  },

  async getCharacterNameSuggestions() {
    const response = await request<{ names: string[] }>("/api/character-names/suggest", {
      method: "POST",
      body: JSON.stringify({ universeName: "Little World", count: 100 }),
    });
    return response.names;
  },

  async generateCharacterCast(input) {
    const response = await request<{ characters: SelectedCharacter[] }>("/api/characters/generate-cast", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.characters;
  },

  async signOut() {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new ApiError(response.status, await response.text());
  },

  createChild(input) {
    return request<{ id: string }>("/api/children", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  archiveChild(id) {
    return request<{ ok: true }>(`/api/children/${id}`, { method: "DELETE" });
  },

  createSubscription(input) {
    return request<{ subscription: { id: string }; firstIssue: { id: string } }>("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateSubscriptionStatus(id, status) {
    return request<{ ok: true }>(`/api/subscriptions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  updateSubscriptionFrequency(id, frequency) {
    return request<{ ok: true }>(`/api/subscriptions/${id}/frequency`, {
      method: "PATCH",
      body: JSON.stringify({ frequency }),
    });
  },

  updateSubscriptionDeliveryMethods(id, deliveryMethods) {
    return request<{ ok: true }>(`/api/subscriptions/${id}/delivery`, {
      method: "PATCH",
      body: JSON.stringify({ deliveryMethods }),
    });
  },

  deleteSubscription(id) {
    return request<{ ok: true }>(`/api/subscriptions/${id}`, { method: "DELETE" });
  },

  deleteAccount() {
    return request<{ ok: true }>("/api/account", { method: "DELETE" });
  },

  retryBookIssue(id) {
    return request<{ ok: true }>(`/api/admin/book-issues/${id}/retry`, { method: "POST" });
  },

  retryBookIssueStep(issueId, stepId) {
    return request<{ ok: true }>(`/api/admin/book-issues/${issueId}/steps/${stepId}/retry`, { method: "POST" });
  },

  inviteRelationship(input) {
    return request<DashboardData["relationships"]>("/api/relationships", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateRelationshipStatus(id, status) {
    return request<DashboardData["relationships"]>(`/api/relationships/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  async saveStoryInspiration(notes) {
    const response = await request<{ notes: string }>("/api/children/current/inspiration", {
      method: "PATCH",
      body: JSON.stringify({ optionalParentNotes: notes }),
    });
    return response;
  },
};
