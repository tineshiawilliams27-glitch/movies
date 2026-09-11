export function getOpenAIApiKey() {
  return (process.env.OPENAI_API_KEY || process.env.API_KEY || '').trim()
}

export function openAIHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
}
