export type ProviderContext = { jobId: string; payload: Record<string, unknown> }
export type ProviderResult = { result: Record<string, unknown> }
export type GenerationProvider = (context: ProviderContext) => Promise<ProviderResult>

export const demoProvider: GenerationProvider = async ({ jobId }) => ({ result: { mode: 'demo', jobId, outputs: [] } })

export function unavailableProvider(name: string): GenerationProvider {
  return async () => { throw new Error(`${name} provider is not configured.`) }
}
