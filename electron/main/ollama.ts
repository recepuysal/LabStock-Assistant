/** Ollama yerel sunucu — API anahtarı gerekmez. https://ollama.com */

export type OllamaMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function ollamaChatCompletion(
  baseUrl: string,
  model: string,
  messages: OllamaMessage[],
): Promise<string> {
  const root = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${root}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model.trim() || 'llama3.2',
      messages,
      stream: false,
      options: { temperature: 0.45 },
    }),
  })

  const body = await res.text()
  if (!res.ok) {
    const brief = body.length > 400 ? `${body.slice(0, 400)}…` : body
    if (res.status === 404 || /not found/i.test(body)) {
      throw new Error(
        `Ollama modeli bulunamadı. Terminalde: ollama pull ${model}\n${brief}`,
      )
    }
    throw new Error(`Ollama (${res.status}): ${brief}`)
  }

  const data = JSON.parse(body) as { message?: { content?: string }; error?: string }
  if (data.error) throw new Error(data.error)
  const text = data.message?.content
  if (!text?.trim()) throw new Error('Ollama boş yanıt döndü')
  return text.trim()
}
