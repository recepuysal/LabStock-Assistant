/** Tedarikçi ürün sayfası URL/HTML ile parça bilgisi (API yok). */

export type SupportedSupplier = 'lcsc' | 'digikey' | 'farnell' | 'mouser' | 'tme'

export type SupplierSkusPartial = Partial<Record<SupportedSupplier, string>>

export type SupplierImportSuccess = {
  ok: true
  supplier: SupportedSupplier
  mpn: string
  description: string
  footprint?: string
  category: string
  supplierSkus: SupplierSkusPartial
  brand?: string
}

export type SupplierImportResult = SupplierImportSuccess | { ok: false; error: string }

const FETCH_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FETCH_HEADERS = {
  'User-Agent': FETCH_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// ——— Ortak yardımcılar ———

function decodeSeg(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

function pickQuoted(html: string, key: string): string | undefined {
  const m = html.match(new RegExp(`${key}:"([^"]+)"`))
  return m?.[1]
}

function pickMeta(html: string, prop: string): string | undefined {
  const m =
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
  return m?.[1]?.trim()
}

function pickTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim()
}

const FOOTPRINT_PARAM_NAMES = [
  'Case',
  'Type of case',
  'Housing',
  'Package',
  'Package / Case',
  'Supplier Device Package',
  'Mounting Style',
  'Case/Package',
  'Encapsulation',
]

function normalizeFootprint(raw: string): string | undefined {
  const t = raw.trim()
  if (!t || t === '-' || t === '—' || /^n\/?a$/i.test(t)) return undefined
  return t
    .replace(/^DIP(\d+)$/i, 'DIP-$1')
    .replace(/^SOIC(\d+)$/i, 'SOIC-$1')
    .replace(/^SOP(\d+)$/i, 'SOP-$1')
    .replace(/^SOT(\d{2,3})$/i, 'SOT-$1')
    .slice(0, 80)
}

function matchFootprintInString(s: string): string | undefined {
  const patterns = [
    /\b(DIP-?\d+)\b/i,
    /\b(SOIC-?\d+)\b/i,
    /\b(SOP-?\d+)\b/i,
    /\b(TSSOP-?\d+)\b/i,
    /\b(MSOP-?\d+)\b/i,
    /\b(QFP-?\d+)\b/i,
    /\b(QFN-?\d+)\b/i,
    /\b(LQFP-?\d+)\b/i,
    /\b(SOT-?\d{2,3}[A-Z]?)\b/i,
    /\b(TO-?\d{2,3}[A-Z]?)\b/i,
    /\b(SOD-?\d+)\b/i,
    /\b(SC-?\d{2,3})\b/i,
    /\b(0402|0603|0805|1206|1210|2512)\b/,
    /\b(BGA-?\d*)\b/i,
    /\b(WLCSP)\b/i,
    /\b(SMD)\b/i,
    /\b(THT)\b/i,
  ]
  for (const p of patterns) {
    const m = s.match(p)
    if (m) return normalizeFootprint(m[1])
  }
  return undefined
}

/** TME: "…; DIP8" — LCSC: encapStandard — parametre tabloları */
function inferFootprintFromDescription(text?: string): string | undefined {
  if (!text) return undefined
  const segments = text.split(/[;|]/).map((s) => s.trim()).filter(Boolean)
  for (let i = segments.length - 1; i >= 0; i--) {
    const fp = matchFootprintInString(segments[i])
    if (fp) return fp
  }
  return matchFootprintInString(text)
}

function extractFootprintFromSupplierHtml(html: string, description?: string): string | undefined {
  for (const name of FOOTPRINT_PARAM_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = html.match(new RegExp(`"name":"${escaped}"[^}]*?"value":"([^"]+)"`, 'i'))
    if (m?.[1]) {
      const fp = normalizeFootprint(m[1]) ?? matchFootprintInString(m[1])
      if (fp) return fp
    }
  }

  const lcscEncap =
    pickQuoted(html, 'encapStandard') ??
    pickQuoted(html, 'standard') ??
    pickQuoted(html, 'productArrange')
  if (lcscEncap) {
    const fp = normalizeFootprint(lcscEncap) ?? matchFootprintInString(lcscEncap)
    if (fp) return fp
  }

  const fromDesc = inferFootprintFromDescription(description)
  if (fromDesc) return fromDesc

  for (const label of ['Package', 'Case', 'Encapsulation', 'Mounting', 'Kılıf', 'Paket']) {
    const m = html.match(
      new RegExp(
        `${label}[^<]{0,60}</td>\\s*<td[^>]*>[\\s\\S]{0,240}?<span[^>]*>\\s*([^<]{2,48})\\s*</span>`,
        'i',
      ),
    )
    if (m?.[1]) {
      const fp = normalizeFootprint(m[1]) ?? matchFootprintInString(m[1])
      if (fp) return fp
    }
  }

  const ld = parseLdJsonProducts(html)[0]
  if (ld?.description) {
    const fp = inferFootprintFromDescription(ld.description)
    if (fp) return fp
  }

  return undefined
}

function applyFootprint(
  partial: Omit<SupplierImportSuccess, 'ok'>,
  html: string,
): Omit<SupplierImportSuccess, 'ok'> {
  const footprint = partial.footprint ?? extractFootprintFromSupplierHtml(html, partial.description)
  return footprint ? { ...partial, footprint } : partial
}

type LdProduct = {
  mpn?: string
  sku?: string
  name?: string
  description?: string
  brand?: string
  category?: string
}

function parseLdJsonProducts(html: string): LdProduct[] {
  const out: LdProduct[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const raw = JSON.parse(m[1]) as unknown
      const nodes: unknown[] = []
      if (Array.isArray(raw)) nodes.push(...raw)
      else if (raw && typeof raw === 'object' && '@graph' in raw && Array.isArray((raw as { '@graph': unknown[] })['@graph']))
        nodes.push(...(raw as { '@graph': unknown[] })['@graph'])
      else nodes.push(raw)

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        const t = (node as { '@type'?: string | string[] })['@type']
        const types = Array.isArray(t) ? t : t ? [t] : []
        if (!types.some((x) => String(x).includes('Product'))) continue
        const n = node as Record<string, unknown>
        const brandRaw = n.brand
        const brand =
          typeof brandRaw === 'string'
            ? brandRaw
            : brandRaw && typeof brandRaw === 'object' && 'name' in brandRaw
              ? String((brandRaw as { name: string }).name)
              : undefined
        out.push({
          mpn: typeof n.mpn === 'string' ? n.mpn : undefined,
          sku: typeof n.sku === 'string' ? n.sku : undefined,
          name: typeof n.name === 'string' ? n.name : undefined,
          description: typeof n.description === 'string' ? n.description : undefined,
          brand,
          category: typeof n.category === 'string' ? n.category : undefined,
        })
      }
    } catch {
      /* sonraki script */
    }
  }
  return out
}

