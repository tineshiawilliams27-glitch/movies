ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "sourceId" uuid;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS media_assets_source_version_idx ON media_assets("sourceId", version);
CREATE INDEX IF NOT EXISTS generation_jobs_generation_run_idx ON generation_jobs("generationRunId");

ALTER TABLE film_bibles DROP CONSTRAINT IF EXISTS film_bibles_projectId_key;
CREATE UNIQUE INDEX IF NOT EXISTS film_bibles_project_version_unique ON film_bibles("projectId", version);

ALTER TABLE film_characters DROP CONSTRAINT IF EXISTS film_characters_project_stable_key;
CREATE UNIQUE INDEX IF NOT EXISTS film_characters_project_key_version_unique ON film_characters("projectId", "stableKey", version);

ALTER TABLE storyboard_shots DROP CONSTRAINT IF EXISTS storyboard_shots_project_shot_key;
CREATE UNIQUE INDEX IF NOT EXISTS storyboard_shots_project_number_version_unique ON storyboard_shots("projectId", "shotNumber", version);
