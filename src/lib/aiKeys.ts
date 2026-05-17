import {
  LS_AI_PROVIDER,
  LS_AI_TRIAL_START,
  LS_GEMINI_API_KEY,
  LS_GROQ_API_KEY,
  LS_OLLAMA_BASE_URL,
  LS_OLLAMA_ENABLED,
  LS_OLLAMA_MODEL,
} from '@/lib/settingsKeys'

/** Kurulumda .env anahtarı varsa, kullanıcı kendi anahtarını girmeden bulut denemesi (gün). */
export const AI_BUNDLED_TRIAL_DAYS = 30

function fromEnv(key: string | undefined): string {
  return typeof key === 'string' ? key.trim() : ''
}

function readUserStorage(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() ?? ''
  } catch {
    return ''
  }
}

function bundledGroqFromEnv(): string {
  return fromEnv(import.meta.env.VITE_GROQ_API_KEY as string | undefined)
}

function bundledGeminiFromEnv(): string {
  return fromEnv(import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
}

function hasBundledTrialKeys(): boolean {
  return !!(bundledGroqFromEnv() || bundledGeminiFromEnv())
}

function ensureTrialStartMs(): number {
  try {
    const raw = localStorage.getItem(LS_AI_TRIAL_START)
    if (raw) {
      const n = Number(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
    const now = Date.now()
    localStorage.setItem(LS_AI_TRIAL_START, String(now))
    return now
  } catch {
    return Date.now()
  }
}

export function isBundledTrialActive(): boolean {
  if (!hasBundledTrialKeys()) return false
  const start = ensureTrialStartMs()
  const elapsed = Date.now() - start
  return elapsed < AI_BUNDLED_TRIAL_DAYS * 24 * 60 * 60 * 1000
}

export function bundledTrialDaysLeft(): number {
  if (!hasBundledTrialKeys()) return 0
  const start = ensureTrialStartMs()
  const end = start + AI_BUNDLED_TRIAL_DAYS * 24 * 60 * 60 * 1000
  const left = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000))
  return Math.max(0, left)
}

export function readUserGroqKey(): string {
  return readUserStorage(LS_GROQ_API_KEY)
}

export function readUserGeminiKey(): string {
  return readUserStorage(LS_GEMINI_API_KEY)
}

/** Sohbet için Groq: önce kullanıcı anahtarı, sonra (deneme süresinde) .env anahtarı. */
export function readGroqApiKey(): string {
  const user = readUserGroqKey()
  if (user) return user
  if (isBundledTrialActive()) return bundledGroqFromEnv()
  return ''
}

export function readGeminiApiKey(): string {
  const user = readUserGeminiKey()
  if (user) return user
  if (isBundledTrialActive()) return bundledGeminiFromEnv()
  return ''
}

export function readOllamaBaseUrl(): string {
  const stored = readUserStorage(LS_OLLAMA_BASE_URL)
  if (stored) return stored.replace(/\/$/, '')
  return 'http://127.0.0.1:11434'
}

export function readOllamaModel(): string {
  return readUserStorage(LS_OLLAMA_MODEL) || 'llama3.2'
}

export function isOllamaConfigured(): boolean {
  try {
    return localStorage.getItem(LS_OLLAMA_ENABLED) === '1'
  } catch {
    return false
  }
}

export type AiProvider = 'groq' | 'gemini' | 'ollama'

export function readPreferredAiProvider(): AiProvider {
  try {
    const p = localStorage.getItem(LS_AI_PROVIDER)
    if (p === 'gemini' || p === 'ollama') return p
    return 'groq'
  } catch {
    return 'groq'
  }
}

export type ChatAttempt =
  | { kind: 'cloud'; provider: 'groq' | 'gemini'; apiKey: string; label: string; viaTrial: boolean }
  | { kind: 'ollama'; baseUrl: string; model: string; label: string }

export type AiChatStatus = {
  /** Yerel asistan her zaman açık */
  localAlways: true
  hasUserCloudKey: boolean
  trialActive: boolean
  trialDaysLeft: number
  hasBundledKeys: boolean
  ollamaConfigured: boolean
  /** Arayüz durum çubuğu */
  statusLabel: string
  statusDetail?: string
}

export function getAiChatStatus(): AiChatStatus {
  const hasUserCloudKey = !!(readUserGroqKey() || readUserGeminiKey())
  const trialActive = isBundledTrialActive()
  const trialDaysLeft = bundledTrialDaysLeft()
  const hasBundledKeys = hasBundledTrialKeys()
  const ollamaConfigured = isOllamaConfigured()
  const attempts = buildChatAttempts()

  if (hasUserCloudKey) {
    const first = attempts.find((a) => a.kind === 'cloud')
    return {
      localAlways: true,
      hasUserCloudKey: true,
      trialActive,
      trialDaysLeft,
      hasBundledKeys,
      ollamaConfigured,
      statusLabel: first?.label ?? 'Bulut',
      statusDetail: 'Kendi API anahtarınız',
    }
  }
  if (trialActive) {
    return {
      localAlways: true,
      hasUserCloudKey: false,
      trialActive: true,
      trialDaysLeft,
      hasBundledKeys,
      ollamaConfigured,
      statusLabel: 'Deneme bulut',
      statusDetail: `${trialDaysLeft} gün kaldı · sonra yalnızca yerel`,
    }
  }
  if (ollamaConfigured) {
    return {
      localAlways: true,
      hasUserCloudKey: false,
      trialActive: false,
      trialDaysLeft: 0,
      hasBundledKeys,
      ollamaConfigured: true,
      statusLabel: 'Ollama',
      statusDetail: 'API anahtarı yok',
    }
  }
  if (hasBundledKeys && trialDaysLeft === 0) {
    return {
      localAlways: true,
      hasUserCloudKey: false,
      trialActive: false,
      trialDaysLeft: 0,
      hasBundledKeys: true,
      ollamaConfigured: false,
      statusLabel: 'Yerel · ücretsiz',
      statusDetail: 'Deneme süresi bitti — Ayarlar’dan API ekleyin',
    }
  }
  return {
    localAlways: true,
    hasUserCloudKey: false,
    trialActive: false,
    trialDaysLeft: 0,
    hasBundledKeys,
    ollamaConfigured: false,
    statusLabel: 'Yerel · ücretsiz',
    statusDetail: 'Sınırsız · API gerekmez',
  }
}

export function hasEnhancedChat(): boolean {
  return buildChatAttempts().length > 0
}

/** @deprecated use hasEnhancedChat */
export function hasCloudAiKey(): boolean {
  return buildChatAttempts().some((a) => a.kind === 'cloud')
}

export function buildChatAttempts(): ChatAttempt[] {
  const prefer = readPreferredAiProvider()
  const out: ChatAttempt[] = []

  const addCloud = (provider: 'groq' | 'gemini') => {
    const userKey = provider === 'groq' ? readUserGroqKey() : readUserGeminiKey()
    const key = provider === 'groq' ? readGroqApiKey() : readGeminiApiKey()
    if (!key || out.some((a) => a.kind === 'cloud' && a.provider === provider)) return
    const viaTrial = !userKey && !!key
    out.push({
      kind: 'cloud',
      provider,
      apiKey: key,
      label: provider === 'groq' ? 'Groq' : 'Gemini',
      viaTrial,
    })
  }

  const addOllama = () => {
    if (!isOllamaConfigured()) return
    if (out.some((a) => a.kind === 'ollama')) return
    out.push({
      kind: 'ollama',
      baseUrl: readOllamaBaseUrl(),
      model: readOllamaModel(),
      label: 'Ollama',
    })
  }

  if (prefer === 'ollama') {
    addOllama()
    addCloud('groq')
    addCloud('gemini')
  } else if (prefer === 'gemini') {
    addCloud('gemini')
    addCloud('groq')
    addOllama()
  } else {
    addCloud('groq')
    addCloud('gemini')
    addOllama()
  }

  return out
}

export function buildCloudAttempts(prefer: AiProvider): Array<{
  provider: 'groq' | 'gemini'
  apiKey: string
  label: string
}> {
  return buildChatAttempts()
    .filter((a): a is Extract<ChatAttempt, { kind: 'cloud' }> => a.kind === 'cloud')
    .map(({ provider, apiKey, label }) => ({ provider, apiKey, label }))
}
