import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { fal } from '@fal-ai/client'
import { put } from '@vercel/blob'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { characters, mediaAssets, projects } from '@/lib/db/schema'

fal.config({ credentials: process.env.FAL_KEY })

export async function POST(request: Request, context: { params: Promise<{ id: string; characterId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  const { id, characterId } = await context.params
  const [record] = await db.select({ character: characters, project: projects }).from(characters).innerJoin(projects, eq(projects.id, characters.projectId)).where(and(eq(characters.id, characterId), eq(characters.projectId, id), eq(characters.userId, session.user.id), eq(projects.userId, session.user.id))).limit(1)
  if (!record) return NextResponse.json({ error: 'Character not found.' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as { prompt?: string }
  const prompt = body.prompt?.trim() || `Photorealistic cinematic character portrait for a film. Name: ${record.character.name}. Description: ${record.character.description}. Appearance: ${record.character.appearance}. Voice and personality: ${record.character.voice}. Natural skin texture, expressive eyes, realistic wardrobe, studio portrait lighting, 85mm lens, shallow depth of field, no text, no watermark.`

  try {
    const result = await fal.subscribe('fal-ai/flux/dev', { input: { prompt, image_size: 'portrait_4_3', num_images: 1, enable_safety_checker: true } })
    const imageUrl = result.data?.images?.[0]?.url
    if (!imageUrl) throw new Error('Image generation returned no image')
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('Generated image could not be downloaded')
    const blob = await put(`projects/${id}/characters/${characterId}/${crypto.randomUUID()}.png`, await imageResponse.blob(), { access: 'public', contentType: 'image/png', addRandomSuffix: false })
    const [media] = await db.insert(mediaAssets).values({ userId: session.user.id, projectId: id, kind: 'CHARACTER_REFERENCE', pathname: blob.url, contentType: 'image/png', metadata: { characterId, prompt, source: 'fal-ai/flux/dev' } }).returning()
    return NextResponse.json({ imageUrl: blob.url, media })
  } catch (error) {
    console.error('[v0] character image generation failed', error)
    return NextResponse.json({ error: 'Unable to generate the character image right now. Please try again.' }, { status: 502 })
  }
}
