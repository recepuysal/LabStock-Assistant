import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DepoChatPanel, type ChatMessage } from '@/components/DepoChatPanel'
import { useInventory } from '@/context/InventoryContext'
import { inventoryJsonForGemini } from '@/lib/geminiInventory'
import { localInventoryAssistantReply } from '@/lib/localInventoryAssistant'
import {
  LS_AI_PROVIDER,
  LS_GEMINI_API_KEY,
  LS_GROQ_API_KEY,
  LS_START_ON_KAYIT,
} from '@/lib/settingsKeys'

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readGroqKey(): string {
  try {
    return localStorage.getItem(LS_GROQ_API_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

function readGeminiKey(): string {
  try {
    return localStorage.getItem(LS_GEMINI_API_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

function buildCloudAttempts(prefer: 'groq' | 'gemini'): Array<{
  provider: 'groq' | 'gemini'
  apiKey: string
  label: string
}> {
  const groqKey = readGroqKey()
  const geminiKey = readGeminiKey()
  const out: Array<{ provider: 'groq' | 'gemini'; apiKey: string; label: string }> = []
  const add = (provider: 'groq' | 'gemini') => {
    const apiKey = provider === 'groq' ? groqKey : geminiKey
    if (!apiKey || out.some((x) => x.provider === provider)) return
    out.push({ provider, apiKey, label: provider === 'groq' ? 'Groq' : 'Gemini' })
  }
  if (prefer === 'gemini') {
    add('gemini')
    add('groq')
  } else {
    add('groq')
    add('gemini')
  }
  return out
}

export function HomePage() {
  const { parts } = useInventory()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Depo listenize göre soru sorabilirsiniz. Groq veya Gemini anahtarını **Ayarlar**’dan ekleyin; ikisini de kaydederseniz kota dolunca diğeri denenir.',
    },
  ])
  const [composer, setComposer] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_START_ON_KAYIT) === '1') {
        navigate('/kayit', { replace: true })
      }
    } catch {
      /* yoksay */
    }
  }, [navigate])

  const bridgeMissing = typeof window === 'undefined' || !window.labstock?.depoChat

  const readPreferredProvider = useCallback((): 'groq' | 'gemini' => {
    try {
      return localStorage.getItem(LS_AI_PROVIDER) === 'gemini' ? 'gemini' : 'groq'
    } catch {
      return 'groq'
    }
  }, [])

  const readProviderAndKey = useCallback((): { provider: 'groq' | 'gemini'; apiKey: string; label: string } => {
    const prefer = readPreferredProvider()
    const attempts = buildCloudAttempts(prefer)
    const first = attempts[0]
    if (first) return { provider: first.provider, apiKey: first.apiKey, label: first.label }
    return { provider: prefer, apiKey: '', label: prefer === 'gemini' ? 'Gemini' : 'Groq' }
  }, [readPreferredProvider])

  const sendMessage = useCallback(async () => {
    const text = composer.trim()
    if (!text || loading) return

    const prefer = readPreferredProvider()
    const attempts = buildCloudAttempts(prefer)
    const userMsg: ChatMessage = { id: newId(), role: 'user', content: text }
    setComposer('')
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content }))

    const inv = inventoryJsonForGemini(parts)

    const appendAssistant = (content: string, isFallback?: boolean) => {
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content, isFallback }])
    }

    if (bridgeMissing) {
      const local = localInventoryAssistantReply(parts, text)
      appendAssistant(`Masaüstü köprüsü yok.\n\n${local}`, true)
      setLoading(false)
      return
    }

    if (attempts.length === 0) {
      appendAssistant(
        '**Anahtar yok.** Ayarlardan Groq veya Gemini ekleyin.\n\nhttps://console.groq.com/keys\nhttps://aistudio.google.com/app/apikey',
        true,
      )
      setLoading(false)
      return
    }

    let lastErr: string | null = null
    for (let i = 0; i < attempts.length; i++) {
      const { provider, apiKey, label } = attempts[i]!
      try {
        const reply = await window.labstock!.depoChat({
          provider,
          apiKey,
          inventoryJson: inv,
          history,
        })
        const prefix =
          i > 0
            ? `**${attempts[0]!.label}** kullanılamadı; yanıt **${label}** ile alındı.\n\n`
            : ''
        appendAssistant((prefix + reply.trim()).trim())
        lastErr = null
        break
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err)
      }
    }

    if (lastErr) {
      const short = lastErr.length > 220 ? `${lastErr.slice(0, 220)}…` : lastErr
      const local = localInventoryAssistantReply(parts, text)
      appendAssistant(`Bulut yanıtı yok.\n\n**Özet:** ${short}\n\n**Yerel özet:**\n\n${local}`, true)
    }

    setLoading(false)
  }, [bridgeMissing, composer, loading, messages, parts, readPreferredProvider])

  function openKayitFilter() {
    const t = composer.trim()
    if (t) navigate(`/kayit?q=${encodeURIComponent(t)}`)
    else navigate('/kayit')
  }

  const { label: providerLabel } = readProviderAndKey()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex shrink-0 flex-col gap-4 border-b border-ls-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="ls-label text-teal-700/90">Sohbet</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-tight">
              Depo asistanı
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Stok listeniz her mesajda modele eklenir; yanıtlar yalnızca kayıtlı parçalara dayanır.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openKayitFilter}
              className="rounded-xl border border-ls-line bg-ls-surface px-4 py-2 text-sm font-medium text-slate-700 shadow-card transition hover:border-slate-300 hover:bg-slate-50"
            >
              Kayıt’ta ara
            </button>
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome',
                    role: 'assistant',
                    content: 'Sohbet temizlendi. Sorularınızı yazabilirsiniz.',
                  },
                ])
              }
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900"
            >
              Temizle
            </button>
          </div>
        </header>

        <div className="mx-auto mt-6 flex min-h-0 w-full flex-1 sm:mt-8">
          <DepoChatPanel
            messages={messages}
            composerValue={composer}
            onComposerChange={setComposer}
            onSend={sendMessage}
            loading={loading}
            bridgeMissing={bridgeMissing}
            providerLabel={providerLabel}
          />
        </div>
      </div>
    </div>
  )
}
