import { jsonb, numeric, pgTable, text, timestamp, uuid, integer, index, boolean } from 'drizzle-orm/pg-core'

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
}, (table) => ({ projectSceneIdx: index('scenes_project_number_idx').on(table.projectId, table.sceneNumber) }))

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
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectAssetIdx: index('media_assets_project_created_idx').on(table.projectId, table.createdAt) }))

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: uuid('sceneId').references(() => scenes.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  status: text('status').notNull().default('QUEUED'),
  progress: integer('progress').notNull().default(0),
  stage: text('stage').notNull().default('Queued'),
  attempts: integer('attempts').notNull().default(0),
  error: text('error'),
  payload: jsonb('payload').notNull().default({}),
  result: jsonb('result'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ projectStatusIdx: index('generation_jobs_project_status_idx').on(table.projectId, table.status, table.createdAt) }))