export function mapCategoryFromText(hay: string): string {
  const s = hay.toLowerCase()
  if (s.includes('resistor')) return 'resistor'
  if (s.includes('capacitor') || s.includes('cap ')) return 'capacitor'
  if (s.includes('connector') || s.includes('socket') || s.includes('header')) return 'connector'
  if (s.includes('led') || s.includes('optocoupler')) return 'led'
  if (s.includes('sensor')) return 'sensor'
  if (s.includes('diode') || s.includes('rectifier') || s.includes('tvs')) return 'diode'
  if (s.includes('transistor') || s.includes('mosfet') || s.includes('igbt')) return 'transistor'
  if (s.includes('module') || s.includes('development')) return 'module'
  if (s.includes('switch') || s.includes('relay') || s.includes('fuse') || s.includes('crystal'))
    return 'mechanical'
  if (
    s.includes('operational amplifier') ||
    s.includes('microcontroller') ||
    s.includes('amplifier') ||
    s.includes('regulator') ||
    s.includes('driver') ||
    s.includes('memory') ||
    s.includes(' logic') ||
    s.includes(' ic')
  )
    return 'ic'
  return 'ic'
}

async function fetchHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; status?: number; error: string }> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(30_000),
      redirect: 'follow',
    })
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` }
    }
    return { ok: true, html: await res.text() }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { ok: false, error: 'İstek zaman aşımına uğradı.' }
    }
    return { ok: false, error: msg }
  }
}

function parseUrlInput(input: string): URL | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }
}

export function detectSupplier(url: URL): SupportedSupplier | null {
  const h = url.hostname.toLowerCase()
  if (h.includes('lcsc.com')) return 'lcsc'
  if (h.includes('digikey.')) return 'digikey'
  if (h.includes('mouser.')) return 'mouser'
  if (h.includes('farnell.') || h.includes('element14.')) return 'farnell'
  if (h.includes('tme.eu') || h.includes('tme.com')) return 'tme'
  return null
}

// ——— LCSC ———

export function extractLcscCode(input: string): string | null {
  const u = parseUrlInput(input)
  if (u && u.hostname.toLowerCase().includes('lcsc.com')) {
    const m =
      u.pathname.match(/\/product(?:-detail)?\/([A-Za-z]\d+)\.html?$/i) ??
      u.pathname.match(/\/product(?:-detail)?\/([A-Za-z]\d+)/i)
    if (m) return m[1].toUpperCase()
  }
  const m = input.trim().match(/\b([A-Za-z]\d{4,})\b/)
  return m ? m[1].toUpperCase() : null
}

function parseLcscHtml(html: string, expectedCode?: string): Omit<SupplierImportSuccess, 'ok'> | null {
  const productCode = pickQuoted(html, 'productCode') ?? expectedCode
  const productModel = pickQuoted(html, 'productModel')
  if (!productCode || !productModel) return null

  const parentCatalogName = pickQuoted(html, 'parentCatalogName') ?? ''
  const catalogName = pickQuoted(html, 'catalogName')
  const encapStandard = pickQuoted(html, 'encapStandard')
  const brand = pickQuoted(html, 'brandNameEn')
  const ld = parseLdJsonProducts(html)[0]
  const description =
    ld?.description ??
    pickMeta(html, 'og:description') ??
    pickQuoted(html, 'productNameEn') ??
    [brand, productModel].filter(Boolean).join(' ')

  return applyFootprint(
    {
      supplier: 'lcsc',
      mpn: productModel,
      description: description || productModel,
      footprint: encapStandard ? normalizeFootprint(encapStandard) ?? encapStandard : undefined,
      category: mapCategoryFromText(`${parentCatalogName} ${catalogName ?? ''}`),
      supplierSkus: { lcsc: productCode },
      brand,
    },
    html,
  )
}

async function importLcsc(url: URL, raw: string): Promise<SupplierImportResult> {
  const code = extractLcscCode(raw) ?? extractLcscCode(url.href)
  const normalized = code
    ? `https://www.lcsc.com/product-detail/${code}.html`
    : url.href

  const fetched = await fetchHtml(normalized)
  if (!fetched.ok) {
    return { ok: false, error: `LCSC sayfası alınamadı (${fetched.error}).` }
  }
  const parsed = parseLcscHtml(fetched.html, code ?? undefined)
  if (!parsed) return { ok: false, error: 'LCSC sayfasından ürün bilgisi okunamadı.' }
  return { ok: true, ...parsed }
}

