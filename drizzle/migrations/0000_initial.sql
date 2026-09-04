CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `name` text,
  `email_verified` integer DEFAULT false NOT NULL,
  `image` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

CREATE TABLE `user_roles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `user_roles_user_role_unique` ON `user_roles` (`user_id`,`role`);
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);

CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` text NOT NULL,
  `token` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);

CREATE TABLE `accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `issuer` text NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` text,
  `refresh_token_expires_at` text,
  `scope` text,
  `password` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `accounts_issuer_account_unique` ON `accounts` (`issuer`,`account_id`);
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);

CREATE TABLE `verifications` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text,
  `updated_at` text
);
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);

CREATE TABLE `children` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `first_name` text,
  `birth_date` text,
  `age_range` text NOT NULL,
  `reading_level` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `child_preferences` (
  `id` text PRIMARY KEY NOT NULL,
  `child_id` text NOT NULL,
  `interests_json` text DEFAULT '[]' NOT NULL,
  `favorite_character_ids_json` text DEFAULT '[]' NOT NULL,
  `selected_character_cast_json` text DEFAULT '[]' NOT NULL,
  `main_character_id` text DEFAULT '' NOT NULL,
  `characters_locked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `liked_themes_json` text DEFAULT '[]' NOT NULL,
  `disliked_themes_json` text DEFAULT '[]' NOT NULL,
  `story_genres_json` text DEFAULT '[]' NOT NULL,
  `optional_parent_notes` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `universes` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `universes_slug_unique` ON `universes` (`slug`);

CREATE TABLE `characters` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `personality` text NOT NULL,
  `visual_description_json` text NOT NULL,
  `profile_images_json` text DEFAULT '[]' NOT NULL,
  `hidden_style_references_json` text DEFAULT '[]' NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `characters_universe_slug_unique` ON `characters` (`universe_id`,`slug`);

CREATE TABLE `locations` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `canonical_properties_json` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `locations_universe_slug_unique` ON `locations` (`universe_id`,`slug`);

CREATE TABLE `products` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `universe_id` text NOT NULL,
  `frequency` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);

CREATE TABLE `product_delivery_options` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `method` text NOT NULL,
  `availability` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `product_delivery_options_unique` ON `product_delivery_options` (`product_id`,`method`);

CREATE TABLE `subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `child_id` text NOT NULL,
  `product_id` text NOT NULL,
  `status` text NOT NULL,
  `frequency` text NOT NULL,
  `next_issue_at` text NOT NULL,
  `last_issue_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `subscriptions_child_product_unique` ON `subscriptions` (`child_id`,`product_id`);

CREATE TABLE `subscription_delivery_methods` (
  `id` text PRIMARY KEY NOT NULL,
  `subscription_id` text NOT NULL,
  `method` text NOT NULL,
  `enabled` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `subscription_delivery_methods_unique` ON `subscription_delivery_methods` (`subscription_id`,`method`);

CREATE TABLE `book_issues` (
  `id` text PRIMARY KEY NOT NULL,
  `subscription_id` text NOT NULL,
  `child_id` text NOT NULL,
  `universe_id` text NOT NULL,
  `episode_number` integer NOT NULL,
  `scheduled_for` text NOT NULL,
  `status` text NOT NULL,
  `generation_started_at` text,
  `ready_at` text,
  `delivered_at` text,
  `last_error` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `book_issues_subscription_episode_unique` ON `book_issues` (`subscription_id`,`episode_number`);
CREATE UNIQUE INDEX `book_issues_subscription_scheduled_unique` ON `book_issues` (`subscription_id`,`scheduled_for`);

CREATE TABLE `assets` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,
  `r2_key` text NOT NULL,
  `content_type` text NOT NULL,
  `byte_size` integer,
  `checksum` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `books` (
  `id` text PRIMARY KEY NOT NULL,
  `book_issue_id` text NOT NULL,
  `title` text NOT NULL,
  `subtitle` text,
  `story_json` text NOT NULL,
  `outline_json` text NOT NULL,
  `generation_metadata_json` text DEFAULT '{}' NOT NULL,
  `pdf_asset_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`pdf_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `books_book_issue_unique` ON `books` (`book_issue_id`);

CREATE TABLE `book_pages` (
  `id` text PRIMARY KEY NOT NULL,
  `book_id` text NOT NULL,
  `page_number` integer NOT NULL,
  `page_type` text NOT NULL,
  `text` text NOT NULL,
  `illustration_prompt` text,
  `illustration_asset_id` text,
  `metadata_json` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`illustration_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `book_pages_book_page_unique` ON `book_pages` (`book_id`,`page_number`);

CREATE TABLE `generation_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `book_issue_id` text NOT NULL,
  `step` text NOT NULL,
  `status` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `attempt_count` integer DEFAULT 0 NOT NULL,
  `input_hash` text,
  `output_ref` text,
  `last_error` text,
  `started_at` text,
  `completed_at` text,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `generation_steps_key_unique` ON `generation_steps` (`idempotency_key`);

CREATE TABLE `qa_results` (
  `id` text PRIMARY KEY NOT NULL,
  `book_issue_id` text NOT NULL,
  `kind` text NOT NULL,
  `passed` integer NOT NULL,
  `result_json` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `book_issue_id` text NOT NULL,
  `subscription_id` text NOT NULL,
  `method` text NOT NULL,
  `status` text NOT NULL,
  `provider` text NOT NULL,
  `provider_reference` text,
  `attempt_count` integer DEFAULT 0 NOT NULL,
  `last_error` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `sent_at` text,
  `delivered_at` text,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `deliveries_issue_subscription_method_unique` ON `deliveries` (`book_issue_id`,`subscription_id`,`method`);

CREATE TABLE `delivery_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `delivery_id` text NOT NULL,
  `status` text NOT NULL,
  `provider_reference` text,
  `error` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `episode_summaries` (
  `id` text PRIMARY KEY NOT NULL,
  `book_issue_id` text NOT NULL,
  `child_id` text NOT NULL,
  `universe_id` text NOT NULL,
  `episode_number` integer NOT NULL,
  `title` text NOT NULL,
  `summary` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `episode_summaries_issue_unique` ON `episode_summaries` (`book_issue_id`);

CREATE TABLE `canon_events` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `child_id` text,
  `book_issue_id` text,
  `event_type` text NOT NULL,
  `summary` text NOT NULL,
  `summary_hash` text NOT NULL,
  `importance` integer NOT NULL,
  `occurred_at_story_time` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX `canon_events_issue_hash_unique` ON `canon_events` (`book_issue_id`,`event_type`,`summary_hash`);

CREATE TABLE `relationships` (
  `id` text PRIMARY KEY NOT NULL,
  `child_a_id` text NOT NULL,
  `child_b_id` text NOT NULL,
  `inviter_user_id` text NOT NULL,
  `invitee_user_id` text NOT NULL,
  `status` text NOT NULL,
  `created_by_user_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `accepted_at` text,
  FOREIGN KEY (`child_a_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_b_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX `relationships_pair_unique` ON `relationships` (`child_a_id`,`child_b_id`);

CREATE TABLE `shared_canon_events` (
  `id` text PRIMARY KEY NOT NULL,
  `relationship_id` text NOT NULL,
  `event_type` text NOT NULL,
  `summary` text NOT NULL,
  `importance` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `shared_canon_event_sources` (
  `id` text PRIMARY KEY NOT NULL,
  `shared_canon_event_id` text NOT NULL,
  `book_issue_id` text NOT NULL,
  FOREIGN KEY (`shared_canon_event_id`) REFERENCES `shared_canon_events`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `universes` (`id`, `slug`, `name`, `description`, `active`) VALUES
  ('universe_moonlight_forest', 'moonlight-forest', 'Moonlight Forest', 'A gentle woodland world where small mysteries glow under friendly moonlight.', true);

INSERT INTO `characters` (`id`, `universe_id`, `slug`, `name`, `description`, `personality`, `visual_description_json`, `profile_images_json`, `hidden_style_references_json`, `active`) VALUES
  ('character_milo', 'universe_moonlight_forest', 'milo', 'Milo', 'An adventurous bear who loves helping friends try brave things.', 'Warm, bold, encouraging, sometimes rushes ahead before listening.', '{"species":"bear","colors":["honey brown","cream muzzle"],"accessories":["green kerchief"],"proportions":"round and sturdy","traits":["kind eyes","soft paws"]}', '["r2://book-assets/character-profile/milo-1.webp","r2://book-assets/character-profile/milo-2.webp","r2://book-assets/character-profile/milo-3.webp"]', '["r2://book-assets/character-style/milo-front.webp","r2://book-assets/character-style/milo-side.webp","r2://book-assets/character-style/milo-expression.webp"]', true),
  ('character_pip', 'universe_moonlight_forest', 'pip', 'Pip', 'A nervous but clever rabbit who notices tiny clues others miss.', 'Careful, witty, anxious, inventive, proud when small plans work.', '{"species":"rabbit","colors":["soft gray","white tail"],"accessories":["tiny blue satchel"],"proportions":"small with long ears","traits":["bright eyes","expressive ears"]}', '["r2://book-assets/character-profile/pip-1.webp","r2://book-assets/character-profile/pip-2.webp","r2://book-assets/character-profile/pip-3.webp"]', '["r2://book-assets/character-style/pip-front.webp","r2://book-assets/character-style/pip-side.webp","r2://book-assets/character-style/pip-expression.webp"]', true),
  ('character_juniper', 'universe_moonlight_forest', 'juniper', 'Juniper', 'A mischievous fox with a generous heart and a flair for surprises.', 'Playful, curious, dramatic, learns to turn mischief into kindness.', '{"species":"fox","colors":["rust orange","white chest"],"accessories":["yellow scarf"],"proportions":"lithe and spry","traits":["wide grin","fluffy tail"]}', '["r2://book-assets/character-profile/juniper-1.webp","r2://book-assets/character-profile/juniper-2.webp","r2://book-assets/character-profile/juniper-3.webp"]', '["r2://book-assets/character-style/juniper-front.webp","r2://book-assets/character-style/juniper-side.webp","r2://book-assets/character-style/juniper-expression.webp"]', true),
  ('character_tuck', 'universe_moonlight_forest', 'tuck', 'Tuck', 'A thoughtful turtle who helps everyone slow down and think clearly.', 'Patient, observant, gentle, gives practical advice without preaching.', '{"species":"turtle","colors":["moss green","warm brown shell"],"accessories":["round spectacles"],"proportions":"small and steady","traits":["calm smile","patterned shell"]}', '["r2://book-assets/character-profile/tuck-1.webp","r2://book-assets/character-profile/tuck-2.webp","r2://book-assets/character-profile/tuck-3.webp"]', '["r2://book-assets/character-style/tuck-front.webp","r2://book-assets/character-style/tuck-side.webp","r2://book-assets/character-style/tuck-expression.webp"]', true);

INSERT INTO `locations` (`id`, `universe_id`, `slug`, `name`, `description`, `canonical_properties_json`) VALUES
  ('location_pebble_bridge', 'universe_moonlight_forest', 'pebble-bridge', 'Pebble Bridge', 'A curved little bridge made of smooth river stones.', '{"mood":"safe crossing place","recurring_use":"meetings and small mysteries"}'),
  ('location_moonberry_hill', 'universe_moonlight_forest', 'moonberry-hill', 'Moonberry Hill', 'A grassy hill where silver berries glow after sunset.', '{"mood":"wonder","recurring_use":"gentle magical discoveries"}'),
  ('location_whispering_creek', 'universe_moonlight_forest', 'whispering-creek', 'Whispering Creek', 'A shallow creek that seems to hum when the moon is bright.', '{"mood":"calm","recurring_use":"listening and reflection"}'),
  ('location_firefly_hollow', 'universe_moonlight_forest', 'firefly-hollow', 'Firefly Hollow', 'A cozy hollow lit by friendly fireflies.', '{"mood":"celebration","recurring_use":"endings and gatherings"}'),
  ('location_old_oak_clearing', 'universe_moonlight_forest', 'old-oak-clearing', 'Old Oak Clearing', 'A sunny clearing around the oldest oak in the forest.', '{"mood":"home base","recurring_use":"starts of adventures"}');

INSERT INTO `products` (`id`, `slug`, `name`, `universe_id`, `frequency`, `active`) VALUES
  ('product_moonlight_forest_monthly', 'moonlight-forest-monthly', 'Moonlight Forest Monthly', 'universe_moonlight_forest', 'MONTHLY', true);

INSERT INTO `product_delivery_options` (`id`, `product_id`, `method`, `availability`) VALUES
  ('pdo_moonlight_email', 'product_moonlight_forest_monthly', 'EMAIL', 'ENABLED'),
  ('pdo_moonlight_mail', 'product_moonlight_forest_monthly', 'MAIL', 'COMING_SOON');
