DROP INDEX IF EXISTS `book_issues_subscription_episode_unique`;
DROP INDEX IF EXISTS `book_issues_subscription_scheduled_unique`;
CREATE UNIQUE INDEX `book_issues_subscription_child_episode_unique` ON `book_issues` (`subscription_id`,`child_id`,`episode_number`);
CREATE UNIQUE INDEX `book_issues_subscription_child_scheduled_unique` ON `book_issues` (`subscription_id`,`child_id`,`scheduled_for`);
