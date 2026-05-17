/** Tedarikçi stok kodları — Faz 1: manuel + derin bağlantı (API yok). */

export const SUPPLIER_IDS = ['lcsc', 'digikey', 'farnell', 'mouser', 'tme'] as const

export type SupplierId = (typeof SUPPLIER_IDS)[number]

export const SUPPLIER_LABELS: Record<SupplierId, string> = {
  lcsc: 'LCSC',
  digikey: 'DigiKey',
  farnell: 'Farnell',
  mouser: 'Mouser',
  tme: 'TME',
}

/** Excel başlık eşanlamları (normalizeHeader sonrası) */
export const SUPPLIER_EXCEL_HEADERS: Record<SupplierId, string[]> = {
  lcsc: ['lcsc', 'lcsc kod', 'lcsc kodu', 'lcsc no', 'c kod', 'c kodu'],
  digikey: ['digikey', 'digi key', 'digi-key', 'dk', 'digikey parca', 'digikey parça'],
  farnell: ['farnell', 'element14', 'element 14', 'e14'],
  mouser: ['mouser', 'mouser parca', 'mouser parça'],
  tme: ['tme'],
}

export type SupplierSkus = Partial<Record<SupplierId, string>>

export function normalizeSupplierSku(raw: string): string {
  return raw.trim()
}

/** Boş değerleri atar; yalnızca tanımlı tedarikçiler kalır */
export function compactSupplierSkus(skus: SupplierSkus | undefined): SupplierSkus | undefined {
  if (!skus) return undefined
  const out: SupplierSkus = {}
  for (const id of SUPPLIER_IDS) {
    const v = normalizeSupplierSku(skus[id] ?? '')
    if (v) out[id] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function mergeSupplierSkus(a?: SupplierSkus, b?: SupplierSkus): SupplierSkus | undefined {
  const out: SupplierSkus = { ...a }
  if (b) {
    for (const id of SUPPLIER_IDS) {
      const v = normalizeSupplierSku(b[id] ?? '')
      if (v && !out[id]) out[id] = v
    }
  }
  return compactSupplierSkus(out)
}
