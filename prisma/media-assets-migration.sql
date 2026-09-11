CREATE TABLE IF NOT EXISTS public.media_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text NOT NULL, "projectId" uuid NOT NULL, "sceneId" uuid, kind text NOT NULL, pathname text NOT NULL, "contentType" text NOT NULL, "durationSeconds" numeric, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, "createdAt" timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS "sourceId" uuid;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS media_assets_project_created_idx ON public.media_assets ("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS media_assets_source_version_idx ON public.media_assets ("sourceId", version);
