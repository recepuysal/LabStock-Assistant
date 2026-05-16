import {
  clearEmailVerified,
  clearPendingOtp,
  generateOtpCode,
  isEmailVerified,
  markEmailVerified,
  storePendingOtp,
  verifyPendingOtp,
} from '@/lib/emailOtp'
import {
  clearLocalSession,
  getLocalSession,
  getLocalUserByEmail,
  getLocalUserById,
  listLocalUserEmails,
  loginLocalUser,
  registerLocalUser,
  setLocalSession,
  unregisterLocalUserByEmail,
  type AuthSession,
  type LocalAuthUser,
} from '@/lib/localAuth'
import { sendVerificationEmail } from '@/lib/sendVerificationEmail'
import { LS_ACTOR_LABEL } from '@/lib/settingsKeys'
import { getSupabaseClient, isCloudTeamMode } from '@/lib/supabase/client'

export type AppUser = {
  id: string
  email: string
  mode: 'local' | 'supabase'
}

export type RegisterResult =
  | { ok: true; email: string; needsEmailConfirmation?: boolean }
  | { ok: false; error: string }

export type SendCodeResult =
  | { ok: true; devPreviewCode?: string }
  | { ok: false; error: string }

/** Supabase OTP doğrulaması sonrası şifre atanana kadar geçici oturum */
let supabaseOtpVerifiedEmail: string | null = null

function setActorFromEmail(email: string): void {
  const label = email.split('@')[0]?.trim() || email
  try {
    localStorage.setItem(LS_ACTOR_LABEL, label)
  } catch {
    /* yoksay */
  }
}

function localUserToApp(user: LocalAuthUser): AppUser {
  return { id: user.id, email: user.email, mode: 'local' }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function restoreAuthUser(): Promise<AppUser | null> {
  const supabase = getSupabaseClient()
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const u = data.session?.user
    if (u?.email) {
      if (supabaseOtpVerifiedEmail && normalizeEmail(u.email) === supabaseOtpVerifiedEmail) {
        return null
      }
      setActorFromEmail(u.email)
      return { id: u.id, email: u.email, mode: 'supabase' }
    }
    return null
  }

  const session = getLocalSession()
  if (!session) return null
  const user = getLocalUserById(session.userId)
  if (!user) {
    clearLocalSession()
    return null
  }
  setActorFromEmail(user.email)
  return localUserToApp(user)
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; user: AppUser } | { ok: false; error: string }> {
  const supabase = getSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      return { ok: false, error: mapSupabaseError(error.message) }
    }
    const u = data.user
    if (!u?.email) return { ok: false, error: 'Giriş başarısız.' }
    setActorFromEmail(u.email)
    return { ok: true, user: { id: u.id, email: u.email, mode: 'supabase' } }
  }

  const res = await loginLocalUser(email, password)
  if (!res.ok) return res
  const session: AuthSession = { userId: res.user.id, email: res.user.email, mode: 'local' }
  setLocalSession(session)
  setActorFromEmail(res.user.email)
  return { ok: true, user: localUserToApp(res.user) }
}

export async function sendRegistrationVerificationCode(email: string): Promise<SendCodeResult> {
  const normEmail = normalizeEmail(email)
  if (!normEmail.includes('@')) {
    return { ok: false, error: 'Geçerli bir e-posta adresi girin.' }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    const { error } = await supabase.auth.signInWithOtp({
      email: normEmail,
      options: { shouldCreateUser: true },
    })
    if (error) {
      return { ok: false, error: mapSupabaseError(error.message) }
    }
    clearEmailVerified()
    supabaseOtpVerifiedEmail = null
    return { ok: true }
  }

  if (getLocalUserByEmail(normEmail)) {
    return { ok: false, error: 'Bu e-posta ile zaten kayıt var. Giriş yapın.' }
  }

  const code = generateOtpCode()
  await storePendingOtp(normEmail, code)
  clearEmailVerified()

  const sent = await sendVerificationEmail(normEmail, code)
  if (!sent.ok) {
    clearPendingOtp()
    return sent
  }
  return { ok: true, devPreviewCode: sent.devPreviewCode }
}