// ——— TME ———

function extractTmeSymbol(url: URL): string | null {
  const m = url.pathname.match(/\/details\/([^/]+)/i)
  return m ? decodeSeg(m[1]).toUpperCase() : null
}

function parseTmeHtml(html: string, symbolFromUrl?: string): Omit<SupplierImportSuccess, 'ok'> | null {
  const symMatch = html.match(/_tmeGlobal\.symbol\s*=\s*['"]([^'"]+)['"]/)
  const symbol = (symMatch?.[1] ?? symbolFromUrl)?.trim().toUpperCase()
  const ld = parseLdJsonProducts(html)[0]
  const mpn = (ld?.mpn ?? ld?.sku ?? symbol)?.trim()
  if (!mpn) return null

  const tmeSku = symbol ?? mpn.toUpperCase()
  const description =
    ld?.description ??
    pickMeta(html, 'og:description') ??
    pickMeta(html, 'description') ??
    pickTitle(html)?.split('|')[0]?.trim() ??
    mpn

  return applyFootprint(
    {
      supplier: 'tme',
      mpn,
      description: description || mpn,
      category: mapCategoryFromText(ld?.category ?? description),
      supplierSkus: { tme: tmeSku },
      brand: ld?.brand,
    },
    html,
  )
}

async function importTme(url: URL): Promise<SupplierImportResult> {
  const symbol = extractTmeSymbol(url)
  const fetched = await fetchHtml(url.href)
  if (fetched.ok) {
    const parsed = parseTmeHtml(fetched.html, symbol ?? undefined)
    if (parsed) return { ok: true, ...parsed }
  }
  if (symbol) {
    return {
      ok: true,
      supplier: 'tme',
      mpn: symbol,
      description: symbol,
      category: 'ic',
      supplierSkus: { tme: symbol },
    }
  }
  return {
    ok: false,
    error: fetched.ok
      ? 'TME sayfasından ürün bilgisi okunamadı.'
      : `TME sayfası alınamadı (${fetched.error}).`,
  }
}

