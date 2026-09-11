import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { put } from '@vercel/blob'
import { getToken } from '@vercel/connect'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters, mediaAssets, projects } from '@/lib/db/schema'

export async function POST(request: Request, context: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  const { id, characterId } = await context.params
  const [record] = await db.select({ character: characters, project: projects }).from(characters).innerJoin(projects, eq(projects.id, characters.projectId)).where(and(eq(characters.id, characterId), eq(characters.projectId, id), eq(characters.userId, session.user.id), eq(projects.userId, session.user.id))).limit(1)
  if (!record) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as { prompt?: string }
  const prompt = body.prompt?.trim() || `Photorealistic cinematic character portrait for a film. Name: ${record.character.name}. Description: ${record.character.description}. Appearance: ${record.character.appearance}. Voice and personality: ${record.character.voice}. Natural skin texture, expressive eyes, realistic wardrobe, studio portrait lighting, 85mm lens, shallow depth of field, no text, no watermark.`

  try {
    const token = await getToken('api.replicate.com/film-studio-video-generation', { subject: { type: 'app' }, scopes: ['*'] })
    const model = process.env.REPLICATE_IMAGE_MODEL || 'black-forest-labs/flux-dev'
    const [owner, version] = model.split('/')
    if (!owner || !version) throw new Error('REPLICATE_IMAGE_MODEL must use owner/model format.')
    const created = await fetch(`https://api.replicate.com/v1/models/${owner}/${version}/predictions`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: { prompt, aspect_ratio: '4:3', output_format: 'png', safety_tolerance: 2 } }) })
    if (!created.ok) throw new Error(`Replicate image request failed with ${created.status}`)
    let prediction = await created.json() as { id: string; status: string; output?: string | string[]; error?: string }
    for (let attempt = 0; attempt < 60 && ['starting', 'processing'].includes(prediction.status); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const response = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error(`Replicate image polling failed with ${response.status}`)
      prediction = await response.json()
    }
    if (prediction.status !== 'succeeded' || !prediction.output) throw new Error(prediction.error || `Replicate ended with ${prediction.status}`)
    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Generated image could not be downloaded')
    const blob = await put(`projects/${id}/characters/${characterId}/${crypto.randomUUID()}.png`, await imageResponse.blob(), { access: 'private', contentType: 'image/png', addRandomSuffix: false })
    const [media] = await db.insert(mediaAssets).values({ userId: session.user.id, projectId: id, kind: 'CHARACTER_REFERENCE', pathname: blob.pathname, contentType: 'image/png', metadata: { characterId, prompt, source: `replicate/${model}` } }).returning()
    return NextResponse.json({ imageUrl: `/api/media/${media.id}`, media: { ...media, deliveryUrl: `/api/media/${media.id}` } })
  } catch (error) {
    console.error('[v0] character image generation failed', error)
    return NextResponse.json({ error: 'Unable to generate the character image right now. Please try again.' }, { status: 502 })
  }
}
