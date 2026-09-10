export type ProviderContext = { jobId: string; payload: Record<string, unknown> }
export type ProviderResult = { result: Record<string, unknown> }
export type GenerationProvider = (context: ProviderContext) => Promise<ProviderResult>

export const gatewayTextProvider: GenerationProvider = async ({ payload }) => ({
  result: { provider: 'vercel-ai-gateway', model: 'openai/gpt-5-mini', prompt: payload.prompt ?? '' },
})

export const unavailableVideoProvider: GenerationProvider = async () => {
  throw new Error('Video provider is not configured. Storyboard clips are persisted as provider-ready jobs.')
}

export const demoProvider: GenerationProvider = async ({ jobId }) => ({ result: { mode: 'demo', jobId, outputs: [] } })

export function unavailableProvider(name: string): GenerationProvider {
  return async () => { throw new Error(`${name} provider is not configured.`) }
}

export function providerFor(type: string): GenerationProvider {
  if (type === 'VIDEO_GENERATION') return unavailableVideoProvider
  if (type === 'PIPELINE_GENERATION' || type === 'TEXT_GENERATION') return gatewayTextProvider
  return unavailableProvider(type)
}
