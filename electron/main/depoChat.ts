import { geminiChat } from './gemini'
import { groqChatCompletion, type GroqMessage } from './groq'

export type DepoChatProvider = 'groq' | 'gemini'

export type DepoChatTurn = { role: 'user' | 'assistant'; content: string }

export type DepoChatPayload = {
  provider: DepoChatProvider
  apiKey: string
  inventoryJson: string
  history: DepoChatTurn[]
}

/** Gemini ilk içerik kullanıcı olmalı; karşılama balonunu API’ye göndermeden kırp */
function trimLeadingAssistant(turns: DepoChatTurn[]): DepoChatTurn[] {
  let i = 0
  while (i < turns.length && turns[i].role === 'assistant') i++
  return turns.slice(i)
}

function buildSystemPrompt(inventoryJson: string): string {
  const inv = inventoryJson.length > 18_000 ? `${inventoryJson.slice(0, 18_000)}\n…(liste kısaltıldı)` : inventoryJson

  return [
    'Sen LabStock depo asistanısın. Kullanıcıyla Türkçe, sıcak ve net bir sohbet kur; ChatGPT tarzında paragraflar ve gerektiğinde madde işaretleri kullan.',
    'Yalnızca aşağıdaki JSON stok listesine dayanarak somut cevap ver. Listede olmayan parça için uydurma; “kayıtta görmüyorum” de.',
    'Stok sorularında mümkünse MPN, kısa açıklama, adet ve konumu yaz. Muadil önerirken emin değilsen bunun tahmin olduğunu belirt.',
    '',
    'STOK JSON:',
    inv,
  ].join('\n')
}

export async function depoChat(payload: DepoChatPayload): Promise<string> {
  const sys = buildSystemPrompt(payload.inventoryJson)
  const provider = payload.provider === 'gemini' ? 'gemini' : 'groq'

  const history = trimLeadingAssistant(payload.history)
  if (history.length === 0) throw new Error('Sohbet geçmişi boş')
  if (history[history.length - 1].role !== 'user') throw new Error('Son mesaj kullanıcı olmalı')

  if (provider === 'groq') {
    const messages: GroqMessage[] = [
      { role: 'system', content: sys },
      ...history.map((h) => ({ role: h.role, content: h.content })),
    ]
    return groqChatCompletion(payload.apiKey, messages)
  }

  return geminiChat({
    apiKey: payload.apiKey,
    systemInstruction: sys,
    history,
  })
}