// ——— DigiKey ———

function parseDigiKeyUrl(url: URL): {
  mpn?: string
  digikey?: string
  brand?: string
} {
  const parts = url.pathname.split('/').filter(Boolean)
  const detailIdx = parts.findIndex((p) => p === 'detail' || p === 'product-detail')
  if (detailIdx < 0) return {}

  const rest = parts.slice(detailIdx + 1)
  if (rest.length < 2) return {}

  // /product-detail/en/{mpn}/{mfg}/{dksku}
  if (parts[detailIdx] === 'product-detail' && rest[0]?.length === 2 && rest.length >= 3) {
    const mpn = decodeSeg(rest[1] ?? rest[0])
    const tail = decodeSeg(rest[rest.length - 1])
    const dkSku = isDigiKeySku(tail) ? tail : undefined
    const brand = rest.length >= 3 ? decodeSeg(rest[2]) : undefined
    return { mpn, digikey: dkSku, brand }
  }

  // /products/detail/{mfg}/{mpn}/{tail}
  const brand = decodeSeg(rest[0])
  const mpn = decodeSeg(rest[1])
  const tail = rest[2] ? decodeSeg(rest[2]) : undefined
  const dkSku = tail && isDigiKeySku(tail) ? tail : undefined
  return { mpn, digikey: dkSku, brand }
}

function isDigiKeySku(s: string): boolean {
  return /-nd$/i.test(s) || /^\d{3,}-[\w-]+$/i.test(s)
}

function parseDigiKeyHtml(html: string, fromUrl: ReturnType<typeof parseDigiKeyUrl>): Omit<SupplierImportSuccess, 'ok'> | null {
  const ld = parseLdJsonProducts(html)[0]
  const mpn = ld?.mpn ?? fromUrl.mpn
  if (!mpn) return null

  const digikey =
    (fromUrl.digikey && isDigiKeySku(fromUrl.digikey) ? fromUrl.digikey : undefined) ??
    (ld?.sku && isDigiKeySku(ld.sku) ? ld.sku : ld?.sku) ??
    fromUrl.digikey

  const description =
    ld?.description ?? pickMeta(html, 'og:description') ?? pickTitle(html)?.split('|')[0]?.trim() ?? mpn

  const skus: SupplierSkusPartial = {}
  if (digikey) skus.digikey = digikey

  return applyFootprint(
    {
      supplier: 'digikey',
      mpn,
      description,
      category: mapCategoryFromText(`${ld?.category ?? ''} ${description}`),
      supplierSkus: skus,
      brand: ld?.brand ?? fromUrl.brand,
    },
    html,
  )
}

