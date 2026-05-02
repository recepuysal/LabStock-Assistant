import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SAMPLE_PARTS, type Part } from '@/data/sampleParts'
import type { MergeReport } from '@/lib/excel'
import { adjustQuantityByMpn } from '@/lib/inventoryAdjust'
import {
  LAB_DATA_LOCALSTORAGE_KEY,
  newAuditId,
  parsePersistedLabJson,
  serializeLabData,
  trimAudit,
  type AuditEntry,
} from '@/lib/labData'
import { LS_ACTOR_LABEL } from '@/lib/settingsKeys'

const SAVE_DEBOUNCE_MS = 450

function readActorLabel(): string {
  try {
    return localStorage.getItem(LS_ACTOR_LABEL)?.trim() || 'Yerel kullanıcı'
  } catch {
    return 'Yerel kullanıcı'
  }
}

async function loadRawFromStores(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.labstock?.persistenceLoad) {
    const r = await window.labstock.persistenceLoad()
    if (r.ok && r.data) return r.data
    if (!r.ok) console.warn('[LabStock] Kalıcı dosya okunamadı:', r.error)
  }
  try {
    return localStorage.getItem(LAB_DATA_LOCALSTORAGE_KEY)
  } catch {
    return null
  }
}

async function saveRawEverywhere(json: string): Promise<void> {
  try {
    localStorage.setItem(LAB_DATA_LOCALSTORAGE_KEY, json)
  } catch (e) {
    console.warn('[LabStock] localStorage yazılamadı:', e)
  }
  if (typeof window !== 'undefined' && window.labstock?.persistenceSave) {
    const r = await window.labstock.persistenceSave(json)
    if (!r.ok) console.warn('[LabStock] Dosyaya yazılamadı:', r.error)
  }
}

export type InventoryContextValue = {
  parts: Part[]
  audit: AuditEntry[]
  actorLabel: string
  setActorLabel: (v: string) => void
  hydrated: boolean
  applyQuantityDelta: (mpn: string, delta: number) => void
  addPart: (part: Part) => void
  applyExcelMerge: (next: Part[], report: MergeReport, sourceFileName: string) => void
  restoreFromBackupJson: (json: string) => { ok: true } | { ok: false; error: string }
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Part[]>(() => [...SAMPLE_PARTS])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [actorLabel, setActorLabelState] = useState<string>(() => readActorLabel())
  const [hydrated, setHydrated] = useState(false)

  const actorRef = useRef(actorLabel)
  actorRef.current = actorLabel

  const setActorLabel = useCallback((v: string) => {
    const t = v.trim() || 'Yerel kullanıcı'
    setActorLabelState(t)
    try {
      localStorage.setItem(LS_ACTOR_LABEL, t)
    } catch {
      /* yoksay */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const raw = await loadRawFromStores()
      if (cancelled) return
      if (raw) {
        const parsed = parsePersistedLabJson(raw)
        if (parsed) {
          setParts(parsed.parts)
          setAudit(trimAudit(parsed.audit))
          if (parsed.actor?.trim()) {
            setActorLabelState(parsed.actor.trim())
            try {
              localStorage.setItem(LS_ACTOR_LABEL, parsed.actor.trim())
            } catch {
              /* yoksay */
            }
          }
        }
      }
      setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!hydrated) return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const json = serializeLabData(parts, audit, actorRef.current)
      void saveRawEverywhere(json)
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [parts, audit, hydrated, actorLabel])

  const appendAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'at'> & Partial<Pick<AuditEntry, 'id' | 'at'>>) => {
    const full: AuditEntry = {
      id: entry.id ?? newAuditId(),
      at: entry.at ?? new Date().toISOString(),
      mpn: entry.mpn,
      delta: entry.delta,
      quantityAfter: entry.quantityAfter,
      actor: entry.actor,
      action: entry.action,
      note: entry.note,
    }
    setAudit((prev) => trimAudit([...prev, full]))
  }, [])

  const applyQuantityDelta = useCallback(
    (mpn: string, delta: number) => {
      if (!delta) return
      const actor = actorRef.current
      setParts((prev) => {
        const key = mpn.trim().toLowerCase()
        const before = prev.find((p) => p.mpn.trim().toLowerCase() === key)
        const next = adjustQuantityByMpn(prev, mpn, delta)
        const after = next.find((p) => p.mpn.trim().toLowerCase() === key)
        const quantityAfter = after?.quantity ?? 0
        queueMicrotask(() => {
          appendAudit({
            mpn: before?.mpn ?? mpn,
            delta,
            quantityAfter,
            actor,
            action: 'delta',
          })
        })
        return next
      })
    },
    [appendAudit],
  )

  const addPart = useCallback(
    (part: Part) => {
      const actor = actorRef.current
      setParts((prev) => {
        const next = [...prev, part].sort((a, b) => a.mpn.localeCompare(b.mpn, 'tr'))
        queueMicrotask(() => {
          appendAudit({
            mpn: part.mpn,
            delta: part.quantity,
            quantityAfter: part.quantity,
            actor,
            action: 'add_part',
            note: 'Listeye eklendi',
          })
        })
        return next
      })
    },
    [appendAudit],
  )

  const applyExcelMerge = useCallback(
    (next: Part[], report: MergeReport, sourceFileName: string) => {
      const actor = actorRef.current
      setParts(next)
      queueMicrotask(() => {
        appendAudit({
          mpn: '—',
          delta: 0,
          quantityAfter: next.length,
          actor,
          action: 'excel_import',
          note: `${sourceFileName}: ${report.added} yeni, ${report.updated} güncelleme`,
        })
      })
    },
    [appendAudit],
  )

  const restoreFromBackupJson = useCallback(
    (json: string): { ok: true } | { ok: false; error: string } => {
      const parsed = parsePersistedLabJson(json)
      if (!parsed) return { ok: false, error: 'Geçersiz veya uyumsuz yedek dosyası.' }
      const actor = actorRef.current
      const importEntry: AuditEntry = {
        id: newAuditId(),
        at: new Date().toISOString(),
        mpn: '—',
        delta: 0,
        quantityAfter: parsed.parts.length,
        actor,
        action: 'json_import',
        note: 'Yedek dosyasından geri yükleme',
      }
      const mergedAudit = trimAudit([...parsed.audit, importEntry])
      const actorForSave = parsed.actor?.trim() || actorRef.current
      setParts(parsed.parts)
      setAudit(mergedAudit)
      if (parsed.actor?.trim()) {
        setActorLabel(parsed.actor.trim())
      }
      void saveRawEverywhere(serializeLabData(parsed.parts, mergedAudit, actorForSave))
      return { ok: true }
    },
    [setActorLabel],
  )

  const value = useMemo(
    () => ({
      parts,
      audit,
      actorLabel,
      setActorLabel,
      hydrated,
      applyQuantityDelta,
      addPart,
      applyExcelMerge,
      restoreFromBackupJson,
    }),
    [
      parts,
      audit,
      actorLabel,
      setActorLabel,
      hydrated,
      applyQuantityDelta,
      addPart,
      applyExcelMerge,
      restoreFromBackupJson,
    ],
  )

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function useInventory() {
  const ctx = useContext(InventoryContext)
  if (!ctx) throw new Error('useInventory yalnızca InventoryProvider içinde kullanılabilir.')
  return ctx
}
