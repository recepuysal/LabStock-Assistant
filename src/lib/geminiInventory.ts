import { CATEGORY_LABELS, type Part } from '@/data/sampleParts'

/** Model için kompakt stok özeti (token tasarrufu) */
export function inventoryJsonForGemini(parts: Part[]): string {
  const rows = parts.map((p) => ({
    mpn: p.mpn,
    kategori: CATEGORY_LABELS[p.category],
    adet: p.quantity,
    aciklama: p.description,
    konum: p.location,
    ...(p.footprint ? { pcb: p.footprint } : {}),
    ...(p.supplierSkus && Object.keys(p.supplierSkus).length > 0 ? { supplierSkus: p.supplierSkus } : {}),
  }))
  return JSON.stringify(rows)
}

export function geminiSystemInstruction(inventoryJson: string): string {
  return [
    'Sen LabStock adlı elektronik bileşen envanteri asistanısın.',
    '',
    'KURALLAR:',
    '- Yanıtları her zaman Türkçe yaz; kısa ve net ol.',
    '- Aşağıdaki JSON tek gerçek stok kaynağıdır. Sorulara yalnızca buna dayanarak cevap ver.',
    '- Listede olmayan parça için uydurma; açıkça yok de.',
    '- Stok sorularında mümkünse MPN ve adet belirt.',
    '- Belirsiz sorularda hangi alanlara bakılabileceğini kısaca söyle (MPN, kategori, konum).',
    '',
    'STOK JSON:',
    inventoryJson,
  ].join('\n')
}
