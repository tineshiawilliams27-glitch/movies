CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"appearance" text DEFAULT '' NOT NULL,
	"voice" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_bibles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"generationRunId" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"logline" text DEFAULT '' NOT NULL,
	"premise" text DEFAULT '' NOT NULL,
	"midpoint" text DEFAULT '' NOT NULL,
	"climax" text DEFAULT '' NOT NULL,
	"themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"acts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screenplay" text DEFAULT '' NOT NULL,
	"styleBible" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"generationRunId" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"stableKey" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"appearance" text DEFAULT '' NOT NULL,
	"voiceIdentity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"referenceAssetId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneId" uuid,
	"generationRunId" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"stage" text DEFAULT 'Queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"workerId" text,
	"leaseExpiresAt" timestamp with time zone,
	"availableAt" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotencyKey" text,
	"result" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"availableAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lockedAt" timestamp with time zone,
	"processedAt" timestamp with time zone,
	"lastError" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneId" uuid,
	"kind" text NOT NULL,
	"pathname" text NOT NULL,
	"contentType" text NOT NULL,
	"durationSeconds" numeric,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sourceId" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"concept" text DEFAULT '' NOT NULL,
	"format" text DEFAULT 'Story' NOT NULL,
	"durationSeconds" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneNumber" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"dialogue" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"timeOfDay" text DEFAULT '' NOT NULL,
	"durationSeconds" numeric DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "storyboard_shots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"generationRunId" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"shotNumber" integer NOT NULL,
	"sceneLabel" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"shotType" text DEFAULT '' NOT NULL,
	"cameraMovement" text DEFAULT '' NOT NULL,
	"lighting" text DEFAULT '' NOT NULL,
	"mood" text DEFAULT '' NOT NULL,
	"dialogue" text DEFAULT '' NOT NULL,
	"effects" text DEFAULT '' NOT NULL,
	"durationSeconds" numeric DEFAULT '4' NOT NULL,
	"continuityNotes" text DEFAULT '' NOT NULL,
	"framePrompt" text DEFAULT '' NOT NULL,
	"frameAssetId" uuid,
	"clipAssetId" uuid,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"projectId" uuid NOT NULL,
	"generationRunId" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"trackType" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"startSeconds" numeric DEFAULT '0' NOT NULL,
	"durationSeconds" numeric DEFAULT '0' NOT NULL,
	"assetId" uuid,
	"content" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_bibles" ADD CONSTRAINT "film_bibles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_bibles" ADD CONSTRAINT "film_bibles_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_bibles" ADD CONSTRAINT "film_bibles_generationRunId_generation_runs_id_fk" FOREIGN KEY ("generationRunId") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_characters" ADD CONSTRAINT "film_characters_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_characters" ADD CONSTRAINT "film_characters_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_characters" ADD CONSTRAINT "film_characters_generationRunId_generation_runs_id_fk" FOREIGN KEY ("generationRunId") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_characters" ADD CONSTRAINT "film_characters_referenceAssetId_media_assets_id_fk" FOREIGN KEY ("referenceAssetId") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_sceneId_scenes_id_fk" FOREIGN KEY ("sceneId") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_generationRunId_generation_runs_id_fk" FOREIGN KEY ("generationRunId") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_outbox" ADD CONSTRAINT "generation_outbox_jobId_generation_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_sceneId_scenes_id_fk" FOREIGN KEY ("sceneId") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_generationRunId_generation_runs_id_fk" FOREIGN KEY ("generationRunId") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_frameAssetId_media_assets_id_fk" FOREIGN KEY ("frameAssetId") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_shots" ADD CONSTRAINT "storyboard_shots_clipAssetId_media_assets_id_fk" FOREIGN KEY ("clipAssetId") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_generationRunId_generation_runs_id_fk" FOREIGN KEY ("generationRunId") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_items" ADD CONSTRAINT "timeline_items_assetId_media_assets_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_project_idx" ON "characters" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "film_bibles_project_idx" ON "film_bibles" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "film_characters_project_idx" ON "film_characters" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "film_characters_project_key_version_unique" ON "film_characters" USING btree ("projectId","stableKey","version");--> statement-breakpoint
CREATE INDEX "generation_jobs_project_status_idx" ON "generation_jobs" USING btree ("projectId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_project_idempotency_unique" ON "generation_jobs" USING btree ("projectId","idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "generation_jobs_generation_run_idx" ON "generation_jobs" USING btree ("generationRunId");--> statement-breakpoint
CREATE INDEX "generation_outbox_pending_idx" ON "generation_outbox" USING btree ("status","availableAt");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_outbox_job_event_unique" ON "generation_outbox" USING btree ("jobId","eventType");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_runs_project_version_unique" ON "generation_runs" USING btree ("projectId","version");--> statement-breakpoint
CREATE INDEX "generation_runs_project_created_idx" ON "generation_runs" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE INDEX "media_assets_project_created_idx" ON "media_assets" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE INDEX "media_assets_source_version_idx" ON "media_assets" USING btree ("sourceId","version");--> statement-breakpoint
CREATE INDEX "projects_user_updated_idx" ON "projects" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "scenes_project_number_idx" ON "scenes" USING btree ("projectId","sceneNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "scenes_project_scene_number_unique" ON "scenes" USING btree ("projectId","sceneNumber");--> statement-breakpoint
CREATE INDEX "storyboard_shots_project_idx" ON "storyboard_shots" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "storyboard_shots_project_number_version_unique" ON "storyboard_shots" USING btree ("projectId","shotNumber","version");--> statement-breakpoint
CREATE INDEX "timeline_items_project_idx" ON "timeline_items" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "timeline_items_project_track_start_idx" ON "timeline_items" USING btree ("projectId","trackType","startSeconds","id");