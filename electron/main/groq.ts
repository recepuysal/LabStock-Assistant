/** Groq OpenAI uyumlu API — ücretsiz katman: https://console.groq.com/keys */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/** Güncel modeller Groq konsolunda listelenir; 400 alırsanız model adını değiştirin */
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export type GroqMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function groqChatCompletion(apiKey: string, messages: GroqMessage[]): Promise<string> {
  const key = apiKey?.trim()
  if (!key) throw new Error('Groq API anahtarı boş')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.45,
      max_tokens: 2048,
    }),
  })

  const body = await res.text()
  if (!res.ok) {
    const brief = body.length > 500 ? `${body.slice(0, 500)}…` : body
    if (res.status === 429) {
      throw new Error(
        `Groq hız/kota limiti (429). Bir süre sonra deneyin veya https://console.groq.com/settings/limits adresine bakın.\n${brief}`,
      )
    }
    throw new Error(`Groq (${res.status}): ${brief}`)
  }

  const data = JSON.parse(body) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (data.error?.message) throw new Error(data.error.message)

  const text = data.choices?.[0]?.message?.content
  if (!text?.trim()) throw new Error('Groq boş yanıt döndü')

  return text.trim()
}
