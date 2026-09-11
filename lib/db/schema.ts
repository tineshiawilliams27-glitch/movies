import { jsonb, numeric, pgTable, text, timestamp, uuid, integer, index, boolean, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  concept: text('concept').notNull().default(''),
  format: text('format').notNull().default('Story'),
  durationSeconds: numeric('durationSeconds').notNull().default('0'),
  status: text('status').notNull().default('DRAFT'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ userUpdatedIdx: index('projects_user_updated_idx').on(table.userId, table.updatedAt) }))

export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  appearance: text('appearance').notNull().default(''),
  voice: text('voice').notNull().default(''),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectCharacterIdx: index('characters_project_idx').on(table.projectId) }))

export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sceneNumber: integer('sceneNumber').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  dialogue: text('dialogue').notNull().default(''),
  location: text('location').notNull().default(''),
  timeOfDay: text('timeOfDay').notNull().default(''),
  durationSeconds: numeric('durationSeconds').notNull().default('0'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectSceneIdx: index('scenes_project_number_idx').on(table.projectId, table.sceneNumber), projectSceneNumberUnique: uniqueIndex('scenes_project_scene_number_unique').on(table.projectId, table.sceneNumber) }))

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: uuid('sceneId').references(() => scenes.id, { onDelete: 'set null' }),
  kind: text('kind').notNull(),
  pathname: text('pathname').notNull(),
  contentType: text('contentType').notNull(),
  durationSeconds: numeric('durationSeconds'),
  metadata: jsonb('metadata').notNull().default({}),
  sourceId: uuid('sourceId'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectAssetIdx: index('media_assets_project_created_idx').on(table.projectId, table.createdAt), sourceVersionIdx: index('media_assets_source_version_idx').on(table.sourceId, table.version) }))

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: uuid('sceneId').references(() => scenes.id, { onDelete: 'set null' }),
  generationRunId: uuid('generationRunId').references(() => generationRuns.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  status: text('status').notNull().default('QUEUED'),
  progress: integer('progress').notNull().default(0),
  stage: text('stage').notNull().default('Queued'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  payload: jsonb('payload').notNull().default({}),
  idempotencyKey: text('idempotencyKey'),
  result: jsonb('result'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectStatusIdx: index('generation_jobs_project_status_idx').on(table.projectId, table.status, table.createdAt), projectIdempotencyUnique: uniqueIndex('generation_jobs_project_idempotency_unique').on(table.projectId, table.idempotencyKey).where(sql`"idempotencyKey" IS NOT NULL`), generationRunIdx: index('generation_jobs_generation_run_idx').on(table.generationRunId) }))

export const generationOutbox = pgTable('generation_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('jobId').notNull().references(() => generationJobs.id, { onDelete: 'cascade' }),
  eventType: text('eventType').notNull(),
  payload: jsonb('payload').notNull().default({}),
  status: text('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: timestamp('availableAt', { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp('lockedAt', { withTimezone: true }),
  processedAt: timestamp('processedAt', { withTimezone: true }),
  lastError: text('lastError'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ pendingIdx: index('generation_outbox_pending_idx').on(table.status, table.availableAt), jobUnique: uniqueIndex('generation_outbox_job_event_unique').on(table.jobId, table.eventType) }))

export const generationRuns = pgTable('generation_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  prompt: text('prompt').notNull().default(''),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectVersionUnique: uniqueIndex('generation_runs_project_version_unique').on(table.projectId, table.version), projectCreatedIdx: index('generation_runs_project_created_idx').on(table.projectId, table.createdAt) }))

export const filmBibles = pgTable('film_bibles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  generationRunId: uuid('generationRunId').references(() => generationRuns.id, { onDelete: 'set null' }),
  version: integer('version').notNull().default(1),
  logline: text('logline').notNull().default(''),
  premise: text('premise').notNull().default(''),
  midpoint: text('midpoint').notNull().default(''),
  climax: text('climax').notNull().default(''),
  themes: jsonb('themes').notNull().default([]),
  acts: jsonb('acts').notNull().default([]),
  screenplay: text('screenplay').notNull().default(''),
  styleBible: jsonb('styleBible').notNull().default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectIdx: index('film_bibles_project_idx').on(table.projectId) }))

export const filmCharacters = pgTable('film_characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  generationRunId: uuid('generationRunId').references(() => generationRuns.id, { onDelete: 'set null' }),
  version: integer('version').notNull().default(1),
  stableKey: text('stableKey').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  description: text('description').notNull().default(''),
  appearance: text('appearance').notNull().default(''),
  voiceIdentity: jsonb('voiceIdentity').notNull().default({}),
  referenceAssetId: uuid('referenceAssetId').references(() => mediaAssets.id, { onDelete: 'set null' }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectIdx: index('film_characters_project_idx').on(table.projectId), projectCharacterKeyVersionUnique: uniqueIndex('film_characters_project_key_version_unique').on(table.projectId, table.stableKey, table.version) }))

export const storyboardShots = pgTable('storyboard_shots', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  generationRunId: uuid('generationRunId').references(() => generationRuns.id, { onDelete: 'set null' }),
  version: integer('version').notNull().default(1),
  shotNumber: integer('shotNumber').notNull(),
  sceneLabel: text('sceneLabel').notNull().default(''),
  title: text('title').notNull().default(''),
  description: text('description').notNull().default(''),
  shotType: text('shotType').notNull().default(''),
  cameraMovement: text('cameraMovement').notNull().default(''),
  lighting: text('lighting').notNull().default(''),
  mood: text('mood').notNull().default(''),
  dialogue: text('dialogue').notNull().default(''),
  effects: text('effects').notNull().default(''),
  durationSeconds: numeric('durationSeconds').notNull().default('4'),
  continuityNotes: text('continuityNotes').notNull().default(''),
  framePrompt: text('framePrompt').notNull().default(''),
  frameAssetId: uuid('frameAssetId').references(() => mediaAssets.id, { onDelete: 'set null' }),
  clipAssetId: uuid('clipAssetId').references(() => mediaAssets.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('PLANNED'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectIdx: index('storyboard_shots_project_idx').on(table.projectId), projectShotVersionUnique: uniqueIndex('storyboard_shots_project_number_version_unique').on(table.projectId, table.shotNumber, table.version) }))

export const timelineItems = pgTable('timeline_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  generationRunId: uuid('generationRunId').references(() => generationRuns.id, { onDelete: 'set null' }),
  version: integer('version').notNull().default(1),
  trackType: text('trackType').notNull(),
  label: text('label').notNull().default(''),
  startSeconds: numeric('startSeconds').notNull().default('0'),
  durationSeconds: numeric('durationSeconds').notNull().default('0'),
  assetId: uuid('assetId').references(() => mediaAssets.id, { onDelete: 'set null' }),
  content: text('content').notNull().default(''),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectIdx: index('timeline_items_project_idx').on(table.projectId), projectTrackStartIdx: index('timeline_items_project_track_start_idx').on(table.projectId, table.trackType, table.startSeconds, table.id) }))