async function importDigikey(url: URL): Promise<SupplierImportResult> {
  const fromUrl = parseDigiKeyUrl(url)
  const fetched = await fetchHtml(url.href)
  if (fetched.ok) {
    const parsed = parseDigiKeyHtml(fetched.html, fromUrl)
    if (parsed) return { ok: true, ...parsed }
  }
  if (fromUrl.mpn) {
    const skus: SupplierSkusPartial = {}
    if (fromUrl.digikey) skus.digikey = fromUrl.digikey
    const brand = fromUrl.brand?.replace(/-/g, ' ')
    return {
      ok: true,
      supplier: 'digikey',
      mpn: fromUrl.mpn,
      description: brand ? `${brand} ${fromUrl.mpn}` : fromUrl.mpn,
      category: 'ic',
      supplierSkus: skus,
      brand,
    }
  }
  return {
    ok: false,
    error:
      'DigiKey bağlantısı tanınamadı veya site erişimi engellendi. Ürün detay URL’si yapıştırın (…/products/detail/…/MPN/…).',
  }
}

// ——— Mouser ———

function parseMouserUrl(url: URL): { mpn?: string; mouser?: string; brand?: string } {
  const m = url.pathname.match(/\/ProductDetail\/([^/]+)(?:\/([^/]+))?/i)
  if (!m) return {}
  const a = decodeSeg(m[1])
  const b = m[2] ? decodeSeg(m[2]) : undefined
  // 595-SN74LS00N
  if (/^\d{3,}-/.test(a)) {
    const mouser = a
    const mpn = a.replace(/^\d+-/, '')
    return { mouser, mpn }
  }
  if (b) return { brand: a, mpn: b }
  return { mpn: a }
}

function parseMouserHtml(html: string, fromUrl: ReturnType<typeof parseMouserUrl>): Omit<SupplierImportSuccess, 'ok'> | null {
  const ld = parseLdJsonProducts(html)[0]
  const mpn = ld?.mpn ?? fromUrl.mpn
  if (!mpn) return null

  const mouserMatch = html.match(/data-partnumber=["']([^"']+)["']/i) ?? html.match(/Mouser Part #\s*<[^>]+>\s*([^<\s]+)/i)
  const mouser = fromUrl.mouser ?? mouserMatch?.[1] ?? (ld?.sku && /^\d{3,}-/.test(ld.sku) ? ld.sku : undefined)

  const description =
    ld?.description ?? pickMeta(html, 'og:description') ?? pickTitle(html)?.split('|')[0]?.trim() ?? mpn

  const skus: SupplierSkusPartial = {}
  if (mouser) skus.mouser = mouser

  return applyFootprint(
    {
      supplier: 'mouser',
      mpn,
      description,
      category: mapCategoryFromText(`${ld?.category ?? ''} ${description}`),
      supplierSkus: skus,
      brand: ld?.brand ?? fromUrl.brand,
    },
    html,
  )
}

async function importMouser(url: URL): Promise<SupplierImportResult> {
  const fromUrl = parseMouserUrl(url)
  const fetched = await fetchHtml(url.href)
  if (fetched.ok && !fetched.html.includes('Access Denied') && !fetched.html.includes('access_denied')) {
    const parsed = parseMouserHtml(fetched.html, fromUrl)
    if (parsed) return { ok: true, ...parsed }
  }
  if (fromUrl.mpn) {
    const skus: SupplierSkusPartial = {}
    if (fromUrl.mouser) skus.mouser = fromUrl.mouser
    return {
      ok: true,
      supplier: 'mouser',
      mpn: fromUrl.mpn,
      description: fromUrl.brand ? `${fromUrl.brand} ${fromUrl.mpn}` : fromUrl.mpn,
      category: 'ic',
      supplierSkus: skus,
      brand: fromUrl.brand,
    }
  }
  return {
    ok: false,
    error:
      'Mouser bağlantısı tanınamadı. Örnek: …/ProductDetail/771-LM358N veya …/ProductDetail/Üretici/MPN',
  }
}

// ——— Farnell / element14 ———

function isFarnellHost(host: string): boolean {
  const h = host.toLowerCase()
  return h.includes('farnell.') || h.includes('element14.')
}

function parseFarnellUrl(url: URL): { mpn?: string; farnell?: string; brand?: string } {
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) return {}
  const last = parts[parts.length - 1]
  const orderCode = /^\d{5,}$/.test(last) ? last : undefined
  if (!orderCode) return {}
  const mpn = decodeSeg(parts[1])
  const brand = decodeSeg(parts[0])
  return { mpn, farnell: orderCode, brand }
}

