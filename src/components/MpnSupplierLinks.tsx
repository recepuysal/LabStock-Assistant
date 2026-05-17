import { SUPPLIER_IDS, SUPPLIER_LABELS, type SupplierId, type SupplierSkus } from '@/data/suppliers'
import { supplierUrl } from '@/lib/mpnSupplierUrls'

type Props = {
  mpn: string
  supplierSkus?: SupplierSkus
  /** Tablo altı kompakt; modalda tam liste */
  layout?: 'inline' | 'panel'
}

const linkCls =
  'text-xs text-ls-text-muted transition hover:text-ls-accent hover:underline underline-offset-2'

export function MpnSupplierLinks({ mpn, supplierSkus, layout = 'inline' }: Props) {
  const q = mpn.trim()
  if (!q) return null

  if (layout === 'panel') {
    return (
      <ul className="space-y-2">
        {SUPPLIER_IDS.map((id) => {
          const sku = supplierSkus?.[id]?.trim()
          const href = supplierUrl(id, sku, q)
          return (
            <li
              key={id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ls-line/80 bg-ls-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ls-text">{SUPPLIER_LABELS[id]}</p>
                {sku ? (
                  <p className="mt-0.5 font-mono text-xs text-ls-text-muted">{sku}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-ls-text-muted">Kod kayıtlı değil</p>
                )}
              </div>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="ls-btn-secondary shrink-0 py-1.5 text-xs"
              >
                {sku ? 'Ürün sayfası' : 'MPN ile ara'}
              </a>
            </li>
          )
        })}
      </ul>
    )
  }

  const withSku = SUPPLIER_IDS.filter((id) => supplierSkus?.[id]?.trim())
  const withoutSku = SUPPLIER_IDS.filter((id) => !supplierSkus?.[id]?.trim())

  return (
    <span className="flex flex-col gap-1" title="Tedarikçi siteleri">
      {withSku.length > 0 ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {withSku.map((id, i) => (
            <span key={id} className="inline-flex items-center gap-x-2">
              {i > 0 ? (
                <span className="text-ls-line" aria-hidden>
                  ·
                </span>
              ) : null}
              <SupplierLink id={id} mpn={q} sku={supplierSkus![id]!} direct />
            </span>
          ))}
        </span>
      ) : null}
      {withoutSku.length > 0 ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 opacity-90">
          <span className="text-2xs text-ls-text-muted">Ara:</span>
          {withoutSku.map((id, i) => (
            <span key={id} className="inline-flex items-center gap-x-2">
              {i > 0 ? (
                <span className="text-ls-line" aria-hidden>
                  ·
                </span>
              ) : null}
              <SupplierLink id={id} mpn={q} />
            </span>
          ))}
        </span>
      ) : null}
    </span>
  )
}

function SupplierLink({
  id,
  mpn,
  sku,
  direct,
}: {
  id: SupplierId
  mpn: string
  sku?: string
  direct?: boolean
}) {
  const href = supplierUrl(id, sku, mpn)
  const label = direct && sku ? `${SUPPLIER_LABELS[id]} ${sku}` : SUPPLIER_LABELS[id]
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkCls} title={sku ?? mpn}>
      {label}
    </a>
  )
}
