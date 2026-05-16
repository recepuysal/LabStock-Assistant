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

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Merhaba. Stok listenize göre soru sorabilirsiniz. **Ayarlar**’dan Groq veya Gemini anahtarı ekleyin; yoksa yerel özet kullanılır.',
}

export function HomePage() {
  const { parts } = useInventory()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [WELCOME])
  const [composer, setComposer] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_START_ON_KAYIT) === '1') {
        navigate('/app/kayit', { replace: true })
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

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? composer).trim()
      if (!text || loading) return

      const prefer = readPreferredProvider()
      const attempts = buildCloudAttempts(prefer)
      const userMsg: ChatMessage = { id: newId(), role: 'user', content: text }
      if (!textOverride) setComposer('')
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
    },
    [bridgeMissing, composer, loading, messages, parts, readPreferredProvider],
  )

  function openKayitFilter() {
    const t = composer.trim()
    if (t) navigate(`/kayit?q=${encodeURIComponent(t)}`)
    else navigate('/app/kayit')
  }

  const { label: providerLabel } = readProviderAndKey()
  const hasApiKey = !!(readGroqKey() || readGeminiKey())

  return (
    <div className="ls-page ls-page-fill flex min-h-0 flex-1 flex-col !gap-0 !py-3 sm:!px-4">
      <DepoChatPanel
        messages={messages}
        composerValue={composer}
        onComposerChange={setComposer}
        onSend={() => void sendMessage()}
        loading={loading}
        bridgeMissing={bridgeMissing}
        providerLabel={providerLabel}
        stockCount={parts.length}
        hasApiKey={hasApiKey}
        onSuggestion={(text) => {
          setComposer(text)
          void sendMessage(text)
        }}
        onClear={() => setMessages([WELCOME])}
        onKayitSearch={openKayitFilter}
      />
    </div>
  )
}
