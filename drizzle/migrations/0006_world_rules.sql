CREATE TABLE `world_rules` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `category` text NOT NULL,
  `rule` text NOT NULL,
  `rationale` text,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `world_rules_universe_category_idx` ON `world_rules` (`universe_id`,`category`);

INSERT OR IGNORE INTO `world_rules` (`id`, `universe_id`, `category`, `rule`, `rationale`)
VALUES
  ('world_rule_story_growth', 'universe_moonlight_forest', 'continuity', 'Every episode should add one small durable discovery, object, promise, relationship beat, or location detail that can matter later.', 'Little World should feel like a growing world, not disconnected one-off stories.'),
  ('world_rule_locked_cast', 'universe_moonlight_forest', 'characters', 'Use only the locked cast as named story characters unless the episode intentionally introduces a minor helper or place-based creature with no future ownership.', 'Parents chose a stable cast; stories should preserve that trust.'),
  ('world_rule_age_fit', 'universe_moonlight_forest', 'tone', 'Conflict should stay gentle, concrete, emotionally clear, and solvable by curiosity, kindness, patience, or teamwork.', 'The product targets young children and parent read-alouds.'),
  ('world_rule_place_grounding', 'universe_moonlight_forest', 'locations', 'Prefer known locations from the world map, and when adding a new place, connect it clearly to an existing location or recurring motif.', 'Grounded place continuity makes the world feel coherent.'),
  ('world_rule_visual_consistency', 'universe_moonlight_forest', 'visual', 'Illustrations must preserve each locked character’s species, silhouette, colors, clothing, proportions, and signature accessories from reference images.', 'Visual drift breaks character recognition across pages and books.'),
  ('world_rule_no_image_text', 'universe_moonlight_forest', 'visual', 'Generated illustrations should not contain readable words, letters, captions, logos, watermarks, or title typography.', 'Book layout owns text; model-generated text inside images is unreliable.');
