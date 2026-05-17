import { SUPPLIER_IDS } from '@/data/suppliers'
import { CATEGORY_ORDER, type Part, type PartCategory } from '@/data/sampleParts'

export const LAB_DATA_VERSION = 1 as const
export const LAB_DATA_LOCALSTORAGE_KEY = 'labstock.data.v1'
export const MAX_AUDIT_ENTRIES = 500

export type AuditAction = 'delta' | 'add_part' | 'excel_import' | 'json_import' | 'replace_all'

export type AuditEntry = {
  id: string
  at: string
  mpn: string
  delta: number
  quantityAfter: number
  actor: string
  action: AuditAction
  note?: string
}

export type PersistedLabDataV1 = {
  version: typeof LAB_DATA_VERSION
  savedAt?: string
  actor?: string
  parts: Part[]
  audit: AuditEntry[]
}

function isPartCategory(x: unknown): x is PartCategory {
  return typeof x === 'string' && (CATEGORY_ORDER as string[]).includes(x)
}

function isPart(x: unknown): x is Part {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.mpn !== 'string' || !o.mpn.trim()) return false
  if (!isPartCategory(o.category)) return false
  if (typeof o.description !== 'string') return false
  if (typeof o.quantity !== 'number' || !Number.isFinite(o.quantity) || o.quantity < 0 || !Number.isInteger(o.quantity))
    return false
  if (typeof o.location !== 'string') return false
  if (o.footprint !== undefined && typeof o.footprint !== 'string') return false
  if (o.supplierSkus !== undefined) {
    if (!o.supplierSkus || typeof o.supplierSkus !== 'object') return false
    const sk = o.supplierSkus as Record<string, unknown>
    for (const key of Object.keys(sk)) {
      if (typeof sk[key] !== 'string') return false
    }
  }
  return true
}

function isAuditEntry(x: unknown): x is AuditEntry {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  if (typeof o.at !== 'string') return false
  if (typeof o.mpn !== 'string') return false
  if (typeof o.delta !== 'number' || !Number.isFinite(o.delta)) return false
  if (typeof o.quantityAfter !== 'number' || !Number.isFinite(o.quantityAfter) || o.quantityAfter < 0) return false
  if (typeof o.actor !== 'string') return false
  const a = o.action
  if (
    a !== 'delta' &&
    a !== 'add_part' &&
    a !== 'excel_import' &&
    a !== 'json_import' &&
    a !== 'replace_all'
  )
    return false
  if (o.note !== undefined && typeof o.note !== 'string') return false
  return true
}

export function parsePersistedLabJson(raw: string): PersistedLabDataV1 | null {
  try {
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return null
    const o = data as Record<string, unknown>
    if (o.version !== LAB_DATA_VERSION) return null
    if (!Array.isArray(o.parts) || !o.parts.every(isPart)) return null
    const auditRaw = o.audit
    const audit = Array.isArray(auditRaw) && auditRaw.every(isAuditEntry) ? auditRaw : []
    const actor = typeof o.actor === 'string' ? o.actor : undefined
    return {
      version: LAB_DATA_VERSION,
      savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined,
      actor,
      parts: o.parts as Part[],
      audit,
    }
  } catch {
    return null
  }
}

export function serializeLabData(parts: Part[], audit: AuditEntry[], actor: string): string {
  const payload: PersistedLabDataV1 = {
    version: LAB_DATA_VERSION,
    savedAt: new Date().toISOString(),
    actor,
    parts,
    audit: audit.slice(-MAX_AUDIT_ENTRIES),
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function trimAudit(audit: AuditEntry[]): AuditEntry[] {
  if (audit.length <= MAX_AUDIT_ENTRIES) return audit
  return audit.slice(-MAX_AUDIT_ENTRIES)
}

export function newAuditId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
