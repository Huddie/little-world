ALTER TABLE `generation_steps` ADD COLUMN `created_at` text;
ALTER TABLE `generation_steps` ADD COLUMN `updated_at` text;

UPDATE `generation_steps`
SET
  `created_at` = COALESCE(`created_at`, `started_at`, CURRENT_TIMESTAMP),
  `updated_at` = COALESCE(`updated_at`, `completed_at`, `started_at`, CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX IF NOT EXISTS `generation_steps_issue_step_unique` ON `generation_steps` (`book_issue_id`,`step`);
