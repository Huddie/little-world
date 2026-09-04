ALTER TABLE `book_issues` ADD COLUMN `generation_run_id` text;
CREATE INDEX `book_issues_generation_run_idx` ON `book_issues` (`generation_run_id`);
