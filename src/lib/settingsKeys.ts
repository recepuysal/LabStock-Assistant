export const LS_START_ON_KAYIT = 'labstock.settings.startOnKayit'

/** Google AI Studio / Gemini API anahtarı (yalnızca bu cihazda) */
export const LS_GEMINI_API_KEY = 'labstock.settings.geminiApiKey'

/** Groq API anahtarı — https://console.groq.com/keys */
export const LS_GROQ_API_KEY = 'labstock.settings.groqApiKey'

/** Bulut sohbet sağlayıcısı: groq | gemini | ollama */
export const LS_AI_PROVIDER = 'labstock.settings.aiProvider'

/** İlk kurulumda .env deneme bulutu için başlangıç zamanı (ms) */
export const LS_AI_TRIAL_START = 'labstock.ai.trialStartAt'

/** Yerel Ollama sunucusu açık */
export const LS_OLLAMA_ENABLED = 'labstock.settings.ollamaEnabled'

/** Ollama API kökü (ör. http://127.0.0.1:11434) */
export const LS_OLLAMA_BASE_URL = 'labstock.settings.ollamaBaseUrl'

/** Ollama model adı (ör. llama3.2) */
export const LS_OLLAMA_MODEL = 'labstock.settings.ollamaModel'

/** Arayüz teması: light | dark */
export const LS_THEME = 'labstock.settings.theme'

/** @deprecated Eski bayrak; yeni akışta kullanılmıyor */
export const LS_GEMINI_ENHANCE = 'labstock.settings.geminiEnhance'

/** Girişten Kayıt’a geçerken: anahtar yok uyarısı (bir kez) */
export const SS_GEMINI_KEY_HINT = 'labstock.session.geminiKeyHint'

/** Denetim günlüğünde görünen yerel kullanıcı etiketi */
export const LS_ACTOR_LABEL = 'labstock.settings.actorLabel'

/** Yönetici PIN’inin SHA-256 özeti (boş = kısıt yok) */
export const LS_ADMIN_PIN_HASH = 'labstock.settings.adminPinHash'

/** Bu sekmede yönetici oturumu açık mı */
export const SS_ADMIN_UNLOCKED = 'labstock.session.adminUnlocked'

/** Yerel kullanıcı kayıtları (e-posta + şifre özeti) */
export const LS_AUTH_REGISTRY = 'labstock.auth.registry'

/** Oturum açık kullanıcı (yerel mod) */
export const LS_AUTH_SESSION = 'labstock.auth.session'

/** «Beni hatırla» ile saklanan e-posta */
export const LS_AUTH_REMEMBER_EMAIL = 'labstock.auth.rememberEmail'

/** Bekleyen kayıt OTP (yerel mod) */
export const LS_AUTH_PENDING_OTP = 'labstock.auth.pendingOtp'

/** Kayıt için doğrulanmış e-posta (oturum; şifre adımına kadar) */
export const SS_EMAIL_VERIFIED = 'labstock.session.emailVerified'

/** Resend.com API anahtarı (kayıt doğrulama e-postası) */
export const LS_RESEND_API_KEY = 'labstock.settings.resendApiKey'

/** Resend gönderen adresi (ör. LabStock <onboarding@resend.dev>) */
export const LS_RESEND_FROM = 'labstock.settings.resendFrom'
