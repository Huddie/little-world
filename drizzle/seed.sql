INSERT OR IGNORE INTO universes (id, slug, name, description, active)
VALUES (
  'universe_moonlight_forest',
  'moonlight-forest',
  'Little World',
  'A growing story world that remembers favorite characters, past adventures, and newly discovered places.',
  1
);

INSERT OR IGNORE INTO characters (
  id,
  universe_id,
  slug,
  name,
  description,
  personality,
  visual_description_json,
  profile_images_json,
  hidden_style_references_json,
  active
) VALUES
(
  'character_milo',
  'universe_moonlight_forest',
  'milo',
  'Milo',
  'An adventurous bear who loves maps, snacks, and being the first to peek around a bend.',
  'Brave, curious, loyal, occasionally rushes ahead, learns to pause and listen.',
  '{"species":"bear","colors":["warm brown","honey tan"],"clothing":["small green explorer vest"],"proportions":"round and huggable preschool picture-book bear","facialTraits":"wide kind eyes and a button nose","speechTendencies":["enthusiastic","short cheerful exclamations"],"strengths":["courage","loyalty"],"weaknesses":["impatience"],"recurringBehaviors":["draws simple maps","packs snacks for friends"],"artStyleRules":["polished modern children picture book","soft edges","expressive but simple faces","no text in image"]}',
  '["r2://book-assets/character-profile/milo-1.webp","r2://book-assets/character-profile/milo-2.webp","r2://book-assets/character-profile/milo-3.webp"]',
  '["r2://book-assets/character-style/milo-front.webp","r2://book-assets/character-style/milo-side.webp","r2://book-assets/character-style/milo-expression.webp","r2://book-assets/character-style/milo-silhouette.webp"]',
  1
),
(
  'character_pip',
  'universe_moonlight_forest',
  'pip',
  'Pip',
  'A nervous but clever rabbit who notices tiny clues and usually has the best plan.',
  'Careful, observant, anxious at first, quietly funny, grows braver through practical thinking.',
  '{"species":"rabbit","colors":["cream","soft gray"],"clothing":["blue kerchief"],"proportions":"small nimble rabbit with long ears","facialTraits":"bright alert eyes and gentle worried eyebrows","speechTendencies":["asks thoughtful questions","names small details"],"strengths":["problem solving","memory"],"weaknesses":["worry"],"recurringBehaviors":["counts hops when nervous","spots hidden patterns"],"artStyleRules":["polished modern children picture book","soft edges","expressive but simple faces","no text in image"]}',
  '["r2://book-assets/character-profile/pip-1.webp","r2://book-assets/character-profile/pip-2.webp","r2://book-assets/character-profile/pip-3.webp"]',
  '["r2://book-assets/character-style/pip-front.webp","r2://book-assets/character-style/pip-side.webp","r2://book-assets/character-style/pip-expression.webp","r2://book-assets/character-style/pip-silhouette.webp"]',
  1
),
(
  'character_juniper',
  'universe_moonlight_forest',
  'juniper',
  'Juniper',
  'A mischievous fox who turns ordinary moments into playful surprises.',
  'Playful, quick, theatrical, affectionate, sometimes learns when a joke has gone far enough.',
  '{"species":"fox","colors":["rust orange","cream","dark ear tips"],"clothing":["tiny purple satchel"],"proportions":"sleek but soft preschool-friendly fox","facialTraits":"sparkly eyes and a sly friendly smile","speechTendencies":["dramatic reveals","rhyming when excited"],"strengths":["creativity","confidence"],"weaknesses":["impulsiveness"],"recurringBehaviors":["hides little surprises","twirls her tail when thinking"],"artStyleRules":["polished modern children picture book","soft edges","expressive but simple faces","no text in image"]}',
  '["r2://book-assets/character-profile/juniper-1.webp","r2://book-assets/character-profile/juniper-2.webp","r2://book-assets/character-profile/juniper-3.webp"]',
  '["r2://book-assets/character-style/juniper-front.webp","r2://book-assets/character-style/juniper-side.webp","r2://book-assets/character-style/juniper-expression.webp","r2://book-assets/character-style/juniper-silhouette.webp"]',
  1
),
(
  'character_tuck',
  'universe_moonlight_forest',
  'tuck',
  'Tuck',
  'A thoughtful turtle who brings patience, memory, and steady kindness to the group.',
  'Calm, reflective, warm, slow to decide, often helps friends name their feelings.',
  '{"species":"turtle","colors":["moss green","sage","warm tan shell"],"clothing":["round spectacles"],"proportions":"small sturdy turtle with a domed shell","facialTraits":"soft smile and calm eyes","speechTendencies":["gentle observations","simple wise comparisons"],"strengths":["patience","empathy"],"weaknesses":["hesitation"],"recurringBehaviors":["keeps smooth pebbles as reminders","suggests taking one careful step"],"artStyleRules":["polished modern children picture book","soft edges","expressive but simple faces","no text in image"]}',
  '["r2://book-assets/character-profile/tuck-1.webp","r2://book-assets/character-profile/tuck-2.webp","r2://book-assets/character-profile/tuck-3.webp"]',
  '["r2://book-assets/character-style/tuck-front.webp","r2://book-assets/character-style/tuck-side.webp","r2://book-assets/character-style/tuck-expression.webp","r2://book-assets/character-style/tuck-silhouette.webp"]',
  1
);

