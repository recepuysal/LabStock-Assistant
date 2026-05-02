/** API anahtarı gerektirmeyen arama / ürün sayfası derin bağlantıları (MPN sorgusu). */

export function lcscSearchUrl(mpn: string): string {
  return `https://www.lcsc.com/search?q=${encodeURIComponent(mpn.trim())}`
}

export function mouserSearchUrl(mpn: string): string {
  return `https://www.mouser.com/c/?q=${encodeURIComponent(mpn.trim())}`
}

export function digikeySearchUrl(mpn: string): string {
  return `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(mpn.trim())}`
}
