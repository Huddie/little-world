PRAGMA foreign_keys=OFF;

CREATE TABLE `relationships_new` (
  `id` text PRIMARY KEY NOT NULL,
  `child_a_id` text NOT NULL,
  `child_b_id` text,
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
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `relationships_new` (
  `id`,
  `child_a_id`,
  `child_b_id`,
  `inviter_user_id`,
  `invitee_user_id`,
  `status`,
  `created_by_user_id`,
  `created_at`,
  `accepted_at`
)
SELECT
  `id`,
  `child_a_id`,
  `child_b_id`,
  `inviter_user_id`,
  `invitee_user_id`,
  `status`,
  `created_by_user_id`,
  `created_at`,
  `accepted_at`
FROM `relationships`;

DROP TABLE `relationships`;
ALTER TABLE `relationships_new` RENAME TO `relationships`;
CREATE UNIQUE INDEX `relationships_child_pair_unique` ON `relationships` (`child_a_id`, `child_b_id`);

PRAGMA foreign_keys=ON;
