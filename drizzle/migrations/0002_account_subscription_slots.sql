ALTER TABLE `subscriptions` ADD COLUMN `child_slots` integer DEFAULT 1 NOT NULL;

CREATE TABLE IF NOT EXISTS `subscription_child_slots` (
  `id` text PRIMARY KEY NOT NULL,
  `subscription_id` text NOT NULL,
  `child_id` text NOT NULL,
  `status` text DEFAULT 'ACTIVE' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `subscription_child_slots_subscription_child_unique` ON `subscription_child_slots` (`subscription_id`,`child_id`);
CREATE INDEX IF NOT EXISTS `subscription_child_slots_subscription_idx` ON `subscription_child_slots` (`subscription_id`);
CREATE INDEX IF NOT EXISTS `subscription_child_slots_child_idx` ON `subscription_child_slots` (`child_id`);

INSERT OR IGNORE INTO `subscription_child_slots` (`id`, `subscription_id`, `child_id`, `status`, `created_at`, `updated_at`)
SELECT 'slot_' || lower(hex(randomblob(16))), `id`, `child_id`, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `subscriptions`;
