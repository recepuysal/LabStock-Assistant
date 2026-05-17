import * as XLSX from 'xlsx'
import {
  SUPPLIER_EXCEL_HEADERS,
  SUPPLIER_IDS,
  SUPPLIER_LABELS,
  compactSupplierSkus,
  mergeSupplierSkus,
  type SupplierId,
} from '@/data/suppliers'
import {
  CATEGORY_LABELS,
  type Part,
  type PartCategory,
} from '@/data/sampleParts'

const FIELD_SYNONYMS: Record<'mpn' | 'category' | 'description' | 'quantity' | 'location' | 'footprint', string[]> = {
  mpn: ['mpn', 'parca kodu', 'parça kodu', 'urun kodu', 'ürün kodu', 'stok kodu', 'kod', 'part no', 'part'],
  category: ['kategori', 'category', 'tip', 'tur', 'tür', 'grup'],
  description: ['açıklama', 'aciklama', 'description', 'tanim', 'tanım', 'ad', 'isim'],
  quantity: ['adet', 'quantity', 'qty', 'miktar', 'stok'],
  location: ['konum', 'location', 'yer', 'raf', 'depo'],
  footprint: ['paket', 'footprint', 'case', 'govde', 'gövde', 'kılıf'],
}

/** Türkçe / İngilizce kategori yazımı → dahili anahtar */
const CATEGORY_ALIASES: Record<string, PartCategory> = (() => {
  const m: Record<string, PartCategory> = {}
  const add = (k: string, v: PartCategory) => {
    m[k.trim().toLowerCase()] = v
  }
  ;(Object.keys(CATEGORY_LABELS) as PartCategory[]).forEach((key) => {
    add(key, key)
    add(CATEGORY_LABELS[key], key)
  })
  const extra: [string, PartCategory][] = [
    ['direnc', 'resistor'],
    ['resistor', 'resistor'],
    ['r', 'resistor'],
    ['kondansator', 'capacitor'],
    ['kapasitor', 'capacitor'],
    ['kapasitör', 'capacitor'],
    ['cap', 'capacitor'],
    ['capacitor', 'capacitor'],
    ['entegre', 'ic'],
    ['ic', 'ic'],
    ['integrated', 'ic'],
    ['transistor', 'transistor'],
    ['mosfet', 'transistor'],
    ['diyot', 'diode'],
    ['diode', 'diode'],
    ['konnektor', 'connector'],
    ['connector', 'connector'],
    ['soket', 'connector'],
    ['modul', 'module'],
    ['module', 'module'],
    ['led', 'led'],
    ['sensor', 'sensor'],
    ['sensör', 'sensor'],
    ['mekanik', 'mechanical'],
    ['breadboard', 'mechanical'],
  ]
  extra.forEach(([a, b]) => add(a, b))
  return m
})()

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function mapHeaderToField(header: string): keyof typeof FIELD_SYNONYMS | null {
  const n = normalizeHeader(header)
  if (!n) return null
  for (const [field, list] of Object.entries(FIELD_SYNONYMS) as [keyof typeof FIELD_SYNONYMS, string[]][]) {
    if (list.some((syn) => n === syn || n.includes(syn))) {
      return field
    }
  }
  return null
}

function mapHeaderToSupplier(header: string): SupplierId | null {
  const n = normalizeHeader(header)
  if (!n) return null
  for (const id of SUPPLIER_IDS) {
    const list = SUPPLIER_EXCEL_HEADERS[id]
    if (list.some((syn) => n === syn || n.includes(syn))) return id
  }
  return null
}

function parseSupplierCols(row: unknown[], supplierColMap: Partial<Record<SupplierId, number>>) {
  const skus: Partial<Record<SupplierId, string>> = {}
  for (const id of SUPPLIER_IDS) {
    const col = supplierColMap[id]
    if (col === undefined) continue
    const v = cellStr(row[col])
    if (v) skus[id] = v
  }
  return compactSupplierSkus(skus)
}

export function parseCategoryValue(raw: unknown): PartCategory | null {
  if (raw == null) return null
  const v = String(raw).trim().toLowerCase()
  if (!v) return null
  if (CATEGORY_ALIASES[v]) return CATEGORY_ALIASES[v]
  return null
}

function cellStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function cellQty(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(',', '.').replace(/\s/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

export type ExcelRowError = { row: number; message: string }

export type ExcelParseResult = {
  parts: Part[]
  errors: ExcelRowError[]
}

/** Excel / .xlsx içeriğini satırlara çevirir (birleştirme yapılmaz). */
export function parseExcelBuffer(buf: ArrayBuffer): ExcelParseResult {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    return { parts: [], errors: [{ row: 0, message: 'Çalışma sayfası bulunamadı.' }] }
  }
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: '',
  }) as unknown[][]
  if (!Array.isArray(rows) || rows.length < 2) {
    return { parts: [], errors: [{ row: 0, message: 'En az başlık + 1 veri satırı gerekli.' }] }
  }

  const headerRow = rows[0] as unknown[]
  const colMap: Partial<Record<keyof typeof FIELD_SYNONYMS, number>> = {}
  const supplierColMap: Partial<Record<SupplierId, number>> = {}
  headerRow.forEach((h, idx) => {
    const header = cellStr(h)
    const field = mapHeaderToField(header)
    if (field && colMap[field] === undefined) colMap[field] = idx
    const sid = mapHeaderToSupplier(header)
    if (sid && supplierColMap[sid] === undefined) supplierColMap[sid] = idx
  })

  if (colMap.mpn === undefined) {
    return {
      parts: [],
      errors: [
        {
          row: 0,
          message:
            'Başlık satırında MPN sütunu bulunamadı. Şablonda olduğu gibi: MPN, Kategori, Açıklama, Adet, Konum, Paket.',
        },
      ],
    }
  }

  const parts: Part[] = []
  const errors: ExcelRowError[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const line = r + 1
    if (!row || row.every((c) => cellStr(c) === '')) continue

    const mpn = colMap.mpn !== undefined ? cellStr(row[colMap.mpn]) : ''
    if (!mpn) {
      errors.push({ row: line, message: 'MPN boş; satır atlandı.' })
      continue
    }

    const catRaw = colMap.category !== undefined ? row[colMap.category] : ''
    const category = parseCategoryValue(catRaw)
    if (!category) {
      errors.push({
        row: line,
        message: `Geçersiz kategori: "${cellStr(catRaw)}". Örn: Direnç, Kondansatör, Entegre…`,
      })
      continue
    }

    const qtyCol = colMap.quantity
    const q = qtyCol !== undefined ? cellQty(row[qtyCol]) : null
    if (q === null) {
      errors.push({ row: line, message: 'Adet sayı olarak okunamadı.' })
      continue
    }

    const description =
      colMap.description !== undefined ? cellStr(row[colMap.description]) : ''
    const location =
      colMap.location !== undefined && cellStr(row[colMap.location])
        ? cellStr(row[colMap.location])
        : '—'
    const footprint =
      colMap.footprint !== undefined && cellStr(row[colMap.footprint])
        ? cellStr(row[colMap.footprint])
        : undefined

    parts.push({
      mpn,
      category,
      description: description || '—',
      quantity: q,
      location,
      footprint,
      supplierSkus: parseSupplierCols(row, supplierColMap),
    })
  }

  return { parts, errors }
}

/** Aynı dosyada tekrarlayan MPN → adetleri topla */
export function consolidateByMpn(parts: Part[]): Part[] {
  const map = new Map<string, Part>()
  for (const p of parts) {
    const key = p.mpn.trim().toLowerCase()
    const prev = map.get(key)
    if (!prev) {
      map.set(key, { ...p })
    } else {
      map.set(key, {
        ...prev,
        quantity: prev.quantity + p.quantity,
        description: prev.description !== '—' ? prev.description : p.description,
        location: prev.location !== '—' ? prev.location : p.location,
        footprint: prev.footprint ?? p.footprint,
        supplierSkus: mergeSupplierSkus(prev.supplierSkus, p.supplierSkus),
      })
    }
  }
  return [...map.values()]
}

export type MergeReport = { added: number; updated: number }

export function mergePartsIntoInventory(existing: Part[], incoming: Part[]): { next: Part[]; report: MergeReport } {
  const byKey = new Map<string, Part>()
  existing.forEach((p) => byKey.set(p.mpn.trim().toLowerCase(), { ...p }))

  let added = 0
  let updated = 0

  for (const p of incoming) {
    const key = p.mpn.trim().toLowerCase()
    const cur = byKey.get(key)
    if (cur) {
      byKey.set(key, {
        ...cur,
        quantity: cur.quantity + p.quantity,
        category: p.category,
        description: p.description !== '—' ? p.description : cur.description,
        location: p.location !== '—' ? p.location : cur.location,
        footprint: p.footprint ?? cur.footprint,
        supplierSkus: mergeSupplierSkus(cur.supplierSkus, p.supplierSkus),
      })
      updated++
    } else {
      byKey.set(key, { ...p })
      added++
    }
  }

  return {
    next: [...byKey.values()].sort((a, b) => a.mpn.localeCompare(b.mpn, 'tr')),
    report: { added, updated },
  }
}

/** Mevcut stok listesini Excel olarak indirir (yedek / paylaşım). */
const EXCEL_HEADERS = [
  'MPN',
  'Kategori',
  'Açıklama',
  'Adet',
  'Konum',
  'Paket',
  ...SUPPLIER_IDS.map((id) => SUPPLIER_LABELS[id]),
] as const

function partToExcelRow(p: Part): (string | number)[] {
  return [
    p.mpn,
    CATEGORY_LABELS[p.category],
    p.description,
    p.quantity,
    p.location,
    p.footprint ?? '',
    ...SUPPLIER_IDS.map((id) => p.supplierSkus?.[id] ?? ''),
  ]
}

export function downloadPartsAsExcel(parts: Part[], filename = 'LabStock-stok.xlsx'): void {
  const wb = XLSX.utils.book_new()
  const data: (string | number)[][] = [[...EXCEL_HEADERS], ...parts.map(partToExcelRow)]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 32 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    ...SUPPLIER_IDS.map(() => ({ wch: 14 })),
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Stok')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([new Uint8Array(out as ArrayBuffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadExcelTemplate(): void {
  const wb = XLSX.utils.book_new()
  const data: (string | number)[][] = [
    [...EXCEL_HEADERS],
    ['NE555P', 'Entegre', 'Zamanlayıcı IC', 10, 'Kutu A-1', 'DIP-8', 'C51118', '', '', '', ''],
    ['RC0603FR-0710KL', 'Direnç', '10 kΩ %1', 100, 'Çekmece R', '0603', '', '', '', '', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    ...SUPPLIER_IDS.map(() => ({ wch: 14 })),
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Stok')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([new Uint8Array(out as ArrayBuffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'LabStock-sablon.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