INSERT OR IGNORE INTO locations (id, universe_id, slug, name, description, canonical_properties_json)
VALUES
(
  'location_pebble_bridge',
  'universe_moonlight_forest',
  'pebble-bridge',
  'Pebble Bridge',
  'A low stone bridge over a moon-silver stream where friends often pause to listen for echoes.',
  '{"mood":"gentle and curious","recurringDetails":["smooth stones","soft stream sounds","tiny moss lanterns"],"storyUses":["crossing point","meeting place","small mysteries"]}'
),
(
  'location_moonberry_hill',
  'universe_moonlight_forest',
  'moonberry-hill',
  'Moonberry Hill',
  'A rolling hill where pale berries glow softly after sunset.',
  '{"mood":"wonder-filled","recurringDetails":["glowing berries","tall grass","clear sky"],"storyUses":["celebration","discovery","learning patience"]}'
),
(
  'location_whispering_creek',
  'universe_moonlight_forest',
  'whispering-creek',
  'Whispering Creek',
  'A narrow creek that seems to carry friendly whispers through reeds and stones.',
  '{"mood":"quietly magical","recurringDetails":["reeds","smooth water","leaf boats"],"storyUses":["listening","clue finding","calming worries"]}'
),
(
  'location_firefly_hollow',
  'universe_moonlight_forest',
  'firefly-hollow',
  'Firefly Hollow',
  'A cozy hollow where fireflies gather like floating stars.',
  '{"mood":"cozy and bright","recurringDetails":["fireflies","fern nests","soft shadows"],"storyUses":["ending scenes","bravery in darkness","friend gatherings"]}'
),
(
  'location_old_oak_clearing',
  'universe_moonlight_forest',
  'old-oak-clearing',
  'Old Oak Clearing',
  'A wide clearing around an ancient oak with roots like benches and branches like a roof.',
  '{"mood":"safe and wise","recurringDetails":["ancient roots","leaf canopy","acorn caps"],"storyUses":["planning","reflection","resolving misunderstandings"]}'
);

INSERT OR IGNORE INTO world_rules (id, universe_id, category, rule, rationale)
VALUES
  (
    'world_rule_story_growth',
    'universe_moonlight_forest',
    'continuity',
    'Every episode should add one small durable discovery, object, promise, relationship beat, or location detail that can matter later.',
    'Little World should feel like a growing world, not disconnected one-off stories.'
  ),
  (
    'world_rule_locked_cast',
    'universe_moonlight_forest',
    'characters',
    'Use only the locked cast as named story characters unless the episode intentionally introduces a minor helper or place-based creature with no future ownership.',
    'Parents chose a stable cast; stories should preserve that trust.'
  ),
  (
    'world_rule_age_fit',
    'universe_moonlight_forest',
    'tone',
    'Conflict should stay gentle, concrete, emotionally clear, and solvable by curiosity, kindness, patience, or teamwork.',
    'The product targets young children and parent read-alouds.'
  ),
  (
    'world_rule_place_grounding',
    'universe_moonlight_forest',
    'locations',
    'Prefer known locations from the world map, and when adding a new place, connect it clearly to an existing location or recurring motif.',
    'Grounded place continuity makes the world feel coherent.'
  ),
  (
    'world_rule_visual_consistency',
    'universe_moonlight_forest',
    'visual',
    'Illustrations must preserve each locked character’s species, silhouette, colors, clothing, proportions, and signature accessories from reference images.',
    'Visual drift breaks character recognition across pages and books.'
  ),
  (
    'world_rule_no_image_text',
    'universe_moonlight_forest',
    'visual',
    'Generated illustrations should not contain readable words, letters, captions, logos, watermarks, or title typography.',
    'Book layout owns text; model-generated text inside images is unreliable.'
  );

