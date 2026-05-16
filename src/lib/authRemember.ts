import { LS_AUTH_REMEMBER_EMAIL } from '@/lib/settingsKeys'

export function getRememberedEmail(): string {
  try {
    return localStorage.getItem(LS_AUTH_REMEMBER_EMAIL)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setRememberedEmail(email: string): void {
  try {
    localStorage.setItem(LS_AUTH_REMEMBER_EMAIL, email.trim().toLowerCase())
  } catch {
    /* yoksay */
  }
}

export function clearRememberedEmail(): void {
  try {
    localStorage.removeItem(LS_AUTH_REMEMBER_EMAIL)
  } catch {
    /* yoksay */
  }
}
