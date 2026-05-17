import { TERM_EXPANSIONS } from '@/data/termExpansions'
import { CATEGORY_LABELS, type Part } from '@/data/sampleParts'
import { haystackForPart, meaningfulTokens } from '@/lib/partFilters'

const MUADIL_HINT =
  /muadil|alternatif|yerine|benzer|eşdeğer|esdeger|eş değer|ne kullan|öner|önerir|tavsiye|başka|baska|ekvivalent/i

const STOCK_SUMMARY_HINT =
  /kaç\s*(farklı\s*)?parça|stok\s*özeti|toplam\s*stok|envanter\s*özeti|genel\s*(stok\s*)?durum|stokta\s*ne\s*var|özet\s*ver/i

const LOW_STOCK_HINT =
  /kritik|azalan|biten|tüken|tuken|stokta\s*yok|düşük\s*stok|az\s*kalan|0\s*adet|sipariş\s*gerek/i

const LOW_QTY_THRESHOLD = 3

function tryAggregateReply(parts: Part[], raw: string): LocalAssistantResult | null {
  const queryPreview = raw.length > 72 ? `${raw.slice(0, 72)}…` : raw

  if (STOCK_SUMMARY_HINT.test(raw)) {
    const total = parts.length
    if (total === 0) {
      return {
        kind: 'empty',
        message: 'Henüz kayıtlı parça yok. Kayıt ekranından stok ekleyin; ardından özet soruları sorabilirsiniz.',
      }
    }
    const outOfStock = parts.filter((p) => p.quantity <= 0)
    const low = parts.filter((p) => p.quantity > 0 && p.quantity <= LOW_QTY_THRESHOLD)
    const byCat = new Map<string, number>()
    for (const p of parts) {
      const label = CATEGORY_LABELS[p.category]
      byCat.set(label, (byCat.get(label) ?? 0) + 1)
    }
    const catLines = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, n]) => `• ${k}: ${n} parça`)

    const summary =
      total === 0
        ? 'Henüz kayıtlı parça yok. Kayıt ekranından ekleyebilirsiniz.'
        : `Depoda **${total}** kayıtlı parça var. **${outOfStock.length}** tanesi bitti (0 adet), **${low.length}** tanesi düşük stok (≤${LOW_QTY_THRESHOLD} adet).`

    const topMatches = [...parts]
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 6)
      .map((part) => ({ part, score: 1 }))

    return {
      kind: 'ok',
      summary,
      queryPreview,
      topMatches,
      related: [],
      footnote:
        catLines.length > 0
          ? `Kategori dağılımı:\n${catLines.join('\n')}\n\nÜcretsiz yerel özet; doğal dil için Ayarlar’dan isteğe bağlı Groq/Gemini eklenebilir.`
          : 'Ücretsiz yerel özet; doğal dil için Ayarlar’dan isteğe bağlı Groq/Gemini eklenebilir.',
    }
  }

  if (LOW_STOCK_HINT.test(raw)) {
    const critical = parts
      .filter((p) => p.quantity <= LOW_QTY_THRESHOLD)
      .sort((a, b) => a.quantity - b.quantity)

    if (critical.length === 0) {
      return {
        kind: 'no_match',
        message: `Şu an ≤${LOW_QTY_THRESHOLD} adet veya bitmiş parça görünmüyor.`,
        hints: ['Kayıt tablosunda adetleri güncelleyin.', 'Farklı bir MPN veya kategori arayın.'],
      }
    }

    const summary = `**${critical.length}** parça kritik veya bitmiş (≤${LOW_QTY_THRESHOLD} adet veya 0).`
    const topMatches = critical.slice(0, 8).map((part) => ({ part, score: 1 }))
    const related = critical.slice(8, 14).map((part) => ({ part, score: 0.5 }))

    return {
      kind: 'ok',
      summary,
      queryPreview,
      topMatches,
      related,
      footnote: 'Yerel liste; sipariş kararı için Kayıt ekranından doğrulayın.',
    }
  }

  return null
}

export type LocalAssistantResult =
  | { kind: 'empty'; message: string }
  | { kind: 'no_match'; message: string; hints: string[] }
  | {
      kind: 'ok'
      /** Kısa Türkçe özet cümlesi */
      summary: string
      /** Kullanıcı sorusunun kısaltılmış etiketi */
      queryPreview: string
      topMatches: Array<{ part: Part; score: number }>
      /** Birincil listede olmayan, skoru yeterli ilgili satırlar */
      related: Array<{ part: Part; score: number }>
      footnote: string
    }

function expandSearchTerms(tokens: string[]): string[] {
  const out = new Set<string>()
  for (const t of tokens) {
    const lc = t.toLocaleLowerCase('tr-TR')
    if (lc.length < 2) continue
    out.add(lc)
    const direct = TERM_EXPANSIONS[lc]
    if (direct) {
      for (const e of direct) out.add(e.toLocaleLowerCase('tr-TR'))
    }
    for (const [key, vals] of Object.entries(TERM_EXPANSIONS)) {
      if (vals.some((v) => v.toLocaleLowerCase('tr-TR') === lc)) {
        out.add(key.toLocaleLowerCase('tr-TR'))
        for (const e of vals) out.add(e.toLocaleLowerCase('tr-TR'))
      }
    }
  }
  return [...out]
}

