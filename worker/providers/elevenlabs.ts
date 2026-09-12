export function getElevenLabsApiKey() {
  return (process.env.ELEVENLABS_API_KEY || '').trim()
}

export function elevenLabsHeaders(apiKey: string) {
  return { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }
}
