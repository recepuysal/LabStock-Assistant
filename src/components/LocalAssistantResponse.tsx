import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, type Part } from '@/data/sampleParts'
import type { LocalAssistantResult } from '@/lib/localInventoryAssistant'

function StockCard({ part, score, subtle }: { part: Part; score?: number; subtle?: boolean }) {
  const kat = CATEGORY_LABELS[part.category]
  const qtyLabel = part.quantity <= 0 ? 'Bitti (0)' : `${part.quantity} adet`
  const qtyClass =
    part.quantity <= 0 ? 'bg-slate-200 text-slate-700' : 'bg-teal-50 text-teal-900 ring-1 ring-teal-600/15'

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-left shadow-card transition ${
        subtle ? 'border-ls-line/80 bg-slate-50/90' : 'border-ls-line bg-ls-surface'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold tracking-tight text-slate-900">{part.mpn}</p>
          <p className="mt-1 text-sm leading-snug text-slate-600">{part.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${qtyClass}`}>{qtyLabel}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{kat}</span>
        <span className="text-slate-300">·</span>
        <span>{part.location}</span>
        {part.footprint ? (
          <>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-600">{part.footprint}</span>
          </>
        ) : null}
        {score != null && score > 0 ? (
          <>
            <span className="text-slate-300">·</span>
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
        <p className="text-sm text-slate-600">{result.message}</p>
      </div>
    )
  }

  if (result.kind === 'no_match') {
    return (
      <div className="mt-5 rounded-lg border border-amber-200/80 bg-amber-50/50 p-5 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800/90">Yanıt</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{result.message}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          {result.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          <Link to="/kayit" className="font-medium text-teal-700 underline-offset-2 hover:underline">
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
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-slate-500">Yanıt</p>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Yerel · çevrimdışı
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-800">{result.summary}</p>

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eşleşen stok</h3>
          <div className="mt-2 space-y-2">
            {result.topMatches.map(({ part, score }) => (
              <StockCard key={part.mpn} part={part} score={score} />
            ))}
          </div>
        </div>

        {result.related.length > 0 ? (
          <div className="mt-5 border-t border-dashed border-ls-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              İlgili diğer stok
              <span className="ml-1.5 font-normal normal-case text-slate-400">(sorgunuza göre skoru yeterli)</span>
            </h3>
            <div className="mt-2 space-y-2">
              {result.related.map(({ part, score }) => (
                <StockCard key={part.mpn} part={part} score={score} subtle />
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{result.footnote}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={q ? `/kayit?q=${q}` : '/kayit'}
            className="inline-flex items-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white shadow-bubble transition hover:brightness-110"
          >
            Kayıt’ta bu aramayı aç
          </Link>
        </div>
      </div>

      {cloudAppend ? (
        <div className="rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/80 to-slate-50/60 p-5 shadow-card">
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-teal-800/90">Bulut özeti</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{cloudAppend}</p>
        </div>
      ) : null}
    </div>
  )
}
