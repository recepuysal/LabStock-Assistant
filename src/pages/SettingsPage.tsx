import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminUnlockModal } from '@/components/AdminUnlockModal'
import { SettingsField, SettingsSection, SettingsStatus } from '@/components/SettingsSection'
import { useAuth } from '@/context/AuthContext'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'
import { useTheme } from '@/context/ThemeContext'
import { downloadPartsAsExcel } from '@/lib/excel'
import { serializeLabData } from '@/lib/labData'
import {
  LS_AI_PROVIDER,
  LS_GEMINI_API_KEY,
  LS_GROQ_API_KEY,
  LS_RESEND_API_KEY,
  LS_RESEND_FROM,
  LS_START_ON_KAYIT,
} from '@/lib/settingsKeys'
import { isCloudTeamMode } from '@/lib/supabase/client'

const GEMINI_KEY_URL = 'https://aistudio.google.com/app/apikey'
const GROQ_KEY_URL = 'https://console.groq.com/keys'
const RESEND_KEY_URL = 'https://resend.com/api-keys'

function normalizeApiKeyInput(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

const auditActionLabel: Record<string, string> = {
  delta: 'Adet değişimi',
  add_part: 'Yeni parça',
  excel_import: 'Excel içe aktarma',
  json_import: 'JSON yedek',
  replace_all: 'Toplu değiştirme',
}

function ApiKeyRow({
  id,
  value,
  placeholder,
  disabled,
  onChange,
  onSubmit,
  submitLabel = 'Kaydet',
  submitPrimary = false,
}: {
  id: string
  value: string
  placeholder: string
  disabled: boolean
  onChange: (v: string) => void
  onSubmit: () => void
  submitLabel?: string
  submitPrimary?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <input
        id={id}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ls-input min-w-0 flex-1"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className={submitPrimary ? 'ls-btn-primary shrink-0' : 'ls-btn-secondary shrink-0'}
      >
        {submitLabel}
      </button>
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, modeLabel } = useAuth()
  const { parts, audit, actorLabel, setActorLabel, hydrated, restoreFromBackupJson } = useInventory()
  const { isViewer, hasAdminPin, setAdminPin, clearAdminPin, tryUnlock } = useSimpleAccess()
  const { theme, setTheme } = useTheme()
  const isCloud = isCloudTeamMode()
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [backupMsg, setBackupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pinNew, setPinNew] = useState('')
  const [pinMsg, setPinMsg] = useState<string | null>(null)
  const [pinMsgType, setPinMsgType] = useState<'ok' | 'err'>('ok')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinUnlockOpen, setPinUnlockOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)

  const [startOnKayit, setStartOnKayit] = useState(false)
  const [aiProvider, setAiProvider] = useState<'groq' | 'gemini'>('groq')
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [groqSaveStatus, setGroqSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [groqSaveMessage, setGroqSaveMessage] = useState('')
  const [geminiSaveStatus, setGeminiSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [geminiSaveMessage, setGeminiSaveMessage] = useState('')
  const [resendKey, setResendKey] = useState('')
  const [resendFrom, setResendFrom] = useState('')
  const [resendSaveStatus, setResendSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    void (async () => {
      if (typeof window !== 'undefined' && window.labstock?.persistencePath) {
        try {
          const p = await window.labstock.persistencePath()
          setDataPath(p)
        } catch {
          setDataPath(null)
        }
      }
    })()
  }, [])

  useEffect(() => {
    try {
      setStartOnKayit(localStorage.getItem(LS_START_ON_KAYIT) === '1')
      const p = localStorage.getItem(LS_AI_PROVIDER)
      setAiProvider(p === 'gemini' ? 'gemini' : 'groq')
      setGroqKey(localStorage.getItem(LS_GROQ_API_KEY) ?? '')
      setGeminiKey(localStorage.getItem(LS_GEMINI_API_KEY) ?? '')
      setResendKey(localStorage.getItem(LS_RESEND_API_KEY) ?? '')
      setResendFrom(localStorage.getItem(LS_RESEND_FROM) ?? '')
    } catch {
      setStartOnKayit(false)
      setAiProvider('groq')
      setGroqKey('')
      setGeminiKey('')
    }
  }, [])

  async function handlePinSubmit(e: FormEvent) {
    e.preventDefault()
    if (isViewer) return
    const t = pinNew.trim()
    if (t.length < 4) {
      setPinMsgType('err')
      setPinMsg('PIN en az 4 karakter olmalı.')
      return
    }
    setPinSaving(true)
    setPinMsg(null)
    try {
      await setAdminPin(t)
      setPinNew('')
      setPinMsgType('ok')
      setPinMsg('PIN kaydedildi. Düzenleme için bu PIN gerekir.')
    } catch {
      setPinMsgType('err')
      setPinMsg('PIN kaydedilemedi.')
    } finally {
      setPinSaving(false)
    }
  }

  function toggleStart(v: boolean) {
    if (isViewer) return
    setStartOnKayit(v)
    try {
      if (v) localStorage.setItem(LS_START_ON_KAYIT, '1')
      else localStorage.removeItem(LS_START_ON_KAYIT)
    } catch {
      /* yoksay */
    }
  }

  function setProvider(v: 'groq' | 'gemini') {
    if (isViewer) return
    setAiProvider(v)
    try {
      localStorage.setItem(LS_AI_PROVIDER, v)
    } catch {
      /* yoksay */
    }
  }

  function persistGroqKey() {
    if (isViewer) return
    const v = normalizeApiKeyInput(groqKey)
    if (v !== groqKey) setGroqKey(v)
    try {
      if (v) localStorage.setItem(LS_GROQ_API_KEY, v)
      else localStorage.removeItem(LS_GROQ_API_KEY)
      setGroqSaveStatus('saved')
      setGroqSaveMessage(v ? 'Groq anahtarı kaydedildi.' : 'Groq anahtarı silindi.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setGroqSaveStatus('error')
      setGroqSaveMessage(`Kaydedilemedi: ${msg}`)
    }
  }

  function persistGeminiKey() {
    if (isViewer) return
    const v = normalizeApiKeyInput(geminiKey)
    if (v !== geminiKey) setGeminiKey(v)
    try {
      if (v) localStorage.setItem(LS_GEMINI_API_KEY, v)
      else localStorage.removeItem(LS_GEMINI_API_KEY)
      setGeminiSaveStatus('saved')
      setGeminiSaveMessage(v ? 'Gemini anahtarı kaydedildi.' : 'Gemini anahtarı silindi.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setGeminiSaveStatus('error')
      setGeminiSaveMessage(`Kaydedilemedi: ${msg}`)
    }
  }

  function saveResend() {
    if (isViewer) return
    try {
      localStorage.setItem(LS_RESEND_API_KEY, normalizeApiKeyInput(resendKey))
      localStorage.setItem(LS_RESEND_FROM, resendFrom.trim() || 'LabStock <onboarding@resend.dev>')
      setResendSaveStatus('saved')
    } catch {
      setResendSaveStatus('error')
    }
  }

  function exportJsonBackup() {
    const json = serializeLabData(parts, audit, actorLabel)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LabStock-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupMsg({ type: 'ok', text: 'JSON yedeği indirildi (stok + denetim günlüğü).' })
  }

  function exportExcelStock() {
    downloadPartsAsExcel(parts, `LabStock-stok-${new Date().toISOString().slice(0, 10)}.xlsx`)
    setBackupMsg({ type: 'ok', text: 'Excel stok listesi indirildi.' })
  }

  async function onBackupFileSelected(f: File | null) {
    if (isViewer) return
    setBackupMsg(null)
    if (!f) return
    try {
      const text = await f.text()
      const r = restoreFromBackupJson(text)
      if (!r.ok) {
        setBackupMsg({ type: 'err', text: r.error })
        return
      }
      setBackupMsg({ type: 'ok', text: 'Yedek geri yüklendi. Sayfalar güncel veriyi gösterir.' })
    } catch (e) {
      setBackupMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) })
    }
    if (backupInputRef.current) backupInputRef.current.value = ''
  }

  const recentAudit = [...audit].reverse().slice(0, 80)

  return (
    <div className="ls-page">
      <AdminUnlockModal
        open={pinUnlockOpen}
        onClose={() => setPinUnlockOpen(false)}
        onSubmit={tryUnlock}
      />

      <header className="ls-page-header">
        <h1>Ayarlar</h1>
        <p>Hesap, görünüm, yapay zeka ve yedekleme — tek sayfada gruplandı.</p>
      </header>

      {isViewer ? (
        <p className="ls-alert-warn">
          <strong className="font-semibold">Salt okunur:</strong> değişiklik için yönetici PIN ile giriş yapın.
        </p>
      ) : null}

      <div className="ls-settings-layout">
        {/* Görünüm + genel */}
        <div className="ls-settings-row">
          <SettingsSection title="Görünüm" description="Tercih bu cihazda saklanır.">
            <div className="ls-segment-track w-full sm:w-auto" role="group" aria-label="Tema">
              <button
                type="button"
                className={theme === 'light' ? 'ls-segment ls-segment-active' : 'ls-segment'}
                onClick={() => setTheme('light')}
              >
                Açık
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'ls-segment ls-segment-active' : 'ls-segment'}
                onClick={() => setTheme('dark')}
              >
                Koyu
              </button>
            </div>
          </SettingsSection>

          <SettingsSection title="Genel">
            <label
              className={`flex items-start gap-3 ${isViewer ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={startOnKayit}
                disabled={isViewer}
                onChange={(e) => toggleStart(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ls-line text-ls-accent focus:ring-ls-accent/40 disabled:opacity-50"
              />
              <span>
                <span className="block text-sm font-medium text-ls-text">Açılışta Kayıt sayfası</span>
                <span className="mt-0.5 block text-xs text-ls-text-muted">
                  Kapalıyken uygulama Depo (giriş) ekranıyla başlar.
                </span>
              </span>
            </label>
          </SettingsSection>
        </div>

        {/* Hesap + PIN */}
        <div className="ls-settings-row">
          <SettingsSection title="Hesap" badge={modeLabel}>
            {user ? (
              <div className="ls-settings-kv">
                <span className="ls-settings-kv-label">Oturum</span>
                <span className="ls-settings-kv-value truncate">{user.email}</span>
              </div>
            ) : null}
            <div className="ls-settings-actions">
              <button
                type="button"
                onClick={() => {
                  void logout()
                  navigate('/', { replace: true })
                }}
                className="ls-btn-secondary"
              >
                Çıkış yap
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Basit erişim"
            description="PIN ile stok düzenleme ve ayarlar korunur; liste herkese açık kalır."
          >
            <div className="ls-settings-kv">
              <span className="ls-settings-kv-label">Durum</span>
              <span className="ls-settings-kv-value text-right text-xs sm:text-sm">
                {hasAdminPin ? 'PIN aktif' : 'PIN yok — herkes düzenler'}
              </span>
            </div>

            {isViewer ? (
              <div className="space-y-3">
                <p className="text-sm text-ls-warn">PIN değiştirmek için yönetici oturumu açın.</p>
                <button type="button" onClick={() => setPinUnlockOpen(true)} className="ls-btn-primary w-full sm:w-auto">
                  Yönetici PIN ile giriş
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handlePinSubmit(e)} className="space-y-3">
                <SettingsField
                  label={hasAdminPin ? 'Yeni PIN' : 'Yönetici PIN belirle'}
                  htmlFor="admin-pin-new"
                  hint="En az 4 karakter. Kaydet ile bu cihazda saklanır."
                >
                  <input
                    id="admin-pin-new"
                    type="password"
                    autoComplete="new-password"
                    value={pinNew}
                    onChange={(e) => {
                      setPinNew(e.target.value)
                      setPinMsg(null)
                    }}
                    className="ls-input"
                    placeholder="••••"
                    minLength={4}
                  />
                </SettingsField>
                <div className="ls-settings-actions">
                  <button type="submit" disabled={pinSaving} className="ls-btn-primary">
                    {pinSaving ? 'Kaydediliyor…' : 'PIN kaydet'}
                  </button>
                  {hasAdminPin ? (
                    <button
                      type="button"
                      onClick={() => {
                        clearAdminPin()
                        setPinMsgType('ok')
                        setPinMsg('PIN kaldırıldı; herkes düzenleyebilir.')
                      }}
                      className="ls-btn-ghost text-ls-danger hover:text-ls-danger"
                    >
                      PIN kaldır
                    </button>
                  ) : null}
                </div>
                {pinMsg ? <SettingsStatus type={pinMsgType}>{pinMsg}</SettingsStatus> : null}
              </form>
            )}
          </SettingsSection>
        </div>

        {/* E-posta doğrulama */}
        {isCloud ? (
          <SettingsSection
            title="E-posta doğrulama"
            badge="Supabase"
            description="Kayıt kodları Supabase Auth üzerinden gönderilir; ek Resend ayarı gerekmez."
          />
        ) : (
          <SettingsSection
            title="E-posta doğrulama"
            description="Yerel modda kayıt sırasında doğrulama kodu için Resend kullanılır."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                saveResend()
              }}
            >
              <SettingsField label="Resend API anahtarı" htmlFor="resend-key" link={{ href: RESEND_KEY_URL, label: 'Anahtar al →' }}>
                <input
                  id="resend-key"
                  type="password"
                  autoComplete="off"
                  disabled={isViewer}
                  value={resendKey}
                  onChange={(e) => {
                    setResendKey(e.target.value)
                    setResendSaveStatus('idle')
                  }}
                  className="ls-input w-full"
                  placeholder="re_…"
                />
              </SettingsField>
              <SettingsField label="Gönderen (From)" htmlFor="resend-from" hint="Örn. LabStock &lt;onboarding@resend.dev&gt;">
                <input
                  id="resend-from"
                  type="text"
                  disabled={isViewer}
                  value={resendFrom}
                  onChange={(e) => {
                    setResendFrom(e.target.value)
                    setResendSaveStatus('idle')
                  }}
                  className="ls-input w-full"
                  placeholder="LabStock <onboarding@resend.dev>"
                />
              </SettingsField>
              <button type="submit" disabled={isViewer} className="ls-btn-primary">
                Kaydet
              </button>
              {resendSaveStatus === 'saved' ? <SettingsStatus type="ok">Kaydedildi.</SettingsStatus> : null}
              {resendSaveStatus === 'error' ? <SettingsStatus type="err">Kaydedilemedi.</SettingsStatus> : null}
            </form>
          </SettingsSection>
        )}

        {/* Yapay zeka */}
        <SettingsSection
          title="Yapay zeka — depo sohbeti"
          description="İstekler Electron üzerinden gider. Groq önerilir; Gemini 429 verirse otomatik Groq denenir."
        >
          <div>
            <p className="ls-label mb-2">Aktif sağlayıcı</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Yapay zeka sağlayıcısı">
              <label className="ls-settings-provider">
                <input
                  type="radio"
                  name="ai-provider"
                  checked={aiProvider === 'groq'}
                  disabled={isViewer}
                  onChange={() => setProvider('groq')}
                />
                Groq (önerilen)
              </label>
              <label className="ls-settings-provider">
                <input
                  type="radio"
                  name="ai-provider"
                  checked={aiProvider === 'gemini'}
                  disabled={isViewer}
                  onChange={() => setProvider('gemini')}
                />
                Google Gemini
              </label>
            </div>
          </div>

          <div className="grid gap-5 border-t border-ls-line/80 pt-4 lg:grid-cols-2">
            <SettingsField label="Groq API anahtarı" htmlFor="groq-key" link={{ href: GROQ_KEY_URL, label: 'Ücretsiz anahtar →' }}>
              <ApiKeyRow
                id="groq-key"
                value={groqKey}
                placeholder="gsk_…"
                disabled={isViewer}
                onChange={(v) => {
                  setGroqKey(v)
                  setGroqSaveStatus('idle')
                  setGroqSaveMessage('')
                }}
                onSubmit={persistGroqKey}
              />
              {groqSaveStatus !== 'idle' ? (
                <SettingsStatus type={groqSaveStatus === 'saved' ? 'ok' : 'err'}>{groqSaveMessage}</SettingsStatus>
              ) : null}
            </SettingsField>

            <SettingsField label="Gemini API anahtarı" htmlFor="gemini-key" link={{ href: GEMINI_KEY_URL, label: 'AI Studio →' }}>
              <ApiKeyRow
                id="gemini-key"
                value={geminiKey}
                placeholder="AIza…"
                disabled={isViewer}
                onChange={(v) => {
                  setGeminiKey(v)
                  setGeminiSaveStatus('idle')
                  setGeminiSaveMessage('')
                }}
                onSubmit={persistGeminiKey}
                submitPrimary
              />
              {geminiSaveStatus !== 'idle' ? (
                <SettingsStatus type={geminiSaveStatus === 'saved' ? 'ok' : 'err'}>{geminiSaveMessage}</SettingsStatus>
              ) : null}
            </SettingsField>
          </div>

          <p className="text-2xs leading-relaxed text-ls-text-muted">
            Yerel hızlı özet Kayıt ekranında çalışmaya devam eder; bulut kesilirse sohbet otomatik yerel metne düşer.
          </p>
        </SettingsSection>

        {/* Veri */}
        <SettingsSection
          title="Veri ve yedek"
          description="Stok ve denetim günlüğü otomatik kaydedilir (Electron dosyası + tarayıcı yedeği)."
        >
          <SettingsField
            label="Denetim günlüğünde görünen ad"
            htmlFor="actor-label"
            hint="Adet değişimleri ve içe aktarmalar bu etiketle kaydedilir."
          >
            <input
              id="actor-label"
              type="text"
              value={actorLabel}
              onChange={(e) => setActorLabel(e.target.value)}
              className="ls-input"
              placeholder="Örn. Ahmet · Laboratuvar"
              disabled={!hydrated || isViewer}
            />
          </SettingsField>

          {dataPath ? (
            <p className="break-all rounded-lg border border-ls-line bg-ls-muted/60 px-3 py-2 font-mono text-2xs text-ls-text-muted">
              <span className="font-sans font-semibold">Kalıcı dosya: </span>
              {dataPath}
            </p>
          ) : (
            <p className="text-xs text-ls-text-muted">
              Kalıcı dosya yolu yalnızca Electron sürümünde gösterilir.
            </p>
          )}

          <div className="ls-settings-actions">
            <button type="button" onClick={exportJsonBackup} disabled={!hydrated} className="ls-btn-primary">
              JSON indir
            </button>
            <button
              type="button"
              onClick={exportExcelStock}
              disabled={!hydrated || parts.length === 0}
              className="ls-btn-secondary"
            >
              Excel indir
            </button>
            <label className="ls-btn-secondary cursor-pointer">
              <span>JSON yükle</span>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                disabled={!hydrated || isViewer}
                onChange={(e) => void onBackupFileSelected(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {backupMsg ? <SettingsStatus type={backupMsg.type}>{backupMsg.text}</SettingsStatus> : null}

          <div className="border-t border-ls-line/80 pt-2">
            <button
              type="button"
              className="ls-settings-audit-toggle"
              aria-expanded={auditOpen}
              onClick={() => setAuditOpen((o) => !o)}
            >
              <span>Denetim günlüğü</span>
              <span className="ls-badge tabular-nums">{audit.length} kayıt</span>
            </button>
            {auditOpen ? (
              <div className="ls-settings-audit-panel mt-2">
                {recentAudit.length === 0 ? (
                  <p className="p-4 text-sm text-ls-text-muted">Henüz kayıt yok.</p>
                ) : (
                  <ul>
                    {recentAudit.map((a) => (
                      <li key={a.id} className="ls-settings-audit-item">
                        <span className="font-mono text-2xs">
                          {new Date(a.at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <span className="mx-1.5 text-ls-line-strong">·</span>
                        <span className="font-semibold text-ls-text">{a.actor}</span>
                        <span className="mx-1 text-ls-line-strong">—</span>
                        <span>{auditActionLabel[a.action] ?? a.action}</span>
                        {a.mpn && a.mpn !== '—' ? (
                          <>
                            <span className="mx-1 text-ls-line-strong">·</span>
                            <span className="font-mono text-ls-accent">{a.mpn}</span>
                            {a.action === 'delta' ? (
                              <span className="tabular-nums">
                                {' '}
                                ({a.delta > 0 ? '+' : ''}
                                {a.delta} → {a.quantityAfter})
                              </span>
                            ) : null}
                          </>
                        ) : null}
                        {a.note ? <p className="mt-1 text-2xs opacity-90">{a.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </SettingsSection>

        <footer className="ls-settings-about">
          <span>
            <strong className="font-medium text-ls-text">LabStock Assistant</strong> · Elektronik bileşen envanteri
          </span>
          <span className="tabular-nums text-xs">Sürüm 0.1.0</span>
        </footer>
      </div>
    </div>
  )
}