export async function verifyRegistrationCode(
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normEmail = normalizeEmail(email)
  const token = code.trim().replace(/\s/g, '')
  const supabase = getSupabaseClient()
  const otpPattern = supabase ? /^\d{6,8}$/ : /^\d{6}$/
  if (!otpPattern.test(token)) {
    return {
      ok: false,
      error: supabase
        ? 'E-postadaki doğrulama kodunu girin (6–8 hane).'
        : '6 haneli doğrulama kodunu girin.',
    }
  }

  if (supabase) {
    const { error } = await supabase.auth.verifyOtp({
      email: normEmail,
      token,
      type: 'email',
    })
    if (error) {
      return { ok: false, error: mapSupabaseError(error.message) }
    }
    supabaseOtpVerifiedEmail = normEmail
    markEmailVerified(normEmail)
    return { ok: true }
  }

  return verifyPendingOtp(normEmail, token)
}

/** Kayıt sonrası oturum açılmaz; kullanıcı giriş ekranından tekrar giriş yapar. */
export async function registerWithPassword(email: string, password: string): Promise<RegisterResult> {
  const normEmail = normalizeEmail(email)

  if (!isEmailVerified(normEmail)) {
    return { ok: false, error: 'Önce e-postanızı doğrulama kodu ile onaylayın.' }
  }

  const supabase = getSupabaseClient()

  if (supabase) {
    if (supabaseOtpVerifiedEmail !== normEmail) {
      return { ok: false, error: 'E-posta doğrulaması geçersiz. Kodu yeniden isteyin.' }
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return { ok: false, error: mapSupabaseError(error.message) }
    }
    await supabase.auth.signOut()
    supabaseOtpVerifiedEmail = null
    clearEmailVerified()
    return { ok: true, email: normEmail }
  }

  const res = await registerLocalUser(email, password)
  if (!res.ok) return res
  clearEmailVerified()
  return { ok: true, email: res.user.email }
}

/** Yerel modda kayıt/OTP verisini sıfırlar (çalışan uygulama penceresinde). */
export function resetLocalRegistrationForEmail(email: string): {
  removedUser: boolean
  clearedPending: boolean
} {
  const norm = normalizeEmail(email)
  const hadPending = isEmailVerified(norm) || getLocalUserByEmail(norm) !== null
  const { removedUser } = unregisterLocalUserByEmail(email)
  clearPendingOtp()
  clearEmailVerified()
  supabaseOtpVerifiedEmail = null
  return { removedUser, clearedPending: hadPending || removedUser }
}

export function getLocalRegisteredEmails(): string[] {
  return listLocalUserEmails()
}

export function cancelRegistrationVerification(): void {
  const supabase = getSupabaseClient()
  const hadOtpSession = !!supabaseOtpVerifiedEmail
  clearPendingOtp()
  clearEmailVerified()
  supabaseOtpVerifiedEmail = null
  if (supabase && hadOtpSession) {
    void supabase.auth.signOut()
  }
}

export async function logoutAuth(): Promise<void> {
  const supabase = getSupabaseClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
  supabaseOtpVerifiedEmail = null
  clearLocalSession()
}

export function authModeLabel(): string {
  return isCloudTeamMode() ? 'Bulut hesabı (Supabase)' : 'Yerel hesap (bu cihaz)'
}

function mapSupabaseError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'E-posta veya şifre hatalı.'
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Bu e-posta ile zaten kayıt var.'
  }
  if (m.includes('password')) return 'Şifre en az 6 karakter olmalı.'
  if (m.includes('token') || m.includes('otp') || m.includes('expired')) {
    return 'Doğrulama kodu geçersiz veya süresi dolmuş.'
  }
  return message
}
