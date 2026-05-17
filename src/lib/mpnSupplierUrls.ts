import { SUPPLIER_IDS, type SupplierId } from '@/data/suppliers'

function enc(s: string): string {
  return encodeURIComponent(s.trim())
}

function lcscSearchUrl(mpn: string): string {
  return `https://www.lcsc.com/search?q=${enc(mpn)}`
}

function lcscProductUrl(lcscCode: string): string {
  const raw = lcscCode.trim()
  const m = raw.match(/([A-Za-z]\d+)/i)
  const code = m ? m[1].toUpperCase() : raw.toUpperCase()
  // /product/… artık anasayfaya yönlendiriyor; güncel sayfa product-detail
  return `https://www.lcsc.com/product-detail/${code}.html`
}

function mouserSearchUrl(q: string): string {
  return `https://www.mouser.com/c/?q=${enc(q)}`
}

function mouserProductUrl(mouserPartNumber: string): string {
  return `https://www.mouser.com/ProductDetail/?qs=${enc(mouserPartNumber)}`
}

function digikeySearchUrl(q: string): string {
  return `https://www.digikey.com/en/products/result?keywords=${enc(q)}`
}

function farnellSearchUrl(q: string): string {
  return `https://tr.farnell.com/w/search?st=${enc(q)}`
}

function tmeSearchUrl(q: string): string {
  return `https://www.tme.eu/en/katalog/?search=${enc(q)}`
}

function tmeProductUrl(tmeSymbol: string): string {
  return `https://www.tme.eu/en/details/${enc(tmeSymbol.trim())}/`
}

const PRODUCT_URL: Partial<Record<SupplierId, (sku: string) => string>> = {
  lcsc: lcscProductUrl,
  mouser: mouserProductUrl,
  tme: tmeProductUrl,
}

const SEARCH_URL: Record<SupplierId, (q: string) => string> = {
  lcsc: lcscSearchUrl,
  digikey: digikeySearchUrl,
  mouser: mouserSearchUrl,
  farnell: farnellSearchUrl,
  tme: tmeSearchUrl,
}

/** SKU varsa mümkünse ürün sayfası; yoksa MPN ile arama. */
export function supplierUrl(id: SupplierId, sku: string | undefined, mpnFallback: string): string {
  const s = sku?.trim()
  if (s) {
    const direct = PRODUCT_URL[id]
    if (direct) return direct(s)
    return SEARCH_URL[id](s)
  }
  return SEARCH_URL[id](mpnFallback)
}

export function supplierIdsWithLink(skuMap: Partial<Record<SupplierId, string>> | undefined): SupplierId[] {
  return SUPPLIER_IDS.filter((id) => skuMap?.[id]?.trim())
}
