import { useId, useRef, useState } from 'react'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type Part,
  type PartCategory,
} from '@/data/sampleParts'
import {
  consolidateByMpn,
  downloadExcelTemplate,
  mergePartsIntoInventory,
  parseExcelBuffer,
  type ExcelRowError,
  type MergeReport,
} from '@/lib/excel'

type Props = {
  parts: Part[]
  onAddPart: (part: Part) => void
  onExcelMerged: (next: Part[], report: MergeReport, sourceFileName: string) => void
  readOnly?: boolean
}

function normMpn(s: string) {
  return s.trim().toLowerCase()
}

export function SidebarInventory({ parts, onAddPart, onExcelMerged, readOnly }: Props) {
  const formId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mpn, setMpn] = useState('')
  const [category, setCategory] = useState<PartCategory>('resistor')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [location, setLocation] = useState('')
  const [footprint, setFootprint] = useState('')

  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<ExcelRowError[]>([])

  const fieldClass =
    'mt-1 w-full rounded-xl border border-ls-line bg-ls-surface px-3 py-2.5 text-sm text-slate-900 shadow-card placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15'
  const labelClass = 'text-2xs font-semibold uppercase tracking-[0.06em] text-slate-500'

  function handleAddPart(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    setFormMsg(null)

    const m = mpn.trim()
    if (!m) {
      setFormMsg({ type: 'err', text: 'MPN zorunlu.' })
      return
    }
    if (parts.some((p) => normMpn(p.mpn) === normMpn(m))) {
      setFormMsg({
        type: 'err',
        text: 'Bu MPN zaten listede. Adet artırmak için Kayıt tablosunda + kullanın veya Excel ile içe aktarın.',
      })
      return
    }

    const rawQty = String(quantity).trim().replace(/\s/g, '')
    if (!/^\d+$/.test(rawQty)) {
      setFormMsg({ type: 'err', text: 'Adet 0 veya daha büyük bir tam sayı olmalı (ondalık yok).' })
      return
    }
    const q = parseInt(rawQty, 10)

    const part: Part = {
      mpn: m,
      category,
      description: description.trim() || '—',
      quantity: q,
      location: location.trim() || '—',
      footprint: footprint.trim() || undefined,
    }

    onAddPart(part)
    setFormMsg({ type: 'ok', text: 'Parça eklendi.' })
    setMpn('')
    setDescription('')
    setQuantity('1')
    setLocation('')
    setFootprint('')
  }

  async function handleExcelFile(f: File | null) {
    if (readOnly) return
    setImportMsg(null)
    setImportErrors([])
    if (!f) return

    const lower = f.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setImportMsg('Yalnızca .xlsx veya .xls seçin.')
      return
    }

    try {
      const buf = await f.arrayBuffer()
      const parsed = parseExcelBuffer(buf)
      setImportErrors(parsed.errors)

      if (parsed.parts.length === 0) {
        setImportMsg(
          parsed.errors.length
            ? 'Geçerli satır yok. Ayrıntılar aşağıda.'
            : 'Dosyada içe aktarılacak satır bulunamadı.',
        )
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      const consolidated = consolidateByMpn(parsed.parts)
      const { next, report } = mergePartsIntoInventory(parts, consolidated)
      onExcelMerged(next, report, f.name)

      const errHint =
        parsed.errors.length > 0 ? ` ${parsed.errors.length} satır hata nedeniyle atlandı.` : ''
      setImportMsg(
        `İçe aktarma tamam: ${report.added} yeni, ${report.updated} güncelleme (aynı MPN adet birleştirildi).${errHint}`,
      )
    } catch {
      setImportMsg('Dosya okunamadı. Dosyanın bozuk olmadığından emin olun.')
    }

    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-ls-line bg-gradient-to-b from-white via-ls-sidebar to-slate-50/50 lg:w-[340px] lg:shrink-0 lg:border-r">
      <div className="border-b border-ls-line bg-white/90 px-5 py-4 backdrop-blur-sm">
        <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-teal-700/80">Panel</p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Stok kaydı</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {readOnly ? 'Salt okunur: yalnızca listeyi görüntüleyebilirsiniz.' : 'Tek parça veya Excel ile toplu aktarım.'}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <section className={`ls-card p-4 ${readOnly ? 'pointer-events-none opacity-55' : ''}`}>
          <h3 className="text-sm font-semibold text-slate-900">Yeni malzeme</h3>
          <form id={formId} className="mt-4 space-y-3" onSubmit={handleAddPart}>
            <div>
              <label className={labelClass} htmlFor={`${formId}-mpn`}>
                MPN <span className="text-red-600">*</span>
              </label>
              <input
                id={`${formId}-mpn`}
                value={mpn}
                onChange={(e) => setMpn(e.target.value)}
                className={fieldClass}
                placeholder="Örn. LM358N"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`${formId}-cat`}>
                Kategori <span className="text-red-600">*</span>
              </label>
              <select
                id={`${formId}-cat`}
                value={category}
                onChange={(e) => setCategory(e.target.value as PartCategory)}
                className={`${fieldClass} cursor-pointer`}
              >
                {CATEGORY_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={`${formId}-desc`}>
                Açıklama
              </label>
              <input
                id={`${formId}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={fieldClass}
                placeholder="Kısa tanım"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor={`${formId}-qty`}>
                  Adet <span className="text-red-600">*</span>
                </label>
                <input
                  id={`${formId}-qty`}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`${formId}-loc`}>
                  Konum
                </label>
                <input
                  id={`${formId}-loc`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={fieldClass}
                  placeholder="Kutu / raf"
                />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor={`${formId}-fp`}>
                Paket
              </label>
              <input
                id={`${formId}-fp`}
                value={footprint}
                onChange={(e) => setFootprint(e.target.value)}
                className={fieldClass}
                placeholder="0603, DIP-8…"
              />
            </div>

            {formMsg && (
              <p
                className={`text-xs font-medium ${formMsg.type === 'ok' ? 'text-teal-700' : 'text-red-600'}`}
                role="status"
              >
                {formMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={readOnly}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-teal-500/35 disabled:opacity-40"
            >
              Listeye ekle
            </button>
          </form>
        </section>

        <section className="mt-5 ls-card p-4">
          <h3 className="text-sm font-semibold text-slate-900">Excel ile içe aktar</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            İlk satır başlık olmalı:{' '}
            <span className="font-mono text-xs text-slate-800">MPN, Kategori, Açıklama, Adet, Konum, Paket</span>.
            Kategori sütununda Türkçe adlar (ör. Direnç, Entegre) veya İngilizce anahtarlar kullanılabilir.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => downloadExcelTemplate()}
              className="w-full rounded-xl border border-ls-line bg-slate-50 py-2.5 text-sm font-semibold text-slate-800 shadow-card transition hover:border-slate-300 hover:bg-white"
            >
              Örnek şablon indir (.xlsx)
            </button>
            <label className={`block ${readOnly ? 'opacity-50' : ''}`}>
              <span className="sr-only">Excel dosyası seç</span>
              <input
                ref={fileRef}
                type="file"
                disabled={readOnly}
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="block w-full cursor-pointer text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:shadow-bubble hover:file:brightness-110 disabled:cursor-not-allowed"
                onChange={(e) => void handleExcelFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {importMsg && (
            <p className="mt-3 text-xs font-medium leading-relaxed text-slate-700" role="status">
              {importMsg}
            </p>
          )}

          {importErrors.length > 0 && (
            <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Satır uyarıları</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-amber-900">
                {importErrors.slice(0, 12).map((er, i) => (
                  <li key={`${er.row}-${i}`}>
                    Satır {er.row}: {er.message}
                  </li>
                ))}
              </ul>
              {importErrors.length > 12 && (
                <p className="mt-2 text-[11px] font-medium text-amber-800">+{importErrors.length - 12} satır daha…</p>
              )}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
