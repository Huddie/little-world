import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique").on(table.email),
}));

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userRoleUnique: uniqueIndex("user_roles_user_role_unique").on(table.userId, table.role),
  userIdx: index("user_roles_user_idx").on(table.userId),
}));

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: text("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tokenUnique: uniqueIndex("sessions_token_unique").on(table.token),
  userIdx: index("sessions_user_idx").on(table.userId),
}));

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  issuer: text("issuer").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: text("access_token_expires_at"),
  refreshTokenExpiresAt: text("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  issuerAccountUnique: uniqueIndex("accounts_issuer_account_unique").on(table.issuer, table.accountId),
  userIdx: index("accounts_user_idx").on(table.userId),
}));

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  identifierIdx: index("verifications_identifier_idx").on(table.identifier),
}));

export const universes = sqliteTable("universes", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugUnique: uniqueIndex("universes_slug_unique").on(table.slug),
}));

export const storyExamples = sqliteTable("story_examples", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  ageRange: text("age_range").notNull(),
  genre: text("genre").notNull(),
  summary: text("summary").notNull(),
  storyBeatsJson: text("story_beats_json").notNull().default("[]"),
  styleNotes: text("style_notes").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  universeAgeIdx: index("story_examples_universe_age_idx").on(table.universeId, table.ageRange),
}));

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  personality: text("personality").notNull(),
  visualDescriptionJson: text("visual_description_json").notNull(),
  profileImagesJson: text("profile_images_json").notNull().default("[]"),
  hiddenStyleReferencesJson: text("hidden_style_references_json").notNull().default("[]"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  universeSlugUnique: uniqueIndex("characters_universe_slug_unique").on(table.universeId, table.slug),
  universeIdx: index("characters_universe_idx").on(table.universeId),
}));

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  canonicalPropertiesJson: text("canonical_properties_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  universeSlugUnique: uniqueIndex("locations_universe_slug_unique").on(table.universeId, table.slug),
}));

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "restrict" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugUnique: uniqueIndex("products_slug_unique").on(table.slug),
  universeIdx: index("products_universe_idx").on(table.universeId),
}));

export const productDeliveryOptions = sqliteTable("product_delivery_options", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  availability: text("availability").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  productMethodUnique: uniqueIndex("product_delivery_options_product_method_unique").on(table.productId, table.method),
}));

export const children = sqliteTable("children", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  birthDate: text("birth_date"),
  ageRange: text("age_range").notNull(),
  readingLevel: text("reading_level"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: index("children_user_idx").on(table.userId),
}));

export const childPreferences = sqliteTable("child_preferences", {
  id: text("id").primaryKey(),
  childId: text("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  interestsJson: text("interests_json").notNull(),
  favoriteCharacterIdsJson: text("favorite_character_ids_json").notNull(),
  selectedCharacterCastJson: text("selected_character_cast_json").notNull(),
  mainCharacterId: text("main_character_id").notNull(),
  charactersLockedAt: text("characters_locked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  likedThemesJson: text("liked_themes_json").notNull(),
  dislikedThemesJson: text("disliked_themes_json").notNull(),
  storyGenresJson: text("story_genres_json").notNull(),
  optionalParentNotes: text("optional_parent_notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  childUnique: uniqueIndex("child_preferences_child_unique").on(table.childId),
}));

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  childId: text("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  status: text("status").notNull(),
  frequency: text("frequency").notNull(),
  childSlots: integer("child_slots").notNull().default(1),
  nextIssueAt: text("next_issue_at").notNull(),
  lastIssueAt: text("last_issue_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  childProductStatusUnique: uniqueIndex("subscriptions_child_product_status_unique").on(table.childId, table.productId, table.status),
  dueIdx: index("subscriptions_due_idx").on(table.status, table.nextIssueAt),
  userIdx: index("subscriptions_user_idx").on(table.userId),
}));

export const subscriptionChildSlots = sqliteTable("subscription_child_slots", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  childId: text("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  subscriptionChildUnique: uniqueIndex("subscription_child_slots_subscription_child_unique").on(table.subscriptionId, table.childId),
  subscriptionIdx: index("subscription_child_slots_subscription_idx").on(table.subscriptionId),
  childIdx: index("subscription_child_slots_child_idx").on(table.childId),
}));

