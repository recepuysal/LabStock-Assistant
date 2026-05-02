import { CATEGORY_LABELS, type Part, type PartCategory } from '@/data/sampleParts'

export type CategoryFilter = 'all' | PartCategory

/** Doğal dil sorularındaki gereksiz kelimeler (örn. "arduino var mı stokta" → yalnızca "arduino") */
const QUERY_STOPWORDS_TR = new Set(
  [
    'var',
    'varmi',
    'varmı',
    'mi',
    'mı',
    'mu',
    'mü',
    'mıdır',
    'midir',
    'mudur',
    'müdur',
    'da',
    'de',
    'ta',
    'te',
    'için',
    'icin',
    'ile',
    've',
    'veya',
    'bir',
    'bu',
    'şu',
    'su',
    'o',
    'acaba',
    'daha',
    'en',
    'çok',
    'cok',
    'gibi',
    'kadar',
    'hangi',
    'nedir',
    'nerede',
    'neyde',
    'elimde',
    'bende',
    'stokta',
    'stok',
    'kayıtta',
    'kayitta',
  ].map((w) => w.toLocaleLowerCase('tr-TR')),
)

export function haystackForPart(part: Part): string {
  const label = CATEGORY_LABELS[part.category]
  return [part.mpn, part.description, part.location, part.footprint ?? '', label]
    .join(' ')
    .toLocaleLowerCase('tr-TR')
}

export function meaningfulTokens(raw: string): string[] {
  const s = raw.trim().toLocaleLowerCase('tr-TR')
  if (!s) return []
  return s
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !QUERY_STOPWORDS_TR.has(t))
}

export function matchesQuery(part: Part, q: string): boolean {
  const raw = q.trim()
  if (!raw) return true

  const hay = haystackForPart(part)
  const phrase = raw.toLocaleLowerCase('tr-TR')

  if (hay.includes(phrase)) return true

  const tokens = meaningfulTokens(raw)
  if (tokens.length === 0) return true

  return tokens.every((t) => hay.includes(t.toLocaleLowerCase('tr-TR')))
}
