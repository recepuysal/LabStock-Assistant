import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearAdminSessionUnlock,
  clearStoredPinHash,
  getStoredPinHash,
  hashPin,
  isAdminSessionUnlocked,
  isViewerMode,
  setAdminSessionUnlocked,
  setStoredPinHash,
} from '@/lib/simpleAdmin'

type SimpleAccessValue = {
  /** Salt okunur: stok değiştirme kapalı */
  isViewer: boolean
  /** Yönetici oturumu (PIN doğrulandı veya PIN tanımlı değil) */
  isAdmin: boolean
  /** PIN kayıtlı mı */
  hasAdminPin: boolean
  tryUnlock: (pin: string) => Promise<boolean>
  lockAdminSession: () => void
  /** Yalnızca mevcut yönetici oturumundayken */
  setAdminPin: (newPin: string) => Promise<void>
  clearAdminPin: () => void
}

const SimpleAccessContext = createContext<SimpleAccessValue | null>(null)

export function SimpleAccessProvider({ children }: { children: ReactNode }) {
  const [pinHash, setPinHash] = useState<string | null>(() => getStoredPinHash())
  const [unlocked, setUnlocked] = useState(() => isAdminSessionUnlocked())

  const isViewer = isViewerMode(pinHash, unlocked)
  const isAdmin = !isViewer

  const tryUnlock = useCallback(
    async (pin: string) => {
      const h = getStoredPinHash()
      if (!h) {
        setUnlocked(true)
        setAdminSessionUnlocked()
        return true
      }
      const got = await hashPin(pin)
      if (got === h) {
        setUnlocked(true)
        setAdminSessionUnlocked()
        return true
      }
      return false
    },
    [],
  )

  const lockAdminSession = useCallback(() => {
    clearAdminSessionUnlock()
    setUnlocked(false)
  }, [])

  const setAdminPin = useCallback(async (newPin: string) => {
    const t = newPin.trim()
    if (!t) {
      clearStoredPinHash()
      setPinHash(null)
      setUnlocked(true)
      setAdminSessionUnlocked()
      return
    }
    const h = await hashPin(t)
    setStoredPinHash(h)
    setPinHash(h)
    setUnlocked(true)
    setAdminSessionUnlocked()
  }, [])

  const clearAdminPin = useCallback(() => {
    clearStoredPinHash()
    setPinHash(null)
    setUnlocked(true)
    setAdminSessionUnlocked()
  }, [])

  const value = useMemo(
    () => ({
      isViewer,
      isAdmin,
      hasAdminPin: !!pinHash,
      tryUnlock,
      lockAdminSession,
      setAdminPin,
      clearAdminPin,
    }),
    [isViewer, isAdmin, pinHash, tryUnlock, lockAdminSession, setAdminPin, clearAdminPin],
  )

  return <SimpleAccessContext.Provider value={value}>{children}</SimpleAccessContext.Provider>
}

export function useSimpleAccess() {
  const ctx = useContext(SimpleAccessContext)
  if (!ctx) throw new Error('useSimpleAccess yalnızca SimpleAccessProvider içinde kullanılabilir.')
  return ctx
}
