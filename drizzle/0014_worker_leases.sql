ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "workerId" text;
--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "availableAt" timestamp with time zone DEFAULT now() NOT NULL;
