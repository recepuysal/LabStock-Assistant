import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, type Part } from '@/data/sampleParts'
import type { LocalAssistantResult } from '@/lib/localInventoryAssistant'

function StockCard({ part, score, subtle }: { part: Part; score?: number; subtle?: boolean }) {
  const kat = CATEGORY_LABELS[part.category]
  const qtyLabel = part.quantity <= 0 ? 'Bitti (0)' : `${part.quantity} adet`
  const qtyClass =
    part.quantity <= 0 ? 'bg-ls-danger-soft text-ls-danger' : 'bg-ls-accent-soft text-ls-accent'

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-left transition ${
        subtle ? 'border-ls-line/80 bg-ls-muted/80' : 'border-ls-line bg-ls-surface'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold tracking-tight text-ls-text">{part.mpn}</p>
          <p className="mt-1 text-sm leading-snug text-ls-text-muted">{part.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${qtyClass}`}>{qtyLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ls-text-muted">
        <span>{kat}</span>
        <span className="opacity-40">·</span>
        <span>{part.location}</span>
        {part.footprint ? (
          <>
            <span className="opacity-40">·</span>
            <span className="font-mono">{part.footprint}</span>
          </>
        ) : null}
        {score != null && score > 0 ? (
          <>
            <span className="opacity-40">·</span>
            <span title="Dahili eşleşme skoru">eşleşme {Math.round(score)}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function LocalAssistantResponse({
  result,
  cloudAppend,
  filterQuery,
}: {
  result: LocalAssistantResult
  cloudAppend: string | null
  filterQuery: string
}) {
  if (result.kind === 'empty') {
    return (
      <div className="mt-5 ls-card p-5 text-left">
        <p className="text-sm text-ls-text-muted">{result.message}</p>
      </div>
    )
  }

  if (result.kind === 'no_match') {
    return (
      <div className="mt-5 ls-card-muted p-5 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ls-warn">Yanıt</p>
        <p className="mt-2 text-sm font-medium text-ls-text">{result.message}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ls-text-muted">
          {result.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ls-text-muted">
          <Link to="/app/kayit" className="font-medium text-ls-accent underline-offset-2 hover:underline">
            Kayıt
          </Link>
          ’ta manuel aramayı deneyin.
        </p>
      </div>
    )
  }

  const q = encodeURIComponent(filterQuery.trim())

  return (
    <div className="mt-5 w-full max-w-2xl space-y-4 text-left">
      <div className="ls-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ls-line/80 pb-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-ls-text-muted">Yanıt</p>
          <span className="ls-badge text-[10px] uppercase tracking-wide">
            Yerel · çevrimdışı
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ls-text">{result.summary}</p>

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ls-text-muted">Eşleşen stok</h3>
          <div className="mt-2 space-y-2">
            {result.topMatches.map(({ part, score }) => (
              <StockCard key={part.mpn} part={part} score={score} />
            ))}
          </div>
        </div>

        {result.related.length > 0 ? (
          <div className="mt-5 border-t border-dashed border-ls-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ls-text-muted">
              İlgili diğer stok
              <span className="ml-1.5 font-normal normal-case opacity-70">(sorgunuza göre skoru yeterli)</span>
            </h3>
            <div className="mt-2 space-y-2">
              {result.related.map(({ part, score }) => (
                <StockCard key={part.mpn} part={part} score={score} subtle />
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-ls-text-muted">{result.footnote}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={q ? `/kayit?q=${q}` : '/kayit'}
            className="ls-btn-primary px-3 py-2 text-xs"
          >
            Kayıt’ta bu aramayı aç
          </Link>
        </div>
      </div>

      {cloudAppend ? (
        <div className="ls-card-muted p-5">
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-ls-accent">Bulut özeti</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ls-text">{cloudAppend}</p>
        </div>
      ) : null}
    </div>
  )
}
