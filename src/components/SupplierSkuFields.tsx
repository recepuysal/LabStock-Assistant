import { SUPPLIER_IDS, SUPPLIER_LABELS, type SupplierId, type SupplierSkus } from '@/data/suppliers'

type Props = {
  idPrefix: string
  value: SupplierSkus
  onChange: (next: SupplierSkus) => void
  disabled?: boolean
}

export function SupplierSkuFields({ idPrefix, value, onChange, disabled }: Props) {
  function setField(id: SupplierId, raw: string) {
    const v = raw.trim()
    onChange({ ...value, [id]: v || undefined })
  }

  return (
    <fieldset className="rounded-lg border border-ls-line/80 bg-ls-muted/40 px-3 py-3">
      <legend className="px-1 text-xs font-semibold text-ls-text">
        Tedarikçi stok kodları <span className="font-normal text-ls-text-muted">(isteğe bağlı)</span>
      </legend>
      <p className="mb-3 text-2xs leading-relaxed text-ls-text-muted">
        LCSC, DigiKey, Farnell, Mouser, TME — sipariş için tedarikçi parça numarası (isteğe bağlı).
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPLIER_IDS.map((sid) => (
          <div key={sid}>
            <label htmlFor={`${idPrefix}-sku-${sid}`} className="ls-label">
              {SUPPLIER_LABELS[sid]}
            </label>
            <input
              id={`${idPrefix}-sku-${sid}`}
              type="text"
              disabled={disabled}
              value={value[sid] ?? ''}
              onChange={(e) => setField(sid, e.target.value)}
              className="ls-input mt-1 font-mono text-xs"
              placeholder={placeholderFor(sid)}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </fieldset>
  )
}

function placeholderFor(id: SupplierId): string {
  switch (id) {
    case 'lcsc':
      return 'C123456'
    case 'digikey':
      return '497-…-ND'
    case 'mouser':
      return '511-…'
    case 'farnell':
      return '1234567'
    case 'tme':
      return 'NE555P'
  }
}
