CREATE TABLE IF NOT EXISTS generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  prompt text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS film_bibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  logline text NOT NULL DEFAULT '', premise text NOT NULL DEFAULT '', midpoint text NOT NULL DEFAULT '', climax text NOT NULL DEFAULT '',
  themes jsonb NOT NULL DEFAULT '[]'::jsonb, acts jsonb NOT NULL DEFAULT '[]'::jsonb, screenplay text NOT NULL DEFAULT '', "styleBible" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS film_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1, "stableKey" text NOT NULL, name text NOT NULL,
  role text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', appearance text NOT NULL DEFAULT '', "voiceIdentity" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "referenceAssetId" uuid, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storyboard_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text NOT NULL,
  "projectId" uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1, "shotNumber" integer NOT NULL, "sceneLabel" text NOT NULL DEFAULT '', title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  "shotType" text NOT NULL DEFAULT '', "cameraMovement" text NOT NULL DEFAULT '', lighting text NOT NULL DEFAULT '', mood text NOT NULL DEFAULT '', dialogue text NOT NULL DEFAULT '', effects text NOT NULL DEFAULT '',
  "durationSeconds" numeric NOT NULL DEFAULT 4, "continuityNotes" text NOT NULL DEFAULT '', "framePrompt" text NOT NULL DEFAULT '', "frameAssetId" uuid, "clipAssetId" uuid,
  status text NOT NULL DEFAULT 'PLANNED', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL;
ALTER TABLE film_bibles ADD COLUMN IF NOT EXISTS "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL;
ALTER TABLE film_bibles ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE film_characters ADD COLUMN IF NOT EXISTS "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL;
ALTER TABLE film_characters ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE storyboard_shots ADD COLUMN IF NOT EXISTS "generationRunId" uuid REFERENCES generation_runs(id) ON DELETE SET NULL;
ALTER TABLE storyboard_shots ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS generation_runs_project_version_unique ON generation_runs("projectId", version);
CREATE INDEX IF NOT EXISTS generation_runs_project_created_idx ON generation_runs("projectId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS film_bibles_project_version_unique ON film_bibles("projectId", version);
CREATE UNIQUE INDEX IF NOT EXISTS film_characters_project_key_version_unique ON film_characters("projectId", "stableKey", version);
CREATE UNIQUE INDEX IF NOT EXISTS storyboard_shots_project_number_version_unique ON storyboard_shots("projectId", "shotNumber", version);