export const subscriptionDeliveryMethods = sqliteTable("subscription_delivery_methods", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  subscriptionMethodUnique: uniqueIndex("subscription_delivery_methods_subscription_method_unique").on(table.subscriptionId, table.method),
}));

export const bookIssues = sqliteTable("book_issues", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  childId: text("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "restrict" }),
  episodeNumber: integer("episode_number").notNull(),
  scheduledFor: text("scheduled_for").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  generationStartedAt: text("generation_started_at"),
  readyAt: text("ready_at"),
  deliveredAt: text("delivered_at"),
  lastError: text("last_error"),
}, (table) => ({
  subscriptionEpisodeUnique: uniqueIndex("book_issues_subscription_episode_unique").on(table.subscriptionId, table.episodeNumber),
  subscriptionScheduledUnique: uniqueIndex("book_issues_subscription_scheduled_unique").on(table.subscriptionId, table.scheduledFor),
  childIdx: index("book_issues_child_idx").on(table.childId),
  statusIdx: index("book_issues_status_idx").on(table.status),
}));

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  r2Key: text("r2_key").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size"),
  checksum: text("checksum"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  r2KeyUnique: uniqueIndex("assets_r2_key_unique").on(table.r2Key),
}));

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  bookIssueId: text("book_issue_id").notNull().references(() => bookIssues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  storyJson: text("story_json").notNull(),
  outlineJson: text("outline_json").notNull(),
  generationMetadataJson: text("generation_metadata_json").notNull(),
  pdfAssetId: text("pdf_asset_id").references(() => assets.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  bookIssueUnique: uniqueIndex("books_book_issue_unique").on(table.bookIssueId),
}));

export const bookPages = sqliteTable("book_pages", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  pageType: text("page_type").notNull(),
  text: text("text").notNull(),
  illustrationPrompt: text("illustration_prompt"),
  illustrationAssetId: text("illustration_asset_id").references(() => assets.id, { onDelete: "set null" }),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  bookPageUnique: uniqueIndex("book_pages_book_page_unique").on(table.bookId, table.pageNumber),
}));

