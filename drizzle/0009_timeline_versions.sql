ALTER TABLE timeline_items ADD COLUMN IF NOT EXISTS "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL;
ALTER TABLE timeline_items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS timeline_items_project_version_idx ON timeline_items("projectId", version);
