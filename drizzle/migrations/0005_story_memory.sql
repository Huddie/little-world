CREATE TABLE `memory_events` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `child_id` text,
  `source_book_issue_id` text,
  `scope` text NOT NULL,
  `event_type` text NOT NULL,
  `summary` text NOT NULL,
  `importance` integer NOT NULL,
  `confidence` integer DEFAULT 3 NOT NULL,
  `story_time` text,
  `dedupe_hash` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`source_book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX `memory_events_dedupe_unique` ON `memory_events` (`universe_id`,`child_id`,`scope`,`event_type`,`dedupe_hash`);
CREATE INDEX `memory_events_retrieval_idx` ON `memory_events` (`universe_id`,`child_id`,`importance`,`created_at`);
CREATE INDEX `memory_events_source_issue_idx` ON `memory_events` (`source_book_issue_id`);

CREATE TABLE `memory_event_entities` (
  `id` text PRIMARY KEY NOT NULL,
  `memory_event_id` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`memory_event_id`) REFERENCES `memory_events`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `memory_event_entities_event_entity_unique` ON `memory_event_entities` (`memory_event_id`,`entity_type`,`entity_id`);
CREATE INDEX `memory_event_entities_entity_idx` ON `memory_event_entities` (`entity_type`,`entity_id`);

CREATE TABLE `character_relationship_memories` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `child_id` text NOT NULL,
  `character_a_id` text NOT NULL,
  `character_b_id` text NOT NULL,
  `source_book_issue_id` text,
  `relationship_type` text NOT NULL,
  `summary` text NOT NULL,
  `first_met_at_story_time` text,
  `importance` integer NOT NULL,
  `dedupe_hash` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`source_book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX `character_relationship_memories_pair_idx` ON `character_relationship_memories` (`child_id`,`character_a_id`,`character_b_id`);
CREATE UNIQUE INDEX `character_relationship_memories_dedupe_unique` ON `character_relationship_memories` (`child_id`,`character_a_id`,`character_b_id`,`relationship_type`,`dedupe_hash`);
CREATE INDEX `character_relationship_memories_source_issue_idx` ON `character_relationship_memories` (`source_book_issue_id`);

CREATE TABLE `character_profile_memories` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `child_id` text NOT NULL,
  `character_id` text NOT NULL,
  `source_book_issue_id` text,
  `memory_type` text NOT NULL,
  `summary` text NOT NULL,
  `importance` integer NOT NULL,
  `dedupe_hash` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`source_book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX `character_profile_memories_character_idx` ON `character_profile_memories` (`child_id`,`character_id`,`importance`);
CREATE UNIQUE INDEX `character_profile_memories_dedupe_unique` ON `character_profile_memories` (`child_id`,`character_id`,`memory_type`,`dedupe_hash`);
CREATE INDEX `character_profile_memories_source_issue_idx` ON `character_profile_memories` (`source_book_issue_id`);

CREATE TABLE `character_image_memories` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `child_id` text NOT NULL,
  `character_id` text NOT NULL,
  `asset_id` text NOT NULL,
  `source_book_issue_id` text,
  `page_number` integer NOT NULL,
  `memory_event_id` text,
  `caption` text NOT NULL,
  `importance` integer NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `usage_count` integer DEFAULT 0 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`source_book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`memory_event_id`) REFERENCES `memory_events`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX `character_image_memories_character_idx` ON `character_image_memories` (`child_id`,`character_id`,`importance`);
CREATE UNIQUE INDEX `character_image_memories_source_unique` ON `character_image_memories` (`character_id`,`asset_id`);
CREATE INDEX `character_image_memories_source_issue_idx` ON `character_image_memories` (`source_book_issue_id`);

CREATE TABLE `memory_embeddings` (
  `id` text PRIMARY KEY NOT NULL,
  `record_type` text NOT NULL,
  `record_id` text NOT NULL,
  `vector_id` text NOT NULL,
  `model` text NOT NULL,
  `dimensions` integer NOT NULL,
  `content_hash` text NOT NULL,
  `status` text NOT NULL,
  `last_error` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `memory_embeddings_record_unique` ON `memory_embeddings` (`record_type`,`record_id`);
CREATE UNIQUE INDEX `memory_embeddings_vector_unique` ON `memory_embeddings` (`vector_id`);
CREATE INDEX `memory_embeddings_status_idx` ON `memory_embeddings` (`status`);
