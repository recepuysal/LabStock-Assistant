import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  authModeLabel,
  cancelRegistrationVerification,
  resetLocalRegistrationForEmail,
  loginWithPassword,
  logoutAuth,
  registerWithPassword,
  restoreAuthUser,
  sendRegistrationVerificationCode,
  verifyRegistrationCode,
  type AppUser,
  type RegisterResult,
  type SendCodeResult,
} from '@/lib/authService'
import { getSupabaseClient } from '@/lib/supabase/client'

type AuthContextValue = {
  user: AppUser | null
  loading: boolean
  modeLabel: string
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  sendRegistrationCode: (email: string) => Promise<SendCodeResult>
  verifyRegistrationCode: (email: string, code: string) => Promise<{ ok: true } | { ok: false; error: string }>
  register: (email: string, password: string) => Promise<RegisterResult>
  cancelRegistration: () => void
  resetLocalRegistration: (email: string) => { removedUser: boolean; clearedPending: boolean }
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const u = await restoreAuthUser()
      if (!cancelled) {
        setUser(u)
        setLoading(false)
      }
    })()

    const supabase = getSupabaseClient()
    if (!supabase) return () => { cancelled = true }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const email = session?.user?.email
      if (session?.user?.id && email) {
        void restoreAuthUser().then((u) => {
          if (!cancelled) setUser(u)
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginWithPassword(email, password)
    if (res.ok) setUser(res.user)
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error }
  }, [])

  const sendRegistrationCode = useCallback(async (email: string) => {
    return sendRegistrationVerificationCode(email)
  }, [])

  const verifyRegistrationCodeFn = useCallback(async (email: string, code: string) => {
    return verifyRegistrationCode(email, code)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    return registerWithPassword(email, password)
  }, [])

  const cancelRegistration = useCallback(() => {
    cancelRegistrationVerification()
  }, [])

  const resetLocalRegistration = useCallback((targetEmail: string) => {
    return resetLocalRegistrationForEmail(targetEmail)
  }, [])

  const logout = useCallback(async () => {
    await logoutAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      modeLabel: authModeLabel(),
      login,
      sendRegistrationCode,
      verifyRegistrationCode: verifyRegistrationCodeFn,
      register,
      cancelRegistration,
      resetLocalRegistration,
      logout,
    }),
    [
      user,
      loading,
      login,
      sendRegistrationCode,
      verifyRegistrationCodeFn,
      register,
      cancelRegistration,
      resetLocalRegistration,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider dışında kullanıldı')
  return ctx
}
