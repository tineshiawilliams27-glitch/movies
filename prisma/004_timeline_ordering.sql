CREATE TABLE IF NOT EXISTS timeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "trackType" text NOT NULL,
  label text NOT NULL DEFAULT '',
  "startSeconds" numeric NOT NULL DEFAULT 0,
  "durationSeconds" numeric NOT NULL DEFAULT 0,
  "assetId" uuid,
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS timeline_items_project_track_start_idx ON timeline_items("projectId", "trackType", "startSeconds", id);
