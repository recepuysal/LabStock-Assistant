import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PartDetailModal } from '@/components/PartDetailModal'
import { SidebarInventory, type EntryPanelTab } from '@/components/SidebarInventory'
import { StockRowActions } from '@/components/StockRowActions'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/data/sampleParts'
import { matchesQuery, type CategoryFilter } from '@/lib/partFilters'
import { SS_GEMINI_KEY_HINT } from '@/lib/settingsKeys'

export function KayitPage() {
  const { parts, applyQuantityDelta, addPart, applyExcelMerge } = useInventory()
  const { isViewer } = useSimpleAccess()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [geminiKeyHint, setGeminiKeyHint] = useState(false)
  const [entryPanel, setEntryPanel] = useState<EntryPanelTab | null>(null)
  const [selectedMpn, setSelectedMpn] = useState<string | null>(null)

  const selectedPart = useMemo(
    () => (selectedMpn ? parts.find((p) => p.mpn === selectedMpn) ?? null : null),
    [parts, selectedMpn],
  )

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

  function openPanel(tab: EntryPanelTab) {
    setSelectedMpn(null)
    setEntryPanel(tab)
  }

  return (
    <div className="ls-page ls-page-fill">
      <header className="ls-page-header shrink-0 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Stok envanteri</h1>
          <p>
            {isViewer
              ? 'Salt okunur — düzenlemek için yönetici girişi.'
              : `${parts.length} kayıt · Satıra tıklayın (detay) · − / + ile adet güncelleyin.`}
          </p>
        </div>
        {!isViewer ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => openPanel('add')}
              className={entryPanel === 'add' ? 'ls-btn-primary' : 'ls-btn-secondary'}
            >
              + Yeni parça
            </button>
            <button
              type="button"
              onClick={() => openPanel('excel')}
              className={entryPanel === 'excel' ? 'ls-btn-primary' : 'ls-btn-secondary'}
            >
              Excel
            </button>
          </div>
        ) : null}
      </header>

      {geminiKeyHint ? (
        <p className="ls-alert-warn shrink-0">
          Sohbet ücretsiz yerel modda çalışır. İsteğe bağlı gelişmiş AI için{' '}
          <Link to="/app/ayarlar" className="font-semibold underline-offset-2 hover:underline">
            Ayarlar
          </Link>
          .
        </p>
      ) : null}

      <section className="shrink-0 space-y-3">
        <input
          id="stock-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="MPN, açıklama veya konum ara…"
          autoComplete="off"
          spellCheck={false}
          className="ls-input max-w-md"
          aria-label="Arama"
        />

        <div className="ls-segment-track" role="tablist" aria-label="Kategori">
          <CategoryTab active={category === 'all'} onClick={() => setCategory('all')} label="Tümü" />
          {CATEGORY_ORDER.map((key) => (
            <CategoryTab
              key={key}
              active={category === key}
              onClick={() => setCategory(key)}
              label={CATEGORY_LABELS[key]}
            />
          ))}
        </div>
      </section>

      {entryPanel ? (
        <SidebarInventory
          parts={parts}
          onAddPart={addPart}
          onExcelMerged={applyExcelMerge}
          readOnly={isViewer}
          activeTab={entryPanel}
          onClose={() => setEntryPanel(null)}
        />
      ) : null}

      <PartDetailModal
        part={selectedPart}
        open={selectedPart != null}
        onClose={() => setSelectedMpn(null)}
        onApplyDelta={applyDelta}
        readOnly={isViewer}
      />

      <section className="ls-card flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex shrink-0 items-center border-b border-ls-line px-4 py-3 sm:px-5">
          <span className="text-sm text-ls-text-muted">
            {filtered.length === 0
              ? 'Sonuç yok'
              : category === 'all'
                ? `${filtered.length} satır`
                : `${filtered.length} / ${totalInScope}`}
          </span>
        </div>
        <div className="ls-table-wrap min-h-0 flex-1 rounded-none border-0">
          <table className="ls-table min-w-[800px]" id="stock-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>MPN</th>
                <th>Açıklama</th>
                <th>Adet</th>
                <th>Konum</th>
                <th>Paket</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-ls-text-muted">
                    {parts.length === 0
                      ? 'Henüz kayıt yok. «Yeni parça» ile ekleyin.'
                      : 'Arama veya filtreye uygun kayıt yok.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isSelected = selectedMpn === p.mpn
                  return (
                  <tr
                    key={p.mpn}
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.mpn} detayını aç`}
                    className={`cursor-pointer ${isSelected ? 'bg-ls-accent-soft/50 ring-1 ring-inset ring-ls-accent/30' : ''}`}
                    onClick={() => setSelectedMpn(p.mpn)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedMpn(p.mpn)
                      }
                    }}
                  >
                    <td className="whitespace-nowrap">
                      <span className="ls-badge">{CATEGORY_LABELS[p.category]}</span>
                    </td>
                    <td>
                      <div className="font-mono text-sm font-medium text-ls-text">{p.mpn}</div>
                      <div className="mt-1">
                        {p.supplierSkus?.lcsc ? (
                          <span className="font-mono text-2xs text-ls-text-muted">
                            LCSC {p.supplierSkus.lcsc}
                          </span>
                        ) : (
                          <span className="text-2xs text-ls-text-muted/80">Detay için tıklayın</span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate text-ls-text-muted sm:max-w-none sm:whitespace-normal">
                      {p.description}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {p.quantity === 0 ? (
                        <span className="text-ls-text-muted">
                          0 <span className="text-xs text-ls-warn">bitti</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-ls-text">{p.quantity}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-ls-text-muted">{p.location}</td>
                    <td className="whitespace-nowrap text-ls-text-muted">{p.footprint ?? '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StockRowActions part={p} onApplyDelta={applyDelta} readOnly={isViewer} />
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function CategoryTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`ls-segment ${active ? 'ls-segment-active' : 'hover:text-ls-text'}`}
    >
      {label}
    </button>
  )
}
