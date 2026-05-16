import { useId, useRef, useState, type ReactNode } from 'react'
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

export type EntryPanelTab = 'add' | 'excel'

type Props = {
  parts: Part[]
  onAddPart: (part: Part) => void
  onExcelMerged: (next: Part[], report: MergeReport, sourceFileName: string) => void
  readOnly?: boolean
  activeTab: EntryPanelTab
  onClose: () => void
}

function normMpn(s: string) {
  return s.trim().toLowerCase()
}

function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="ls-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export function SidebarInventory({
  parts,
  onAddPart,
  onExcelMerged,
  readOnly,
  activeTab,
  onClose,
}: Props) {
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

  const title = activeTab === 'add' ? 'Yeni parça' : 'Excel içe aktar'

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
        text: 'Bu MPN zaten listede. Tabloda + ile adet artırın veya Excel kullanın.',
      })
      return
    }

    const rawQty = String(quantity).trim().replace(/\s/g, '')
    if (!/^\d+$/.test(rawQty)) {
      setFormMsg({ type: 'err', text: 'Adet tam sayı olmalı (0 veya üzeri).' })
      return
    }
    const q = parseInt(rawQty, 10)

    onAddPart({
      mpn: m,
      category,
      description: description.trim() || '—',
      quantity: q,
      location: location.trim() || '—',
      footprint: footprint.trim() || undefined,
    })
    setFormMsg({ type: 'ok', text: 'Eklendi.' })
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
          parsed.errors.length ? 'Geçerli satır yok.' : 'İçe aktarılacak satır bulunamadı.',
        )
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      const consolidated = consolidateByMpn(parsed.parts)
      const { next, report } = mergePartsIntoInventory(parts, consolidated)
      onExcelMerged(next, report, f.name)
      const errHint = parsed.errors.length > 0 ? ` ${parsed.errors.length} satır atlandı.` : ''
      setImportMsg(`${report.added} yeni, ${report.updated} güncelleme.${errHint}`)
    } catch {
      setImportMsg('Dosya okunamadı.')
    }

    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section
      className={`ls-card flex max-h-[min(42vh,22rem)] shrink-0 flex-col overflow-hidden ${readOnly ? 'pointer-events-none opacity-60' : ''}`}
      aria-label={title}
    >
      <div className="flex items-center justify-between border-b border-ls-line px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-ls-text">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="ls-btn-ghost -mr-2 py-1.5"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {activeTab === 'add' ? (
        <form id={formId} className="p-4 sm:p-5" onSubmit={handleAddPart}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="MPN" required htmlFor={`${formId}-mpn`}>
              <input
                id={`${formId}-mpn`}
                value={mpn}
                onChange={(e) => setMpn(e.target.value)}
                className="ls-input"
                placeholder="LM358N"
                autoComplete="off"
              />
            </FormField>
            <FormField label="Kategori" required htmlFor={`${formId}-cat`}>
              <select
                id={`${formId}-cat`}
                value={category}
                onChange={(e) => setCategory(e.target.value as PartCategory)}
                className="ls-input cursor-pointer"
              >
                {CATEGORY_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_LABELS[k]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Açıklama" htmlFor={`${formId}-desc`}>
              <input
                id={`${formId}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ls-input"
                placeholder="Kısa tanım"
              />
            </FormField>
            <FormField label="Adet" required htmlFor={`${formId}-qty`}>
              <input
                id={`${formId}-qty`}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="ls-input"
              />
            </FormField>
            <FormField label="Konum" htmlFor={`${formId}-loc`}>
              <input
                id={`${formId}-loc`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="ls-input"
                placeholder="Kutu / raf"
              />
            </FormField>
            <FormField label="Paket" htmlFor={`${formId}-fp`}>
              <input
                id={`${formId}-fp`}
                value={footprint}
                onChange={(e) => setFootprint(e.target.value)}
                className="ls-input"
                placeholder="0603, DIP-8…"
              />
            </FormField>
          </div>

          {formMsg ? (
            <p
              className={`mt-3 text-sm ${formMsg.type === 'ok' ? 'text-ls-accent' : 'text-ls-danger'}`}
              role="status"
            >
              {formMsg.text}
            </p>
          ) : null}

          <FormActions onClose={onClose} readOnly={readOnly} />
        </form>
      ) : (
        <ExcelPanel
          fileRef={fileRef}
          readOnly={readOnly}
          importMsg={importMsg}
          importErrors={importErrors}
          onClose={onClose}
          onFile={(f) => void handleExcelFile(f)}
        />
      )}
      </div>
    </section>
  )
}

function FormActions({ onClose, readOnly }: { onClose: () => void; readOnly?: boolean }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="ls-btn-secondary">
        Kapat
      </button>
      <button type="submit" disabled={readOnly} className="ls-btn-primary">
        Listeye ekle
      </button>
    </div>
  )
}

function ExcelPanel({
  fileRef,
  readOnly,
  importMsg,
  importErrors,
  onClose,
  onFile,
}: {
  fileRef: React.RefObject<HTMLInputElement>
  readOnly?: boolean
  importMsg: string | null
  importErrors: ExcelRowError[]
  onClose: () => void
  onFile: (f: File | null) => void
}) {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <p className="text-sm text-ls-text-muted">
        Başlık:{' '}
        <span className="font-mono text-xs text-ls-text">
          MPN, Kategori, Açıklama, Adet, Konum, Paket
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => downloadExcelTemplate()} className="ls-btn-secondary">
          Şablon indir
        </button>
        <label className="ls-btn-primary cursor-pointer">
          <span>Dosya seç</span>
          <input
            ref={fileRef}
            type="file"
            disabled={readOnly}
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" onClick={onClose} className="ls-btn-ghost">
          Kapat
        </button>
      </div>
      {importMsg ? (
        <p className="text-sm text-ls-text-muted" role="status">
          {importMsg}
        </p>
      ) : null}
      {importErrors.length > 0 ? <ImportErrorList errors={importErrors} /> : null}
    </div>
  )
}

function ImportErrorList({ errors }: { errors: ExcelRowError[] }) {
  return (
    <div className="max-h-32 overflow-y-auto rounded-lg border border-ls-warn/30 bg-ls-warn-soft p-3 text-xs text-ls-warn">
      <p className="font-medium">Satır uyarıları</p>
      <ul className="mt-2 list-inside list-disc space-y-0.5">
        {errors.slice(0, 10).map((er, i) => (
          <li key={`${er.row}-${i}`}>
            Satır {er.row}: {er.message}
          </li>
        ))}
      </ul>
      {errors.length > 10 ? (
        <p className="mt-1 opacity-80">+{errors.length - 10} satır daha…</p>
      ) : null}
    </div>
  )
}