INSERT OR IGNORE INTO products (id, universe_id, slug, name, frequency, active)
VALUES (
  'product_moonlight_forest_monthly',
  'universe_moonlight_forest',
  'little-world-monthly',
  'Little World Monthly',
  'MONTHLY',
  1
);

INSERT OR IGNORE INTO product_delivery_options (id, product_id, method, availability)
VALUES
  ('delivery_option_moonlight_email', 'product_moonlight_forest_monthly', 'EMAIL', 'ENABLED'),
  ('delivery_option_moonlight_mail', 'product_moonlight_forest_monthly', 'MAIL', 'COMING_SOON');

INSERT OR IGNORE INTO inspiration_sources (
  id,
  slug,
  label,
  description,
  kind,
  provider_key,
  default_mode,
  required,
  enabled,
  config_json
) VALUES (
  'inspiration_source_sefaria_weekly_torah',
  'weekly-torah-portion',
  'Weekly Torah portion',
  'A gentle weekly story inspiration based on the current Torah reading.',
  'SEFARIA_CALENDAR',
  'sefaria:parashat_hashavua',
  'EXPLICIT',
  1,
  1,
  '{"calendarProfile":"DIASPORA","timezone":"America/New_York"}'
);

INSERT OR IGNORE INTO story_themes (id, slug, label, description, prompt_guidance, age_guidance_json)
VALUES
  ('story_theme_kindness', 'kindness', 'Kindness', 'Friends notice what someone needs and help gently.', 'Center the story on small, concrete acts of kindness and warm repair.', '{"1-11 months":"Use soft caring actions and repetition.","2-3":"Keep the need simple and visible."}'),
  ('story_theme_courage', 'courage', 'Courage', 'A character tries something hard with support.', 'Show courage as taking one safe next step with friends nearby.', '{"1-11 months":"Make the challenge cozy and low-stakes.","2-3":"Avoid danger; use nervousness and reassurance."}'),
  ('story_theme_gratitude', 'gratitude', 'Gratitude', 'Characters pause to notice gifts, helpers, and good surprises.', 'Use sensory details and a thankful closing beat.', '{}'),
  ('story_theme_teamwork', 'teamwork', 'Teamwork', 'Friends solve a problem by combining their strengths.', 'Make each locked cast member useful in a way that fits their profile.', '{}'),
  ('story_theme_welcome', 'welcome', 'Welcoming', 'A new moment feels easier because friends make room.', 'Focus on hospitality, sharing space, and making someone comfortable.', '{}'),
  ('story_theme_rest', 'rest', 'Rest', 'The world slows down so everyone can feel safe and restored.', 'Use calm pacing, cozy imagery, and a satisfying wind-down.', '{}');

INSERT OR IGNORE INTO inspiration_mappings (
  id,
  source_id,
  item_external_key,
  theme_id,
  strength,
  child_facing_mode,
  prompt_guidance,
  safety_notes
) VALUES (
  'inspiration_mapping_weekly_torah_default_kindness',
  'inspiration_source_sefaria_weekly_torah',
  NULL,
  'story_theme_kindness',
  1,
  'EXPLICIT',
  'If a weekly Torah portion is selected, mention the parsha by name naturally and translate its ideas into a bright Little World story about kindness, courage, gratitude, teamwork, welcoming, or rest. Do not retell difficult scenes literally.',
  'Avoid long quotations, frightening punishments, violence, or adult theological claims. Use age-safe values and parent-friendly wording.'
);
