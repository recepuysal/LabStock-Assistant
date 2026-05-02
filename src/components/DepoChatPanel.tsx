import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isFallback?: boolean
}

function formatParagraph(text: string, inverse: boolean) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong
          key={i}
          className={inverse ? 'font-semibold text-white' : 'font-semibold text-slate-900'}
        >
          {seg.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{seg}</span>
  })
}

function MessageBody({ text, inverse = false }: { text: string; inverse?: boolean }) {
  const blocks = text.split(/\n{2,}/)
  const bodyCls = inverse
    ? 'text-[0.9375rem] leading-relaxed text-white/95'
    : 'text-[0.9375rem] leading-relaxed text-slate-700'
  return (
    <div className={`space-y-3 ${bodyCls}`}>
      {blocks.map((block, i) => (
        <p key={i} className="min-w-0 whitespace-pre-wrap break-words">
          {formatParagraph(block, inverse)}
        </p>
      ))}
    </div>
  )
}

export function DepoChatPanel({
  messages,
  composerValue,
  onComposerChange,
  onSend,
  loading,
  bridgeMissing,
  providerLabel,
}: {
  messages: ChatMessage[]
  composerValue: string
  onComposerChange: (v: string) => void
  onSend: () => void
  loading: boolean
  bridgeMissing: boolean
  providerLabel: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && composerValue.trim()) onSend()
    }
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-ls-line bg-ls-surface p-4 shadow-card sm:p-5"
        style={{ maxHeight: 'min(62vh, 640px)' }}
      >
        <div className="mx-auto flex w-full flex-col gap-4">
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex w-full justify-end pl-4 sm:pl-10">
                <div
                  className="w-fit max-w-[min(100%,40rem)] min-w-0 rounded-2xl rounded-br-md bg-brand px-4 py-3.5 text-left shadow-bubble"
                  style={{ wordBreak: 'break-word' }}
                >
                  <MessageBody text={m.content} inverse />
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex w-full justify-start pr-4 sm:pr-8">
                <div
                  className={`w-fit max-w-[min(100%,56rem)] min-w-0 rounded-2xl rounded-bl-md border px-4 py-3.5 text-left shadow-card ${
                    m.isFallback
                      ? 'border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-50/50'
                      : 'border-ls-line bg-ls-muted/80'
                  }`}
                >
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                      Asistan
                    </span>
                    {m.isFallback ? (
                      <span className="rounded-md bg-amber-100/90 px-2 py-0.5 text-2xs font-semibold text-amber-900">
                        Yerel özet
                      </span>
                    ) : (
                      <span className="rounded-md bg-teal-100/80 px-2 py-0.5 text-2xs font-semibold text-teal-900">
                        {providerLabel}
                      </span>
                    )}
                  </div>
                  <MessageBody text={m.content} />
                </div>
              </div>
            ),
          )}
          {loading ? (
            <div className="flex justify-start pl-1">
              <div className="flex items-center gap-1.5 rounded-2xl border border-ls-line bg-ls-muted px-5 py-3.5 shadow-inset">
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-500" />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {bridgeMissing ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 text-center text-xs font-medium text-amber-950">
          Sohbet için uygulamayı masaüstü (Electron) modunda açın.
        </p>
      ) : null}

      <div className="mt-4 flex shrink-0 items-end gap-2 rounded-2xl border border-ls-line bg-ls-surface p-2 shadow-float">
        <textarea
          value={composerValue}
          onChange={(e) => onComposerChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesajınızı yazın…"
          rows={2}
          disabled={loading || bridgeMissing}
          className="max-h-36 min-h-[52px] flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={loading || bridgeMissing || !composerValue.trim()}
          className="mb-0.5 shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          Gönder
        </button>
      </div>
      <p className="mt-3 text-center text-2xs font-medium text-slate-500">
        Bulut API:{' '}
        <Link
          to="/ayarlar"
          className="font-semibold text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700"
        >
          Ayarlar
        </Link>
      </p>
    </div>
  )
}