function parseFarnellHtml(html: string, fromUrl: ReturnType<typeof parseFarnellUrl>): Omit<SupplierImportSuccess, 'ok'> | null {
  const ld = parseLdJsonProducts(html)[0]
  const mpn = ld?.mpn ?? fromUrl.mpn
  if (!mpn) return null

  const farnell = fromUrl.farnell ?? (ld?.sku && /^\d{5,}$/.test(ld.sku) ? ld.sku : undefined)
  const description =
    ld?.description ?? pickMeta(html, 'og:description') ?? pickTitle(html)?.split('|')[0]?.trim() ?? mpn

  const skus: SupplierSkusPartial = {}
  if (farnell) skus.farnell = farnell

  return applyFootprint(
    {
      supplier: 'farnell',
      mpn,
      description,
      category: mapCategoryFromText(`${ld?.category ?? ''} ${description}`),
      supplierSkus: skus,
      brand: ld?.brand ?? fromUrl.brand,
    },
    html,
  )
}

async function importFarnell(url: URL): Promise<SupplierImportResult> {
  const fromUrl = parseFarnellUrl(url)
  const fetched = await fetchHtml(url.href)
  if (fetched.ok && !fetched.html.includes('PF404ErrorView')) {
    const parsed = parseFarnellHtml(fetched.html, fromUrl)
    if (parsed) return { ok: true, ...parsed }
  }
  if (fromUrl.mpn) {
    const skus: SupplierSkusPartial = {}
    if (fromUrl.farnell) skus.farnell = fromUrl.farnell
    const brand = fromUrl.brand?.replace(/-/g, ' ')
    return {
      ok: true,
      supplier: 'farnell',
      mpn: fromUrl.mpn,
      description: brand ? `${brand} ${fromUrl.mpn}` : fromUrl.mpn,
      category: 'ic',
      supplierSkus: skus,
      brand,
    }
  }
  return {
    ok: false,
    error:
      'Farnell/element14 bağlantısı tanınamadı. Örnek: …/üretici/mpn/kategori/1234567 (son segment sipariş kodu).',
  }
}

// ——— Giriş noktası ———

const SUPPLIER_LABELS: Record<SupportedSupplier, string> = {
  lcsc: 'LCSC',
  digikey: 'DigiKey',
  farnell: 'Farnell',
  mouser: 'Mouser',
  tme: 'TME',
}

export async function importFromSupplierUrl(urlInput: string): Promise<SupplierImportResult> {
  const trimmed = urlInput.trim()
  if (!trimmed) return { ok: false, error: 'Ürün bağlantısı boş.' }

  const url = parseUrlInput(trimmed)
  if (!url) return { ok: false, error: 'Geçerli bir http(s) bağlantısı yapıştırın.' }

  const supplier = detectSupplier(url)
  if (!supplier) {
    return {
      ok: false,
      error: `Desteklenen siteler: ${Object.values(SUPPLIER_LABELS).join(', ')}.`,
    }
  }

  try {
    switch (supplier) {
      case 'lcsc':
        return await importLcsc(url, trimmed)
      case 'tme':
        return await importTme(url)
      case 'digikey':
        return await importDigikey(url)
      case 'mouser':
        return await importMouser(url)
      case 'farnell':
        return await importFarnell(url)
      default:
        return { ok: false, error: 'Bilinmeyen tedarikçi.' }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `İçe aktarma hatası: ${msg}` }
  }
}

export const importFromLcscUrl = (url: string) => importFromSupplierUrl(url)
