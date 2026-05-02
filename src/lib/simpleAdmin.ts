import { LS_ADMIN_PIN_HASH, SS_ADMIN_UNLOCKED } from '@/lib/settingsKeys'

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getStoredPinHash(): string | null {
  try {
    const v = localStorage.getItem(LS_ADMIN_PIN_HASH)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function setStoredPinHash(hash: string): void {
  localStorage.setItem(LS_ADMIN_PIN_HASH, hash)
}

export function clearStoredPinHash(): void {
  localStorage.removeItem(LS_ADMIN_PIN_HASH)
}

export function isAdminSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(SS_ADMIN_UNLOCKED) === '1'
  } catch {
    return false
  }
}

export function setAdminSessionUnlocked(): void {
  sessionStorage.setItem(SS_ADMIN_UNLOCKED, '1')
}

export function clearAdminSessionUnlock(): void {
  sessionStorage.removeItem(SS_ADMIN_UNLOCKED)
}

/** PIN tanımlı değilse herkes yönetici kabul edilir. */
export function isViewerMode(pinHash: string | null, sessionUnlocked: boolean): boolean {
  if (!pinHash) return false
  return !sessionUnlocked
}
