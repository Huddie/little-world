CREATE TABLE IF NOT EXISTS `story_examples` (
  `id` text PRIMARY KEY NOT NULL,
  `universe_id` text NOT NULL,
  `title` text NOT NULL,
  `age_range` text NOT NULL,
  `genre` text NOT NULL,
  `summary` text NOT NULL,
  `story_beats_json` text DEFAULT '[]' NOT NULL,
  `style_notes` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`universe_id`) REFERENCES `universes`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `story_examples_universe_age_idx` ON `story_examples` (`universe_id`,`age_range`);

UPDATE `universes`
SET
  `name` = 'Little World',
  `description` = 'A growing, child-safe story world that remembers its recurring cast, past adventures, favorite themes, and newly discovered places.'
WHERE `id` = 'universe_moonlight_forest';

UPDATE `products`
SET
  `slug` = 'little-world-monthly',
  `name` = 'Little World Monthly'
WHERE `id` = 'product_moonlight_forest_monthly';

INSERT OR IGNORE INTO `story_examples` (`id`, `universe_id`, `title`, `age_range`, `genre`, `summary`, `story_beats_json`, `style_notes`) VALUES
  ('story_example_001', 'universe_moonlight_forest', 'The Blanket Cloud', '1-11 months', 'soothing bedtime', 'A soft cloud drifts low enough to tuck the meadow in for a nap.', '["notice a soft shape","repeat a comforting sound","end with rest and warmth"]', 'Very simple read-aloud language, gentle repetition, sensory warmth.'),
  ('story_example_002', 'universe_moonlight_forest', 'The Blue Button Moon', '12-23 months', 'gentle discovery', 'A shiny blue button becomes a tiny pretend moon for the friends to follow.', '["find one bright object","name simple colors","share the object kindly"]', 'Short sentences, concrete objects, playful sounds.'),
  ('story_example_003', 'universe_moonlight_forest', 'The Hill That Hiccuped', '2-3', 'funny wonder', 'A new hill appears and hiccups flowers whenever someone giggles.', '["discover a new place","try silly solutions","solve with calm breathing"]', 'Warm humor, low stakes, repeated phrases.'),
  ('story_example_004', 'universe_moonlight_forest', 'The Teacup Boat', '2-3', 'tiny journey', 'The cast sails across a puddle in a teacup to return a lost ladybug.', '["make a tiny plan","travel somewhere small","help a small friend"]', 'Cozy scale, simple problem, satisfying return home.'),
  ('story_example_005', 'universe_moonlight_forest', 'The Door Behind the Daisy', '4-5', 'magical mystery', 'A daisy opens like a door to reveal a room full of warm sunlight.', '["spot an impossible detail","wonder before entering","bring back one useful kindness"]', 'Picture-book mystery, clear emotional arc, no danger.'),
  ('story_example_006', 'universe_moonlight_forest', 'The Map That Drew Back', '4-5', 'adventure', 'A map adds a new path whenever the friends ask a kinder question.', '["start with confusion","ask better questions","the world expands"]', 'Adventure with emotional learning embedded in action.'),
  ('story_example_007', 'universe_moonlight_forest', 'The Library of Lost Giggles', '4-5', 'friendship', 'The friends collect missing giggles and learn each laugh belongs to someone.', '["find missing joy","listen to each friend","restore a shared celebration"]', 'Playful, relational, clear cause and effect.'),
  ('story_example_008', 'universe_moonlight_forest', 'The Pebble That Remembered', '6-8', 'continuity mystery', 'A pebble remembers the last adventure and points toward a new question.', '["recall past canon","investigate a clue","add a durable new fact"]', 'Early-reader friendly, light continuity, richer vocabulary.'),
  ('story_example_009', 'universe_moonlight_forest', 'The Whispering Weather Vane', '6-8', 'mystery', 'A weather vane whispers directions only when the cast disagrees politely.', '["conflicting plans","practice respectful disagreement","unlock the next place"]', 'Chapter-like progression, dialogue-driven problem solving.'),
  ('story_example_010', 'universe_moonlight_forest', 'The Museum of Tomorrow Things', '6-8', 'imaginative adventure', 'The cast visits a tiny museum where future objects need present-day choices.', '["enter a new landmark","choose between tempting options","make a small brave promise"]', 'Wonder-forward but grounded in character decisions.'),
  ('story_example_011', 'universe_moonlight_forest', 'The Clockwork Creek', '9-12', 'light fantasy mystery', 'A creek ticks like a clock and reveals how one forgotten promise changed the map.', '["layered clue","character memory matters","world rule becomes clearer"]', 'More complex continuity, still warm and safe.'),
  ('story_example_012', 'universe_moonlight_forest', 'The Orchard Under the Floorboards', '9-12', 'portal adventure', 'A hidden orchard grows below a familiar room and tests how the cast handles responsibility.', '["ordinary place turns magical","responsibility creates tension","new place joins canon"]', 'Longer scenes, subtle emotional stakes, no peril.'),
  ('story_example_013', 'universe_moonlight_forest', 'The Star That Wanted a Window', '3-5', 'bedtime wonder', 'A shy star asks for a window so it can watch the little world fall asleep.', '["meet a shy magical thing","build something together","quiet bedtime ending"]', 'Lullaby cadence, wonder without intensity.'),
  ('story_example_014', 'universe_moonlight_forest', 'The Birthday of a Bridge', '4-5', 'celebration', 'The cast throws a birthday party for a bridge and learns places can hold memories.', '["notice a place feeling overlooked","prepare tiny gifts","make memory part of canon"]', 'Celebratory, emotionally clear, good for recurring landmarks.'),
  ('story_example_015', 'universe_moonlight_forest', 'The Kite That Pulled the Path', '6-8', 'adventure', 'A kite tugs a familiar path into a new shape, revealing a corner of the world nobody expected.', '["familiar map changes","team follows clues","new location appears"]', 'Evolving-world logic, active but gentle pacing.'),
  ('story_example_016', 'universe_moonlight_forest', 'The Quiet Parade', '1-11 months', 'read-aloud rhythm', 'Tiny animals parade softly past the moon while each sound gets quieter.', '["one soft sound","another softer sound","sleepy ending"]', 'Minimal language, rhythm and sound, parent read-aloud.');
