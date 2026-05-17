/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_RESEND_API_KEY?: string
  readonly VITE_RESEND_FROM?: string
  /** Laboratuvar denemesi: tüm kurulumlarda ~30 gün bulut (kullanıcı anahtarı girmeden) */
  readonly VITE_GROQ_API_KEY?: string
  readonly VITE_GEMINI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
  labstock?: {
    geminiAsk(payload: {
      apiKey: string
      systemInstruction: string
      userMessage: string
    }): Promise<string>
    depoChat(payload: {
      provider: 'groq' | 'gemini' | 'ollama'
      apiKey: string
      inventoryJson: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
      ollamaBaseUrl?: string
      ollamaModel?: string
    }): Promise<string>
    persistenceLoad(): Promise<
      { ok: true; data: string | null } | { ok: false; error: string }
    >
    persistenceSave(json: string): Promise<{ ok: true } | { ok: false; error: string }>
    persistencePath(): Promise<string>
    sendResendEmail(payload: {
      apiKey: string
      from: string
      to: string
      subject: string
      html: string
    }): Promise<{ ok: true } | { ok: false; error: string }>
  }
}
