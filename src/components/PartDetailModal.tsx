import { useEffect, type ReactNode } from 'react'
import { MpnSupplierLinks } from '@/components/MpnSupplierLinks'
import { StockRowActions } from '@/components/StockRowActions'
import { CATEGORY_LABELS, type Part } from '@/data/sampleParts'

type Props = {
  part: Part | null
  open: boolean
  onClose: () => void
  onApplyDelta: (mpn: string, delta: number) => void
  readOnly?: boolean
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] gap-x-3 gap-y-1 border-b border-ls-line/80 py-2.5 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-ls-text-muted">{label}</span>
      <div className="text-sm text-ls-text">{children}</div>
    </div>
  )
}

export function PartDetailModal({ part, open, onClose, onApplyDelta, readOnly }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !part) return null

  const qtyClass =
    part.quantity <= 0
      ? 'text-ls-danger'
      : part.quantity <= 3
        ? 'text-ls-warn'
        : 'text-ls-accent'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="part-detail-title"
      onClick={onClose}
    >
      <div
        className="ls-card flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ls-line px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ls-text-muted">Parça detayı</p>
            <h2 id="part-detail-title" className="mt-1 break-all font-mono text-lg font-semibold text-ls-text">
              {part.mpn}
            </h2>
            <span className="ls-badge mt-2 inline-block">{CATEGORY_LABELS[part.category]}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ls-btn-ghost -mr-1 shrink-0 px-2 py-1.5 text-lg leading-none"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
          <div>
            <DetailRow label="Açıklama">
              <span className="leading-relaxed">{part.description || '—'}</span>
            </DetailRow>
            <DetailRow label="Adet">
              <span className={`font-semibold tabular-nums ${qtyClass}`}>
                {part.quantity}
                {part.quantity === 0 ? (
                  <span className="ml-2 text-xs font-normal text-ls-warn">— stok bitti</span>
                ) : part.quantity <= 3 ? (
                  <span className="ml-2 text-xs font-normal text-ls-warn">— kritik</span>
                ) : null}
              </span>
            </DetailRow>
            <DetailRow label="Konum">{part.location || '—'}</DetailRow>
            <DetailRow label="Paket">
              <span className="font-mono text-sm">{part.footprint || '—'}</span>
            </DetailRow>
          </div>

          <section className="mt-4 rounded-lg border border-ls-line bg-ls-muted/30 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ls-text-muted">Tedarikçiler</h3>
            <p className="mt-0.5 text-xs text-ls-text-muted">
              Kayıtlı kod varsa ürün sayfası; yoksa MPN ile arama açılır.
            </p>
            <div className="mt-3">
              <MpnSupplierLinks mpn={part.mpn} supplierSkus={part.supplierSkus} layout="panel" />
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ls-line px-4 py-3 sm:px-5">
          {!readOnly ? (
            <div onClick={(e) => e.stopPropagation()}>
              <p className="mb-1.5 text-xs text-ls-text-muted">Stok güncelle</p>
              <StockRowActions part={part} onApplyDelta={onApplyDelta} />
            </div>
          ) : (
            <span className="text-xs text-ls-text-muted">Salt okunur</span>
          )}
          <button type="button" onClick={onClose} className="ls-btn-secondary ml-auto">
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
