ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS "idempotencyKey" text;

CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_project_idempotency_unique ON generation_jobs("projectId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
