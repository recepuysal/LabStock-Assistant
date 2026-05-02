/** Google Gemini REST (ücretsiz kota: https://aistudio.google.com/app/apikey) */

/**
 * Bazı API anahtarları / bölgeler eski kısa adları (ör. gemini-1.5-flash) artık sunmuyor.
 * 404 alınırsa sırayla diğerlerini dene; güncel liste: models?key=... veya AI Studio.
 */
const MODEL_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
] as const

export type GeminiAskPayload = {
  apiKey: string
  systemInstruction: string
  userMessage: string
}

export type GeminiChatPayload = {
  apiKey: string
  systemInstruction: string
  /** Son mesaj kullanıcı olmalı */
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

function buildUrl(model: string, apiKey: string): string {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  return `${base}?key=${encodeURIComponent(apiKey)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Kullanıcıya gösterilecek kısa Türkçe açıklama + teknik özet */
function formatGeminiHttpError(status: number, body: string): string {
  const brief = body.length > 400 ? `${body.slice(0, 400)}…` : body

  if (status === 429) {
    return [
      'Gemini kota veya hız limiti aşıldı (429). Ücretsiz planda günlük/dakika sınırı dolmuş olabilir;',
      'bir süre sonra tekrar deneyin veya https://ai.dev/rate-limit ve https://ai.google.dev/gemini-api/docs/rate-limits adreslerinden kotanızı kontrol edin.',
      'Farklı bir Google hesabıyla yeni API anahtarı oluşturmak da geçici çözüm olabilir.',
      `\n\nSunucu: ${brief}`,
    ].join(' ')
  }

  if (status === 403) {
    return `Gemini erişim reddedildi (403). API anahtarı kısıtlı veya Generative Language API projede kapalı olabilir.\n\n${brief}`
  }

  if (status === 401 || status === 400) {
    return `Gemini isteği reddedildi (${status}). API anahtarını doğrulayın.\n\n${brief}`
  }

  return `Gemini (${status}): ${brief}`
}

async function generateWithModel(
  model: string,
  payload: GeminiAskPayload,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const key = payload.apiKey?.trim()
  if (!key) throw new Error('API anahtarı boş')

  const user = payload.userMessage?.trim()
  if (!user) throw new Error('Soru boş')

  const url = buildUrl(model, key)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: payload.systemInstruction.slice(0, 24_000) }],
      },
      contents: [{ role: 'user', parts: [{ text: user.slice(0, 8_000) }] }],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.35,
      },
    }),
  })

  const body = await res.text()

  if (!res.ok) {
    return { ok: false, status: res.status, body }
  }

  let data: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }
  try {
    data = JSON.parse(body) as typeof data
  } catch {
    throw new Error(`Gemini yanıtı JSON değil (${model})`)
  }

  if (data.error?.message) throw new Error(data.error.message)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text?.trim()) throw new Error('Model boş yanıt döndü')

  return { ok: true, text: text.trim() }
}

async function generateChatWithModel(
  model: string,
  payload: GeminiChatPayload,
): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const key = payload.apiKey?.trim()
  if (!key) throw new Error('API anahtarı boş')

  if (payload.history.length === 0) throw new Error('Sohbet geçmişi boş')

  const contents = payload.history.map((h) => ({
    role: h.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: h.content.slice(0, 12_000) }],
  }))

  const url = buildUrl(model, key)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: payload.systemInstruction.slice(0, 24_000) }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4,
      },
    }),
  })

  const body = await res.text()
  if (!res.ok) return { ok: false, status: res.status, body }

  let data: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }
  try {
    data = JSON.parse(body) as typeof data
  } catch {
    throw new Error(`Gemini yanıtı JSON değil (${model})`)
  }

  if (data.error?.message) throw new Error(data.error.message)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text?.trim()) throw new Error('Model boş yanıt döndü')

  return { ok: true, text: text.trim() }
}

/** Çok turlu sohbet (Gemini) */
export async function geminiChat(payload: GeminiChatPayload): Promise<string> {
  const errors: string[] = []

  for (const model of MODEL_CANDIDATES) {
    let result = await generateChatWithModel(model, payload)

    if (!result.ok && result.status === 429) {
      await sleep(2800)
      result = await generateChatWithModel(model, payload)
    }

    if (result.ok) return result.text

    const snippet = result.body.length > 320 ? `${result.body.slice(0, 320)}…` : result.body
    errors.push(`${model} → ${result.status}: ${snippet}`)

    if (result.status !== 404) {
      throw new Error(formatGeminiHttpError(result.status, result.body))
    }
  }

  throw new Error(
    `Uygun Gemini modeli bulunamadı (404).\n${errors.join('\n')}`,
  )
}

export async function geminiGenerateContent(payload: GeminiAskPayload): Promise<string> {
  const errors: string[] = []

  for (const model of MODEL_CANDIDATES) {
    let result = await generateWithModel(model, payload)

    /* Geçici RPM limiti: bir kez kısa bekleyip aynı modeli yeniden dene (günlük kota doluysa yine 429 döner) */
    if (!result.ok && result.status === 429) {
      await sleep(2800)
      result = await generateWithModel(model, payload)
    }

    if (result.ok) return result.text

    const snippet = result.body.length > 320 ? `${result.body.slice(0, 320)}…` : result.body
    errors.push(`${model} → ${result.status}: ${snippet}`)

    if (result.status !== 404) {
      throw new Error(formatGeminiHttpError(result.status, result.body))
    }
  }

  throw new Error(
    `Uygun Gemini modeli bulunamadı (tüm adaylar 404). Hesabınızda ListModels ile kontrol edin:\n` +
      `https://generativelanguage.googleapis.com/v1beta/models?key=API_ANAHTARI\n\n` +
      errors.join('\n'),
  )
}
