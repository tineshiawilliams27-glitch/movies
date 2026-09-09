import { describe, expect, it } from 'vitest'
import { mockProvider } from './providers'

describe('mock generation provider', () => {
  it('returns a normalized story result', async () => {
    const result = await mockProvider.generate({ projectId: 'p1', prompt: 'A lighthouse', type: 'story', style: 'Atmospheric' })
    expect(result.provider).toBe('mock')
    expect(result.text).toContain('lighthouse')
  })
})
