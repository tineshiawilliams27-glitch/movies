CREATE INDEX IF NOT EXISTS film_bibles_project_idx ON film_bibles("projectId");
CREATE INDEX IF NOT EXISTS film_characters_project_idx ON film_characters("projectId");
CREATE INDEX IF NOT EXISTS storyboard_shots_project_idx ON storyboard_shots("projectId");
CREATE INDEX IF NOT EXISTS timeline_items_project_idx ON timeline_items("projectId");
CREATE INDEX IF NOT EXISTS generation_jobs_generation_run_idx ON generation_jobs("generationRunId");
CREATE INDEX IF NOT EXISTS media_assets_source_idx ON media_assets("sourceId");
