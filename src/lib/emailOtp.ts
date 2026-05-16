import { LS_AUTH_PENDING_OTP, SS_EMAIL_VERIFIED } from '@/lib/settingsKeys'

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

type PendingOtp = {
  email: string
  codeHash: string
  salt: string
  expiresAt: number
  attempts: number
}

async function hashOtp(code: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:${code}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readPending(): PendingOtp | null {
  try {
    const raw = localStorage.getItem(LS_AUTH_PENDING_OTP)
    if (!raw) return null
    const p = JSON.parse(raw) as PendingOtp
    if (!p?.email || !p.codeHash || !p.salt || !p.expiresAt) return null
    return p
  } catch {
    return null
  }
}

function writePending(p: PendingOtp): void {
  localStorage.setItem(LS_AUTH_PENDING_OTP, JSON.stringify(p))
}

export function clearPendingOtp(): void {
  try {
    localStorage.removeItem(LS_AUTH_PENDING_OTP)
  } catch {
    /* yoksay */
  }
}

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}

export async function storePendingOtp(email: string, code: string): Promise<void> {
  const salt = crypto.randomUUID()
  const codeHash = await hashOtp(code, salt)
  writePending({
    email: normalizeEmail(email),
    codeHash,
    salt,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  })
}

export async function verifyPendingOtp(email: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const norm = normalizeEmail(email)
  const pending = readPending()
  if (!pending) {
    return { ok: false, error: 'Önce doğrulama kodu isteyin.' }
  }
  if (pending.email !== norm) {
    return { ok: false, error: 'Bu e-posta için gönderilmiş kod yok. Yeniden kod isteyin.' }
  }
  if (Date.now() > pending.expiresAt) {
    clearPendingOtp()
    return { ok: false, error: 'Kodun süresi doldu. Yeni kod isteyin.' }
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    clearPendingOtp()
    return { ok: false, error: 'Çok fazla hatalı deneme. Yeni kod isteyin.' }
  }

  const got = await hashOtp(code.trim(), pending.salt)
  if (got !== pending.codeHash) {
    writePending({ ...pending, attempts: pending.attempts + 1 })
    return { ok: false, error: 'Doğrulama kodu hatalı.' }
  }

  clearPendingOtp()
  markEmailVerified(norm)
  return { ok: true }
}

export function markEmailVerified(email: string): void {
  sessionStorage.setItem(SS_EMAIL_VERIFIED, normalizeEmail(email))
}

export function getVerifiedEmail(): string | null {
  try {
    const v = sessionStorage.getItem(SS_EMAIL_VERIFIED)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function clearEmailVerified(): void {
  try {
    sessionStorage.removeItem(SS_EMAIL_VERIFIED)
  } catch {
    /* yoksay */
  }
}

export function isEmailVerified(email: string): boolean {
  return getVerifiedEmail() === normalizeEmail(email)
}
