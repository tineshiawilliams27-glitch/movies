import { z } from 'zod'

export const generationJobTypes = [
  'SCRIPT_GENERATION',
  'CHARACTER_GENERATION',
  'SCENE_GENERATION',
  'IMAGE_GENERATION',
  'VOICE_GENERATION',
  'VIDEO_GENERATION',
  'TIMELINE_BUILD',
  'VIDEO_EXPORT',
] as const

export const generationJobTypeSchema = z.enum(generationJobTypes)
export type GenerationJobType = z.infer<typeof generationJobTypeSchema>

export const generationJobPayloadSchema = z.object({
  type: generationJobTypeSchema.optional(),
  userId: z.string().min(1),
  projectId: z.string().uuid(),
  dependsOnJobIds: z.array(z.string().uuid()).default([]),
  idempotencyKey: z.string().min(1).optional(),
}).passthrough()

export type GenerationJobPayload = z.infer<typeof generationJobPayloadSchema>

export const stageProgress: Record<GenerationJobType, { start: number; end: number; label: string }> = {
  SCRIPT_GENERATION: { start: 5, end: 20, label: 'Building editable story treatment' },
  CHARACTER_GENERATION: { start: 10, end: 30, label: 'Generating character identities' },
  SCENE_GENERATION: { start: 20, end: 40, label: 'Generating scenes' },
  IMAGE_GENERATION: { start: 25, end: 60, label: 'Generating visuals' },
  VOICE_GENERATION: { start: 30, end: 60, label: 'Generating voices' },
  VIDEO_GENERATION: { start: 40, end: 80, label: 'Generating clips' },
  TIMELINE_BUILD: { start: 70, end: 90, label: 'Assembling timeline' },
  VIDEO_EXPORT: { start: 85, end: 99, label: 'Building final export' },
}

export function isGenerationJobType(value: string): value is GenerationJobType {
  return generationJobTypeSchema.safeParse(value).success
}

export function normalizeGenerationJobType(value: string): GenerationJobType {
  if (isGenerationJobType(value)) return value
  throw new Error(`Unsupported generation job type: ${value}`)
}
