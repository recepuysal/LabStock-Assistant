import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DepoChatPanel, type ChatMessage } from '@/components/DepoChatPanel'
import { useInventory } from '@/context/InventoryContext'
import { buildChatAttempts, getAiChatStatus } from '@/lib/aiKeys'
import { inventoryJsonForGemini } from '@/lib/geminiInventory'
import { localInventoryAssistantReply } from '@/lib/localInventoryAssistant'
import { LS_START_ON_KAYIT } from '@/lib/settingsKeys'

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildWelcome(): ChatMessage {
  const s = getAiChatStatus()
  let extra =
    '**Ücretsiz yerel asistan** her zaman açık — API gerekmez (arama, stok özeti, kritik liste).'
  if (s.trialActive) {
    extra += ` Kurulumda tanımlı bulut denemesi: **${s.trialDaysLeft} gün** kaldı.`
  } else if (s.hasBundledKeys && !s.hasUserCloudKey) {
    extra += ' Bulut deneme süresi doldu; Ayarlar’dan kendi Groq/Gemini anahtarınızı ekleyebilirsiniz.'
  } else {
    extra += ' İsterseniz Ayarlar’dan Groq, Gemini veya Ollama ekleyin.'
  }
  return {
    id: 'welcome',
    role: 'assistant',
    content: `Merhaba. ${extra}`,
  }
}

export function HomePage() {
  const { parts } = useInventory()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcome()])
  const [composer, setComposer] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const aiStatus = useMemo(() => getAiChatStatus(), [messages.length])

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
  const enhancedChat = !bridgeMissing && buildChatAttempts().length > 0

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? composer).trim()
      if (!text || loading) return

      const attempts = buildChatAttempts()
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

      const replyLocal = () => {
        appendAssistant(localInventoryAssistantReply(parts, text), true)
      }

      if (bridgeMissing || attempts.length === 0) {
        replyLocal()
        setLoading(false)
        return
      }

      let lastErr: string | null = null
      let usedLabel = ''

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i]!
        try {
          let reply: string
          if (attempt.kind === 'ollama') {
            reply = await window.labstock!.depoChat({
              provider: 'ollama',
              apiKey: '',
              inventoryJson: inv,
              history,
              ollamaBaseUrl: attempt.baseUrl,
              ollamaModel: attempt.model,
            })
            usedLabel = attempt.label
          } else {
            reply = await window.labstock!.depoChat({
              provider: attempt.provider,
              apiKey: attempt.apiKey,
              inventoryJson: inv,
              history,
            })
            usedLabel = attempt.viaTrial ? `${attempt.label} (deneme)` : attempt.label
          }

          const prefix =
            i > 0 && attempts[0]
              ? `**${attempts[0].kind === 'cloud' ? attempts[0].label : attempts[0].label}** kullanılamadı; yanıt **${usedLabel}** ile alındı.\n\n`
              : ''
          appendAssistant((prefix + reply.trim()).trim(), false)
          lastErr = null
          break
        } catch (err) {
          lastErr = err instanceof Error ? err.message : String(err)
        }
      }

      if (lastErr) {
        const short = lastErr.length > 180 ? `${lastErr.slice(0, 180)}…` : lastErr
        const local = localInventoryAssistantReply(parts, text)
        appendAssistant(`Gelişmiş yanıt alınamadı (${short}).\n\n**Yerel yanıt:**\n\n${local}`, true)
      }

      setLoading(false)
    },
    [bridgeMissing, composer, loading, messages, parts],
  )

  function openKayitFilter() {
    const t = composer.trim()
    if (t) navigate(`/app/kayit?q=${encodeURIComponent(t)}`)
    else navigate('/app/kayit')
  }

  return (
    <div className="ls-page ls-page-fill flex min-h-0 flex-1 flex-col !gap-0 !py-3 sm:!px-4">
      <DepoChatPanel
        messages={messages}
        composerValue={composer}
        onComposerChange={setComposer}
        onSend={() => void sendMessage()}
        loading={loading}
        bridgeMissing={bridgeMissing}
        providerLabel={aiStatus.statusLabel}
        providerDetail={aiStatus.statusDetail}
        stockCount={parts.length}
        hasEnhancedChat={enhancedChat}
        trialDaysLeft={aiStatus.trialActive ? aiStatus.trialDaysLeft : undefined}
        onSuggestion={(text) => {
          setComposer(text)
          void sendMessage(text)
        }}
        onClear={() => setMessages([buildWelcome()])}
        onKayitSearch={openKayitFilter}
      />
    </div>
  )
}