export function scorePartForAssistant(part: Part, terms: string[]): number {
  if (terms.length === 0) return 0
  const mpn = part.mpn.toLocaleLowerCase('tr-TR')
  const desc = part.description.toLocaleLowerCase('tr-TR')
  const hay = haystackForPart(part)
  let s = 0
  for (const t of terms) {
    if (!t || t.length < 2) continue
    if (mpn.includes(t)) s += 8
    else if (desc.includes(t)) s += 4
    else if (hay.includes(t)) s += 1.5
  }
  return s
}

function tokensFromMessage(raw: string): string[] {
  let tokens = meaningfulTokens(raw)
  if (tokens.length === 0) {
    tokens = raw
      .toLocaleLowerCase('tr-TR')
      .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2)
  }
  return tokens
}

/**
 * Yapılandırılmış yerel asistan çıktısı (arayüz ve isteğe bağlı metin birleştirme için).
 */
export function buildLocalAssistantResult(parts: Part[], userMessage: string): LocalAssistantResult {
  const raw = userMessage.trim()
  if (!raw) {
    return {
      kind: 'empty',
      message: 'Bir soru veya parça adı yazın; depodaki kayıtlara göre özet çıkarırım.',
    }
  }

  const aggregate = tryAggregateReply(parts, raw)
  if (aggregate) return aggregate

  const tokens = tokensFromMessage(raw)
  const terms = expandSearchTerms(tokens)
  const wantMuadil = MUADIL_HINT.test(raw)

  const scored = parts
    .map((p) => ({ part: p, score: scorePartForAssistant(p, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const queryPreview = raw.length > 72 ? `${raw.slice(0, 72)}…` : raw

  if (scored.length === 0) {
    return {
      kind: 'no_match',
      message: `“${queryPreview}” için depoda anlamlı bir eşleşme bulamadım.`,
      hints: [
        'Kayıt ekranında MPN veya daha kısa anahtar kelime deneyin.',
        '«Stokta kaç parça var?» veya «Kritik stok» gibi genel sorular da sorulabilir.',
        'İsteğe bağlı: Ayarlar’dan Groq/Gemini ile daha doğal dil yanıtı.',
      ],
    }
  }

  const topScore = scored[0]!.score
  const primaryLimit = 6
  const primary = scored.slice(0, primaryLimit)
  const primaryMpns = new Set(primary.map((x) => x.part.mpn))

  const minRelated = wantMuadil ? Math.max(2, topScore * 0.22) : Math.max(2.5, topScore * 0.35)

  const related = scored
    .filter((x) => !primaryMpns.has(x.part.mpn) && x.score >= minRelated)
    .slice(0, 5)

  const top = primary[0]!.part
  const topQty = top.quantity <= 0 ? 'stokta yok (0)' : `${top.quantity} adet`
  const extraCount = primary.length > 1 ? ` Listede ${primary.length} güçlü satır var.` : ''

  const summary = `“${queryPreview}” aramanızda öne çıkan kayıt ${top.mpn} (${topQty}, ${top.location}).${extraCount}`

  return {
    kind: 'ok',
    summary,
    queryPreview,
    topMatches: primary,
    related,
    footnote:
      'Muadil ve ilgili satırlar yalnızca stok metni ve skora dayanır; gerçek işlevsel muadil için datasheet ve şemayı doğrulayın.',
  }
}

/** Gemini ile birleştirmek için düz metin (geriye dönük). */
export function localInventoryAssistantReply(parts: Part[], userMessage: string): string {
  const r = buildLocalAssistantResult(parts, userMessage)
  if (r.kind === 'empty') return r.message
  if (r.kind === 'no_match') {
    return [r.message, '', ...r.hints.map((h) => `• ${h}`)].join('\n')
  }

  const lines: string[] = [
    r.summary,
    '',
    'Öne çıkan eşleşmeler:',
    ...r.topMatches.map(({ part: p }) => formatLinePlain(p)),
  ]
  if (r.related.length > 0) {
    lines.push('', 'İlgili diğer stok (skor eşiği geçen):', ...r.related.map(({ part: p }) => formatLinePlain(p)))
  }
  lines.push('', r.footnote)
  return lines.join('\n')
}

function formatLinePlain(p: Part): string {
  const kat = CATEGORY_LABELS[p.category]
  const fp = p.footprint ? ` · ${p.footprint}` : ''
  const qty = p.quantity <= 0 ? '0 (bitti)' : `${p.quantity} adet`
  return `• ${p.mpn} — ${p.description} — ${kat} — ${qty} — ${p.location}${fp}`
}
