import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MpnSupplierLinks } from '@/components/MpnSupplierLinks'
import { SidebarInventory } from '@/components/SidebarInventory'
import { StockRowActions } from '@/components/StockRowActions'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/data/sampleParts'
import { matchesQuery, type CategoryFilter } from '@/lib/partFilters'
import { SS_GEMINI_KEY_HINT } from '@/lib/settingsKeys'

const tabOn = 'bg-brand text-white shadow-bubble'
const tabOff =
  'border border-ls-line bg-ls-surface text-slate-700 shadow-card hover:border-slate-300 hover:bg-slate-50/90'

export function KayitPage() {
  const { parts, applyQuantityDelta, addPart, applyExcelMerge } = useInventory()
  const { isViewer } = useSimpleAccess()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [geminiKeyHint, setGeminiKeyHint] = useState(false)

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SS_GEMINI_KEY_HINT) === '1') {
        sessionStorage.removeItem(SS_GEMINI_KEY_HINT)
        setGeminiKeyHint(true)
      }
    } catch {
      /* yoksay */
    }
  }, [])

  const inCategory = useMemo(() => {
    if (category === 'all') return parts
    return parts.filter((p) => p.category === category)
  }, [category, parts])

  const filtered = useMemo(
    () => inCategory.filter((p) => matchesQuery(p, query)),
    [inCategory, query],
  )

  const totalInScope = inCategory.length

  const applyDelta = useCallback(
    (mpn: string, delta: number) => {
      applyQuantityDelta(mpn, delta)
    },
    [applyQuantityDelta],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <SidebarInventory
        parts={parts}
        onAddPart={addPart}
        onExcelMerged={applyExcelMerge}
        readOnly={isViewer}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <header>
            <p className="ls-label text-teal-700/90">Kayıt</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">Stok ve malzeme</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {isViewer ? (
                <>
                  <strong className="font-semibold text-amber-800">Salt okunur modu:</strong> listeyi görüntülüyorsunuz.
                  Düzenlemek için üst bardan <strong className="font-semibold text-slate-800">Yönetici girişi</strong> yapın.
                </>
              ) : (
                <>
                  Sol panelden parça veya Excel; tabloda <strong className="font-semibold text-slate-800">−</strong> /{' '}
                  <strong className="font-semibold text-slate-800">+</strong> ile adet güncelleyin.
                </>
              )}
            </p>
            {geminiKeyHint ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-card">
                Giriş sohbeti için{' '}
                <Link to="/ayarlar" className="font-semibold text-teal-800 underline-offset-2 hover:underline">
                  Ayarlar
                </Link>
                ’dan API anahtarı ekleyin. Bu sayfada arama filtrelendi.
              </p>
            ) : null}
          </header>

          <section className="shrink-0 space-y-5">
            <div>
              <label htmlFor="stock-search" className="ls-label">
                Arama
              </label>
              <input
                id="stock-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="MPN, açıklama, konum…"
                autoComplete="off"
                spellCheck={false}
                className="ls-input mt-2"
              />
            </div>

            <div>
              <p className="ls-label">Kategori</p>
              <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="Stok kategorisi">
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === 'all'}
                  onClick={() => setCategory('all')}
                  className={`rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                    category === 'all' ? tabOn : tabOff
                  }`}
                >
                  Tümü
                </button>
                {CATEGORY_ORDER.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={category === key}
                    onClick={() => setCategory(key)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-medium transition sm:text-sm ${
                      category === key ? tabOn : tabOff
                    }`}
                  >
                    {CATEGORY_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden ls-card">
            <div className="flex shrink-0 items-end justify-between gap-4 border-b border-ls-line bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-4 py-3.5 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Tablo</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filtered.length === 0
                    ? 'Eşleşen satır yok.'
                    : category === 'all'
                      ? `${filtered.length} / ${parts.length} satır`
                      : `${filtered.length} / ${totalInScope} · ${CATEGORY_LABELS[category]}`}
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm" id="stock-table">
                <thead className="sticky top-0 z-[1] border-b border-ls-line bg-slate-50/95 text-2xs font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-3.5 sm:px-4">Kategori</th>
                    <th className="whitespace-nowrap px-3 py-3.5 sm:px-4">MPN / Kaynak</th>
                    <th className="px-3 py-3.5 sm:px-4">Açıklama</th>
                    <th className="whitespace-nowrap px-3 py-3.5 sm:px-4">Adet</th>
                    <th className="whitespace-nowrap px-3 py-3.5 sm:px-4">Konum</th>
                    <th className="whitespace-nowrap px-3 py-3.5 sm:px-4">Paket</th>
                    <th className="min-w-[200px] whitespace-nowrap px-3 py-3.5 sm:px-4">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ls-line">
                  {filtered.map((p) => (
                    <tr key={p.mpn} className="bg-ls-surface transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                        <span className="inline-flex rounded-lg border border-teal-200/80 bg-teal-50 px-2 py-0.5 text-2xs font-semibold text-teal-900">
                          {CATEGORY_LABELS[p.category]}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="font-mono text-sm font-semibold text-teal-800">{p.mpn}</div>
                        <div className="mt-1.5">
                          <MpnSupplierLinks mpn={p.mpn} />
                        </div>
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-slate-700 sm:max-w-none sm:px-4 sm:whitespace-normal">
                        {p.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                        {p.quantity === 0 ? (
                          <span className="tabular-nums">
                            <span className="font-medium text-slate-400 line-through">{p.quantity}</span>
                            <span className="ml-1.5 text-2xs font-semibold text-amber-700">bitti</span>
                          </span>
                        ) : (
                          <span className="tabular-nums font-semibold text-slate-900">{p.quantity}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600 sm:px-4">{p.location}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-500 sm:px-4">{p.footprint ?? '—'}</td>
                      <td className="px-2 py-2 sm:px-3">
                        <StockRowActions part={p} onApplyDelta={applyDelta} readOnly={isViewer} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
