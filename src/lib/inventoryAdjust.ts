import type { Part } from '@/data/sampleParts'

/** MPN eşleşen satırda adeti delta kadar değiştirir; sonuç 0’ın altına inmez. */
export function adjustQuantityByMpn(parts: Part[], mpn: string, delta: number): Part[] {
  const key = mpn.trim().toLowerCase()
  const next = parts.map((p) => {
    if (p.mpn.trim().toLowerCase() !== key) return p
    const q = Math.max(0, p.quantity + delta)
    return { ...p, quantity: q }
  })
  return [...next].sort((a, b) => a.mpn.localeCompare(b.mpn, 'tr'))
}
