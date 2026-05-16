import {
  LS_AUTH_PENDING_OTP,
  LS_AUTH_REGISTRY,
  LS_AUTH_REMEMBER_EMAIL,
  LS_AUTH_SESSION,
  SS_EMAIL_VERIFIED,
} from '@/lib/settingsKeys'

export type LocalAuthUser = {
  id: string
  email: string
  salt: string
  passwordHash: string
  createdAt: string
}

export type AuthSession = {
  userId: string
  email: string
  mode: 'local' | 'supabase'
}

type Registry = { users: LocalAuthUser[] }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readRegistry(): Registry {
  try {
    const raw = localStorage.getItem(LS_AUTH_REGISTRY)
    if (!raw) return { users: [] }
    const parsed = JSON.parse(raw) as Registry
    if (!Array.isArray(parsed.users)) return { users: [] }
    return parsed
  } catch {
    return { users: [] }
  }
}

function writeRegistry(registry: Registry): void {
  localStorage.setItem(LS_AUTH_REGISTRY, JSON.stringify(registry))
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function newSalt(): string {
  return crypto.randomUUID()
}

export function getLocalSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LS_AUTH_SESSION)
    if (!raw) return null
    const s = JSON.parse(raw) as AuthSession
    if (s?.mode !== 'local' || !s.userId || !s.email) return null
    return s
  } catch {
    return null
  }
}

export function setLocalSession(session: AuthSession): void {
  localStorage.setItem(LS_AUTH_SESSION, JSON.stringify(session))
}

export function clearLocalSession(): void {
  localStorage.removeItem(LS_AUTH_SESSION)
}

export async function registerLocalUser(
  email: string,
  password: string,
): Promise<{ ok: true; user: LocalAuthUser } | { ok: false; error: string }> {
  const norm = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    return { ok: false, error: 'Geçerli bir e-posta adresi girin.' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'Şifre en az 6 karakter olmalı.' }
  }

  const registry = readRegistry()
  if (registry.users.some((u) => u.email === norm)) {
    return { ok: false, error: 'Bu e-posta ile zaten kayıt var. Giriş yapın.' }
  }

  const salt = newSalt()
  const passwordHash = await hashPassword(password, salt)
  const user: LocalAuthUser = {
    id: crypto.randomUUID(),
    email: norm,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  registry.users.push(user)
  writeRegistry(registry)
  return { ok: true, user }
}

export async function loginLocalUser(
  email: string,
  password: string,
): Promise<{ ok: true; user: LocalAuthUser } | { ok: false; error: string }> {
  const norm = normalizeEmail(email)
  const registry = readRegistry()
  const user = registry.users.find((u) => u.email === norm)
  if (!user) {
    return { ok: false, error: 'E-posta veya şifre hatalı.' }
  }
  const got = await hashPassword(password, user.salt)
  if (got !== user.passwordHash) {
    return { ok: false, error: 'E-posta veya şifre hatalı.' }
  }
  return { ok: true, user }
}

export function getLocalUserById(userId: string): LocalAuthUser | null {
  return readRegistry().users.find((u) => u.id === userId) ?? null
}

export function getLocalUserByEmail(email: string): LocalAuthUser | null {
  const norm = normalizeEmail(email)
  return readRegistry().users.find((u) => u.email === norm) ?? null
}

function clearAuthStorageForEmail(norm: string): void {
  try {
    const sessRaw = localStorage.getItem(LS_AUTH_SESSION)
    if (sessRaw) {
      const sess = JSON.parse(sessRaw) as AuthSession
      if (sess?.email === norm) localStorage.removeItem(LS_AUTH_SESSION)
    }
    if (localStorage.getItem(LS_AUTH_REMEMBER_EMAIL) === norm) {
      localStorage.removeItem(LS_AUTH_REMEMBER_EMAIL)
    }
    const otpRaw = localStorage.getItem(LS_AUTH_PENDING_OTP)
    if (otpRaw) {
      try {
        const otp = JSON.parse(otpRaw) as { email?: string }
        if (otp?.email === norm) localStorage.removeItem(LS_AUTH_PENDING_OTP)
      } catch {
        localStorage.removeItem(LS_AUTH_PENDING_OTP)
      }
    }
    if (sessionStorage.getItem(SS_EMAIL_VERIFIED) === norm) {
      sessionStorage.removeItem(SS_EMAIL_VERIFIED)
    }
  } catch {
    /* yoksay */
  }
}

/** Yerel kayıt + OTP/oturum verilerini bu e-posta için temizler. */
export function unregisterLocalUserByEmail(email: string): { removedUser: boolean } {
  const norm = normalizeEmail(email)
  const registry = readRegistry()
  const before = registry.users.length
  registry.users = registry.users.filter((u) => u.email !== norm)
  const removedUser = registry.users.length < before
  if (removedUser) writeRegistry(registry)
  clearAuthStorageForEmail(norm)
  return { removedUser }
}

export function listLocalUserEmails(): string[] {
  return readRegistry().users.map((u) => u.email)
}
