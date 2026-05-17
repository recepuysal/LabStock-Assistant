import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type Part,
  type PartCategory,
} from '@/data/sampleParts'
import { SupplierSkuFields } from '@/components/SupplierSkuFields'
import { compactSupplierSkus, SUPPLIER_IDS, SUPPLIER_LABELS, type SupplierSkus } from '@/data/suppliers'
import {
  consolidateByMpn,
  downloadExcelTemplate,
  mergePartsIntoInventory,
  parseExcelBuffer,
  type ExcelRowError,
  type MergeReport,
} from '@/lib/excel'
import { fetchPartFromSupplierUrl } from '@/lib/supplierImport'

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
  const [supplierSkus, setSupplierSkus] = useState<SupplierSkus>({})
  const [supplierUrl, setSupplierUrl] = useState('')
  const [supplierImporting, setSupplierImporting] = useState(false)

  const [formMsg, setFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<ExcelRowError[]>([])

  const title = activeTab === 'add' ? 'Yeni parça' : 'Excel içe aktar'
  const titleId = `${formId}-entry-title`

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
      supplierSkus: compactSupplierSkus(supplierSkus),
    })
    setFormMsg({ type: 'ok', text: 'Eklendi.' })
    setMpn('')
    setDescription('')
    setQuantity('1')
    setLocation('')
    setFootprint('')
    setSupplierSkus({})
    setSupplierUrl('')
  }

  async function handleSupplierImport() {
    if (readOnly || supplierImporting) return
    setFormMsg(null)
    const url = supplierUrl.trim()
    if (!url) {
      setFormMsg({
        type: 'err',
        text: 'LCSC, DigiKey, Farnell, Mouser veya TME ürün bağlantısı yapıştırın.',
      })
      return
    }
    setSupplierImporting(true)
    try {
      const res = await fetchPartFromSupplierUrl(url)
      if (!res.ok) {
        setFormMsg({ type: 'err', text: res.error })
        return
      }
      const { data } = res
      setMpn(data.mpn)
      setCategory(data.category)
      setDescription(data.description)
      if (data.footprint) setFootprint(data.footprint)
      setSupplierSkus((prev) => ({ ...prev, ...data.supplierSkus }))
      setFormMsg({
        type: 'ok',
        text: 'Tedarikçi bilgileri dolduruldu. Adet ve konumu siz girin.',
      })
    } finally {
      setSupplierImporting(false)
    }
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
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`ls-card flex max-h-[min(92vh,40rem)] w-full flex-col overflow-hidden rounded-t-2xl sm:rounded-xl ${
          activeTab === 'add' ? 'max-w-3xl' : 'max-w-lg'
        } ${readOnly ? 'pointer-events-none opacity-60' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ls-line px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ls-text-muted">
              Stok envanteri
            </p>
            <h2 id={titleId} className="mt-0.5 text-base font-semibold text-ls-text">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ls-btn-ghost -mr-1 shrink-0 px-2 py-1.5 text-lg leading-none"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {activeTab === 'add' ? (
        <form id={formId} className="p-4 sm:p-5" onSubmit={handleAddPart}>
          <div className="mb-4 rounded-lg border border-ls-line bg-ls-muted/40 p-3">
            <p className="text-xs font-medium text-ls-text">Tedarikçiden doldur</p>
            <p className="mt-0.5 text-xs text-ls-text-muted">
              LCSC, DigiKey, Farnell, Mouser veya TME ürün sayfası bağlantısı; MPN, açıklama ve
              tedarikçi kodu otomatik gelir.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={supplierUrl}
                onChange={(e) => setSupplierUrl(e.target.value)}
                className="ls-input min-w-0 flex-1 font-mono text-xs"
                placeholder="https://www.lcsc.com/product-detail/C160402.html veya DigiKey / Mouser / …"
                autoComplete="off"
                disabled={supplierImporting}
              />
              <button
                type="button"
                disabled={readOnly || supplierImporting}
                onClick={() => void handleSupplierImport()}
                className="ls-btn-secondary shrink-0 whitespace-nowrap"
              >
                {supplierImporting ? 'Çekiliyor…' : 'Siteden doldur'}
              </button>
            </div>
          </div>
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

          <div className="mt-4">
            <SupplierSkuFields
              idPrefix={formId}
              value={supplierSkus}
              onChange={setSupplierSkus}
              disabled={readOnly}
            />
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
      </div>
    </div>
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
          MPN, Kategori, Açıklama, Adet, Konum, Paket, {SUPPLIER_IDS.map((id) => SUPPLIER_LABELS[id]).join(', ')}
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