export const generationSteps = sqliteTable("generation_steps", {
  id: text("id").primaryKey(),
  bookIssueId: text("book_issue_id").notNull().references(() => bookIssues.id, { onDelete: "cascade" }),
  step: text("step").notNull(),
  status: text("status").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  inputHash: text("input_hash"),
  outputRef: text("output_ref"),
  lastError: text("last_error"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
}, (table) => ({
  idempotencyUnique: uniqueIndex("generation_steps_idempotency_unique").on(table.idempotencyKey),
  issueStepUnique: uniqueIndex("generation_steps_issue_step_unique").on(table.bookIssueId, table.step),
}));

export const qaResults = sqliteTable("qa_results", {
  id: text("id").primaryKey(),
  bookIssueId: text("book_issue_id").notNull().references(() => bookIssues.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  resultJson: text("result_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  issueKindUnique: uniqueIndex("qa_results_issue_kind_unique").on(table.bookIssueId, table.kind),
}));

export const deliveries = sqliteTable("deliveries", {
  id: text("id").primaryKey(),
  bookIssueId: text("book_issue_id").notNull().references(() => bookIssues.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  sentAt: text("sent_at"),
  deliveredAt: text("delivered_at"),
}, (table) => ({
  issueSubscriptionMethodUnique: uniqueIndex("deliveries_issue_subscription_method_unique").on(table.bookIssueId, table.subscriptionId, table.method),
  statusIdx: index("deliveries_status_idx").on(table.status),
}));

export const deliveryAttempts = sqliteTable("delivery_attempts", {
  id: text("id").primaryKey(),
  deliveryId: text("delivery_id").notNull().references(() => deliveries.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  deliveryIdx: index("delivery_attempts_delivery_idx").on(table.deliveryId),
}));

export const canonEvents = sqliteTable("canon_events", {
  id: text("id").primaryKey(),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "cascade" }),
  childId: text("child_id").references(() => children.id, { onDelete: "cascade" }),
  bookIssueId: text("book_issue_id").references(() => bookIssues.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  summaryHash: text("summary_hash").notNull(),
  importance: integer("importance").notNull(),
  occurredAtStoryTime: text("occurred_at_story_time"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  dedupeUnique: uniqueIndex("canon_events_dedupe_unique").on(table.universeId, table.childId, table.eventType, table.summaryHash),
  retrievalIdx: index("canon_events_retrieval_idx").on(table.universeId, table.childId, table.importance, table.createdAt),
}));

export const episodeSummaries = sqliteTable("episode_summaries", {
  id: text("id").primaryKey(),
  bookIssueId: text("book_issue_id").notNull().references(() => bookIssues.id, { onDelete: "cascade" }),
  childId: text("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  universeId: text("universe_id").notNull().references(() => universes.id, { onDelete: "cascade" }),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  issueUnique: uniqueIndex("episode_summaries_issue_unique").on(table.bookIssueId),
  childUniverseEpisodeIdx: index("episode_summaries_child_universe_episode_idx").on(table.childId, table.universeId, table.episodeNumber),
}));

export const relationships = sqliteTable("relationships", {
  id: text("id").primaryKey(),
  childAId: text("child_a_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  childBId: text("child_b_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  inviterUserId: text("inviter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inviteeUserId: text("invitee_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  acceptedAt: text("accepted_at"),
}, (table) => ({
  childPairUnique: uniqueIndex("relationships_child_pair_unique").on(table.childAId, table.childBId),
}));

export const sharedCanonEvents = sqliteTable("shared_canon_events", {
  id: text("id").primaryKey(),
  relationshipId: text("relationship_id").notNull().references(() => relationships.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  importance: integer("importance").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  relationshipIdx: index("shared_canon_events_relationship_idx").on(table.relationshipId),
}));

export const sharedCanonEventSources = sqliteTable("shared_canon_event_sources", {
  id: text("id").primaryKey(),
  sharedCanonEventId: text("shared_canon_event_id").notNull().references(() => sharedCanonEvents.id, { onDelete: "cascade" }),
  bookIssueId: text("book_issue_id").notNull().references(() => bookIssues.id, { onDelete: "cascade" }),
}, (table) => ({
  sourceUnique: uniqueIndex("shared_canon_event_sources_unique").on(table.sharedCanonEventId, table.bookIssueId),
}));

export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  subscriptions: many(subscriptions),
  roles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  user: one(users, { fields: [children.userId], references: [users.id] }),
  preferences: one(childPreferences, { fields: [children.id], references: [childPreferences.childId] }),
  subscriptions: many(subscriptions),
  bookIssues: many(bookIssues),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  child: one(children, { fields: [subscriptions.childId], references: [children.id] }),
  product: one(products, { fields: [subscriptions.productId], references: [products.id] }),
  childSlots: many(subscriptionChildSlots),
  deliveryMethods: many(subscriptionDeliveryMethods),
  bookIssues: many(bookIssues),
}));

export const subscriptionChildSlotsRelations = relations(subscriptionChildSlots, ({ one }) => ({
  subscription: one(subscriptions, { fields: [subscriptionChildSlots.subscriptionId], references: [subscriptions.id] }),
  child: one(children, { fields: [subscriptionChildSlots.childId], references: [children.id] }),
}));

export const bookIssuesRelations = relations(bookIssues, ({ one, many }) => ({
  subscription: one(subscriptions, { fields: [bookIssues.subscriptionId], references: [subscriptions.id] }),
  child: one(children, { fields: [bookIssues.childId], references: [children.id] }),
  universe: one(universes, { fields: [bookIssues.universeId], references: [universes.id] }),
  book: one(books, { fields: [bookIssues.id], references: [books.bookIssueId] }),
  generationSteps: many(generationSteps),
  deliveries: many(deliveries),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  bookIssue: one(bookIssues, { fields: [books.bookIssueId], references: [bookIssues.id] }),
  pdfAsset: one(assets, { fields: [books.pdfAssetId], references: [assets.id] }),
  pages: many(bookPages),
}));
