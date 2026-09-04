ALTER TABLE child_preferences ADD COLUMN enabled_inspiration_source_ids_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE child_preferences ADD COLUMN enabled_theme_ids_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE child_preferences ADD COLUMN inspiration_config_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE subscriptions ADD COLUMN delivery_day_of_week INTEGER NOT NULL DEFAULT 5;
ALTER TABLE subscriptions ADD COLUMN generation_lead_hours INTEGER NOT NULL DEFAULT 24;

CREATE TABLE IF NOT EXISTS inspiration_sources (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider_key TEXT,
  default_mode TEXT NOT NULL DEFAULT 'THEME',
  required INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS inspiration_sources_slug_unique ON inspiration_sources (slug);
CREATE INDEX IF NOT EXISTS inspiration_sources_kind_idx ON inspiration_sources (kind);

CREATE TABLE IF NOT EXISTS story_themes (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_guidance TEXT NOT NULL,
  age_guidance_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS story_themes_slug_unique ON story_themes (slug);

CREATE TABLE IF NOT EXISTS inspiration_items (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL REFERENCES inspiration_sources(id) ON DELETE CASCADE,
  external_key TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  display_title TEXT NOT NULL,
  source_ref TEXT,
  source_url TEXT,
  starts_at TEXT,
  ends_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS inspiration_items_source_external_unique ON inspiration_items (source_id, external_key);
CREATE INDEX IF NOT EXISTS inspiration_items_source_date_idx ON inspiration_items (source_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS inspiration_mappings (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT REFERENCES inspiration_sources(id) ON DELETE CASCADE,
  item_external_key TEXT,
  theme_id TEXT NOT NULL REFERENCES story_themes(id) ON DELETE CASCADE,
  strength INTEGER NOT NULL DEFAULT 1,
  child_facing_mode TEXT NOT NULL DEFAULT 'THEME',
  prompt_guidance TEXT NOT NULL,
  safety_notes TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS inspiration_mappings_source_item_idx ON inspiration_mappings (source_id, item_external_key);
CREATE INDEX IF NOT EXISTS inspiration_mappings_theme_idx ON inspiration_mappings (theme_id);

CREATE TABLE IF NOT EXISTS book_inspirations (
  id TEXT PRIMARY KEY NOT NULL,
  book_issue_id TEXT NOT NULL REFERENCES book_issues(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES inspiration_sources(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES inspiration_items(id) ON DELETE SET NULL,
  theme_id TEXT REFERENCES story_themes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  child_facing_mode TEXT NOT NULL,
  prompt_guidance TEXT NOT NULL,
  source_ref TEXT,
  source_url TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS book_inspirations_issue_idx ON book_inspirations (book_issue_id);
CREATE UNIQUE INDEX IF NOT EXISTS book_inspirations_issue_source_unique ON book_inspirations (book_issue_id, source_id);
