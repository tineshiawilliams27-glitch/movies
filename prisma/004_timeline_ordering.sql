CREATE INDEX IF NOT EXISTS timeline_items_project_track_start_idx ON timeline_items("projectId", "trackType", "startSeconds", id);
