CREATE TABLE IF NOT EXISTS public.scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "projectId" uuid NOT NULL,
  "sceneNumber" integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  dialogue text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  "timeOfDay" text NOT NULL DEFAULT '',
  "durationSeconds" numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scenes_project_number_idx ON public.scenes ("projectId", "sceneNumber");
