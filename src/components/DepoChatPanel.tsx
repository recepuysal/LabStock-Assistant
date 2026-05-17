import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isFallback?: boolean
}

const SUGGESTIONS = [
  { label: 'Stok özeti', text: 'Stokta kaç farklı parça var? Kısa özet ver.' },
  { label: 'Kritik stok', text: 'Biten veya az kalan parçaları listele.' },
  { label: 'Parça ara', text: 'LM358 veya benzeri entegre var mı, kaç adet ve nerede?' },
  { label: 'Konumlar', text: 'Hangi parçalar hangi kutuda veya rafta?' },
]

function formatParagraph(text: string, inverse: boolean) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong key={i} className={inverse ? 'font-semibold text-ls-on-accent' : 'font-semibold text-ls-text'}>
          {seg.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{seg}</span>
  })
}

function MessageBody({ text, inverse = false }: { text: string; inverse?: boolean }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div
      className={`space-y-2.5 text-[0.9375rem] leading-relaxed ${
        inverse ? 'text-ls-on-accent' : 'text-ls-text'
      }`}
    >
      {blocks.map((block, i) => (
        <p key={i} className="min-w-0 whitespace-pre-wrap break-words">
          {formatParagraph(block, inverse)}
        </p>
      ))}
    </div>
  )
}

type Props = {
  messages: ChatMessage[]
  composerValue: string
  onComposerChange: (v: string) => void
  onSend: () => void
  loading: boolean
  bridgeMissing: boolean
  providerLabel: string
  providerDetail?: string
  stockCount: number
  hasEnhancedChat: boolean
  trialDaysLeft?: number
  onSuggestion?: (text: string) => void
  onClear?: () => void
  onKayitSearch?: () => void
}

export function DepoChatPanel({
  messages,
  composerValue,
  onComposerChange,
  onSend,
  loading,
  bridgeMissing,
  providerLabel,
  providerDetail,
  stockCount,
  hasEnhancedChat,
  trialDaysLeft,
  onSuggestion,
  onClear,
  onKayitSearch,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const showSuggestions = messages.length <= 1 && !loading && !!onSuggestion

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && composerValue.trim() && !bridgeMissing) onSend()
    }
  }

  const statusLabel = bridgeMissing ? 'Yerel mod' : providerLabel
  const statusSub = bridgeMissing ? undefined : providerDetail

  return (
    <div className="ls-chat-shell">
      <div className="ls-chat-toolbar">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ls-text">Depo asistanı</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ls-text-muted">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                bridgeMissing ? 'bg-ls-warn' : hasEnhancedChat ? 'bg-ls-accent' : 'bg-ls-accent'
              }`}
              aria-hidden
            />
            {stockCount} parça · {statusLabel}
            {statusSub ? <span className="text-ls-text-muted/90"> · {statusSub}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onKayitSearch ? (
            <button type="button" onClick={onKayitSearch} className="ls-btn-secondary py-2 text-xs">
              Kayıt’ta ara
            </button>
          ) : null}
          {onClear ? (
            <button type="button" onClick={onClear} className="ls-btn-ghost py-2 text-xs">
              Temizle
            </button>
          ) : null}
          <Link to="/app/ayarlar" className="ls-btn-ghost py-2 text-xs">
            Yapay zeka
          </Link>
        </div>
      </div>

      <div className="ls-chat-messages">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {showSuggestions ? (
            <div className="mb-2 rounded-xl border border-dashed border-ls-line bg-ls-muted px-4 py-6 text-center">
              <p className="text-sm font-medium text-ls-text">Depo hakkında soru sorun</p>
              <p className="mt-1 text-xs text-ls-text-muted">
                Yanıtlar yalnızca kayıtlı stok listenize dayanır.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(({ label, text }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSuggestion?.(text)}
                    className="w-full rounded-lg border border-ls-line bg-ls-surface px-3 py-2.5 text-left text-sm text-ls-text transition-colors hover:border-ls-accent-border hover:bg-ls-muted"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="mt-0.5 block text-xs text-ls-text-muted line-clamp-2">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div
                  className="max-w-[90%] rounded-lg rounded-br-sm bg-ls-accent px-4 py-3 sm:max-w-[85%]"
                  style={{ wordBreak: 'break-word' }}
                >
                  <MessageBody text={m.content} inverse />
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ls-accent-soft text-[10px] font-bold text-ls-accent"
                  aria-hidden
                >
                  LS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium text-ls-text">Asistan</span>
                    {m.isFallback ? (
                      <span className="rounded-md bg-ls-warn-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ls-warn">
                        Yerel
                      </span>
                    ) : (
                      <span className="text-[10px] text-ls-text-muted">{providerLabel}</span>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl rounded-tl-md border px-4 py-3 ${
                      m.isFallback
                        ? 'border-ls-warn/30 bg-ls-warn-soft/50'
                        : 'border-ls-line bg-ls-elevated'
                    }`}
                  >
                    <MessageBody text={m.content} />
                  </div>
                </div>
              </div>
            ),
          )}

          {loading ? (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ls-muted text-[10px] font-bold text-ls-text-muted">
                ...
              </div>
              <div className="flex items-center gap-1 rounded-2xl border border-ls-line bg-ls-muted px-4 py-3">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ls-accent" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ls-accent [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ls-accent [animation-delay:300ms]" />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} className="h-1 shrink-0" />
        </div>
      </div>

      {bridgeMissing ? (
        <p className="shrink-0 border-t border-ls-warn/20 bg-ls-warn-soft px-4 py-2 text-center text-xs text-ls-warn">
          Tam sohbet için uygulamayı Electron (masaüstü) modunda çalıştırın.
        </p>
      ) : !hasEnhancedChat ? (
        <p className="shrink-0 border-t border-ls-line bg-ls-muted/50 px-4 py-2 text-center text-xs text-ls-text-muted">
          <strong className="font-medium text-ls-text">Ücretsiz yerel</strong> asistan aktif (sınırsız). Gelişmiş sohbet için{' '}
          <Link to="/app/ayarlar" className="font-medium text-ls-accent hover:underline">
            Ayarlar
          </Link>
          ’dan Groq, Gemini veya Ollama ekleyin.
          {trialDaysLeft != null && trialDaysLeft > 0 ? (
            <span> Bulut denemesi: {trialDaysLeft} gün.</span>
          ) : null}
        </p>
      ) : trialDaysLeft != null && trialDaysLeft > 0 ? (
        <p className="shrink-0 border-t border-ls-accent/20 bg-ls-accent-soft/40 px-4 py-2 text-center text-xs text-ls-text-muted">
          Kurulum denemesi: <strong className="text-ls-text">{trialDaysLeft} gün</strong> bulut yanıtı. Sonrasında yerel mod +
          kendi API anahtarınız.
        </p>
      ) : null}

      <div className="ls-chat-composer">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={composerValue}
            onChange={(e) => onComposerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mesajınızı yazın… (Enter gönder, Shift+Enter satır)"
            rows={2}
            disabled={loading || bridgeMissing}
            className="ls-input max-h-28 min-h-[44px] flex-1 resize-none py-3"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={loading || bridgeMissing || !composerValue.trim()}
            className="ls-btn-primary h-11 w-11 shrink-0 rounded-lg px-0 text-lg disabled:opacity-35"
            aria-label="Gönder"
            title="Gönder"
          >
            &#8593;
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-ls-text-muted">
          Shift+Enter yeni satır
        </p>
      </div>
    </div>
  )
}
