import type { PartCategory } from '@/data/sampleParts'
import type { SupplierSkus } from '@/data/suppliers'

export type SupplierImportPayload = {
  mpn: string
  description: string
  footprint?: string
  category: PartCategory
  supplierSkus: SupplierSkus
}

const VALID_CATEGORIES = new Set<PartCategory>([
  'resistor',
  'capacitor',
  'ic',
  'transistor',
  'diode',
  'connector',
  'module',
  'led',
  'sensor',
  'mechanical',
])

function asCategory(raw: string): PartCategory {
  return VALID_CATEGORIES.has(raw as PartCategory) ? (raw as PartCategory) : 'ic'
}

export async function fetchPartFromSupplierUrl(url: string): Promise<
  | { ok: true; data: SupplierImportPayload }
  | { ok: false; error: string }
> {
  const api = window.labstock?.importFromSupplierUrl
  if (!api) {
    return { ok: false, error: 'Siteden içe aktarma yalnızca masaüstü uygulamasında çalışır.' }
  }

  const res = await api({ url })
  if (!res.ok) return res

  return {
    ok: true,
    data: {
      mpn: res.mpn,
      description: res.description,
      footprint: res.footprint,
      category: asCategory(res.category),
      supplierSkus: res.supplierSkus,
    },
  }
}
