import { FormEvent, useEffect, useRef, useState } from 'react'
import { useInventory } from '@/context/InventoryContext'
import { useSimpleAccess } from '@/context/SimpleAccessContext'
import { downloadPartsAsExcel } from '@/lib/excel'
import { serializeLabData } from '@/lib/labData'
import {
  LS_AI_PROVIDER,
  LS_GEMINI_API_KEY,
  LS_GROQ_API_KEY,
  LS_START_ON_KAYIT,
} from '@/lib/settingsKeys'

const GEMINI_KEY_URL = 'https://aistudio.google.com/app/apikey'
const GROQ_KEY_URL = 'https://console.groq.com/keys'

/** Yapıştırmadan gelen BOM / zero-width vb. temizlik */
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

export function SettingsPage() {
  const { parts, audit, actorLabel, setActorLabel, hydrated, restoreFromBackupJson } = useInventory()
  const { isViewer, isAdmin, hasAdminPin, setAdminPin, clearAdminPin } = useSimpleAccess()
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [backupMsg, setBackupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pinNew, setPinNew] = useState('')
  const [pinMsg, setPinMsg] = useState<string | null>(null)

  const [startOnKayit, setStartOnKayit] = useState(false)
  const [aiProvider, setAiProvider] = useState<'groq' | 'gemini'>('groq')
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [groqSaveStatus, setGroqSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [groqSaveMessage, setGroqSaveMessage] = useState('')
  const [geminiSaveStatus, setGeminiSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [geminiSaveMessage, setGeminiSaveMessage] = useState('')

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
    } catch {
      setStartOnKayit(false)
      setAiProvider('groq')
      setGroqKey('')
      setGeminiKey('')
    }
  }, [])

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

  function persistGroqKey(): boolean {
    if (isViewer) return false
    const v = normalizeApiKeyInput(groqKey)
    if (v !== groqKey) setGroqKey(v)
    try {
      if (v) localStorage.setItem(LS_GROQ_API_KEY, v)
      else localStorage.removeItem(LS_GROQ_API_KEY)
      setGroqSaveStatus('saved')
      setGroqSaveMessage(v ? 'Groq anahtarı kaydedildi.' : 'Groq anahtarı silindi.')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setGroqSaveStatus('error')
      setGroqSaveMessage(`Kaydedilemedi: ${msg}`)
      return false
    }
  }

  function persistGeminiKey(): boolean {
    if (isViewer) return false
    const v = normalizeApiKeyInput(geminiKey)
    if (v !== geminiKey) setGeminiKey(v)
    try {
      if (v) localStorage.setItem(LS_GEMINI_API_KEY, v)
      else localStorage.removeItem(LS_GEMINI_API_KEY)
      setGeminiSaveStatus('saved')
      setGeminiSaveMessage(v ? 'Gemini anahtarı kaydedildi.' : 'Gemini anahtarı silindi.')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setGeminiSaveStatus('error')
      setGeminiSaveMessage(`Kaydedilemedi: ${msg}`)
      return false
    }
  }

  function onGroqForm(e: FormEvent) {
    e.preventDefault()
    persistGroqKey()
  }

  function onGeminiKeyForm(e: FormEvent) {
    e.preventDefault()
    persistGeminiKey()
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

  return (
    <main className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto bg-ls-canvas px-4 py-6 sm:px-8">
      <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-teal-700/90">Tercihler</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Ayarlar</h2>
      <p className="mt-1 text-sm text-slate-600">Uygulama tercihleri (yerel; tarayıcı depolama).</p>

      {isViewer ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-card">
          <strong className="font-semibold">Salt okunur modu:</strong> ayarları ve yedeği yalnızca yönetici değiştirebilir.
          Üst menüden PIN ile oturum açın.
        </p>
      ) : null}

      <section className="mt-8 space-y-5">
        <div className="ls-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Genel</h3>
          <label className={`mt-4 flex items-start gap-3 ${isViewer ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={startOnKayit}
              disabled={isViewer}
              onChange={(e) => toggleStart(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ls-line text-teal-600 focus:ring-teal-500/40 disabled:opacity-50"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">Açılışta Kayıt sayfasını göster</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Kapalıyken uygulama Giriş (depo asistanı) ekranıyla başlar.
              </span>
            </span>
          </label>
        </div>

        <div className="ls-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Basit erişim</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            PIN kayıtlıyken bu cihazda liste herkese açık; stok değişikliği ve ayarlar için üst menüden yönetici PIN’i
            gerekir. PIN yoksa herkes yönetici sayılır.
          </p>
          {isViewer ? (
            <p className="mt-4 text-sm font-medium text-amber-900">
              PIN’i yalnızca yönetici oturumu değiştirebilir.
            </p>
          ) : (
            <>
              <p className="mt-3 text-2xs text-slate-500">
                Durum: {hasAdminPin ? 'PIN aktif (salt okunur varsayılan)' : 'PIN yok — herkes düzenleyebilir'}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="admin-pin-new" className="text-xs font-semibold text-slate-700">
                    Yeni PIN {hasAdminPin ? '(değiştirmek için)' : ''}
                  </label>
                  <input
                    id="admin-pin-new"
                    type="password"
                    autoComplete="new-password"
                    value={pinNew}
                    onChange={(e) => {
                      setPinNew(e.target.value)
                      setPinMsg(null)
                    }}
                    className="ls-input mt-2 py-2.5"
                    placeholder={hasAdminPin ? '••••••' : 'En az 4 karakter önerilir'}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      await setAdminPin(pinNew)
                      setPinNew('')
                      setPinMsg('PIN kaydedildi. PIN bilen yönetici düzenleme yapabilir.')
                    })()
                  }}
                  disabled={!pinNew.trim()}
                  className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110 disabled:opacity-40"
                >
                  PIN kaydet
                </button>
              </div>
              {hasAdminPin ? (
                <button
                  type="button"
                  onClick={() => {
                    clearAdminPin()
                    setPinMsg('PIN kaldırıldı; herkes yönetici.')
                  }}
                  className="mt-3 text-sm font-semibold text-red-700 underline-offset-2 hover:underline"
                >
                  PIN’i kaldır (herkes düzenler)
                </button>
              ) : null}
              {pinMsg ? (
                <p className="mt-3 text-sm font-medium text-teal-800" role="status">
                  {pinMsg}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="ls-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Yapay zeka — bulut sohbet</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Giriş ekranındaki sohbet <strong className="font-semibold text-slate-800">internet üzerinden</strong> çalışır; her
            gönderimde güncel stok listeniz modele eklenir. İstekler Electron ana sürecinden gider (CORS yok).{' '}
            <strong className="font-semibold text-slate-800">Groq</strong> genelde cömert ücretsiz kotayla önerilir;{' '}
            <strong className="font-semibold text-slate-800">Gemini</strong> alternatiftir. İki anahtarı da kaydederseniz
            Gemini 429 verdiğinde uygulama otomatik Groq dener.
          </p>

          <p className="mt-4 text-2xs font-semibold uppercase tracking-[0.08em] text-slate-500">Aktif sağlayıcı</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ls-line bg-slate-50/80 px-3 py-2.5 shadow-card transition has-[:checked]:border-teal-400/70 has-[:checked]:bg-teal-50/60">
              <input
                type="radio"
                name="ai-provider"
                checked={aiProvider === 'groq'}
                disabled={isViewer}
                onChange={() => setProvider('groq')}
                className="text-teal-600 focus:ring-teal-500/40"
              />
              <span className="text-sm font-medium text-slate-800">Groq (önerilen)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ls-line bg-slate-50/80 px-3 py-2.5 shadow-card transition has-[:checked]:border-teal-400/70 has-[:checked]:bg-teal-50/60">
              <input
                type="radio"
                name="ai-provider"
                checked={aiProvider === 'gemini'}
                disabled={isViewer}
                onChange={() => setProvider('gemini')}
                className="text-teal-600 focus:ring-teal-500/40"
              />
              <span className="text-sm font-medium text-slate-800">Google Gemini</span>
            </label>
          </div>

          <form onSubmit={onGroqForm} className="mt-6 space-y-2 border-t border-ls-line/80 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="groq-key" className="text-xs font-semibold text-slate-700">
                Groq API anahtarı
              </label>
              <a
                href={GROQ_KEY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"
              >
                Ücretsiz anahtar al →
              </a>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="groq-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={groqKey}
                disabled={isViewer}
                onChange={(e) => {
                  setGroqKey(e.target.value)
                  setGroqSaveStatus('idle')
                  setGroqSaveMessage('')
                }}
                placeholder="gsk_…"
                className="ls-input min-w-0 flex-1 py-2.5"
              />
              <button
                type="submit"
                disabled={isViewer}
                className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-slate-800 disabled:opacity-40"
              >
                Kaydet
              </button>
            </div>
            {groqSaveStatus === 'saved' ? (
              <p className="text-sm font-medium text-teal-800" role="status">
                {groqSaveMessage}
              </p>
            ) : null}
            {groqSaveStatus === 'error' ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {groqSaveMessage}
              </p>
            ) : null}
          </form>

          <form onSubmit={onGeminiKeyForm} className="mt-6 space-y-2 border-t border-ls-line/80 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="gemini-key" className="text-xs font-semibold text-slate-700">
                Gemini API anahtarı
              </label>
              <a
                href={GEMINI_KEY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"
              >
                AI Studio →
              </a>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="gemini-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={geminiKey}
                disabled={isViewer}
                onChange={(e) => {
                  setGeminiKey(e.target.value)
                  setGeminiSaveStatus('idle')
                  setGeminiSaveMessage('')
                }}
                placeholder="AIza…"
                className="ls-input min-w-0 flex-1 py-2.5"
              />
              <button
                type="submit"
                disabled={isViewer}
                className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110 disabled:opacity-40"
              >
                Kaydet
              </button>
            </div>
            {geminiSaveStatus === 'saved' ? (
              <p className="text-sm font-medium text-teal-800" role="status">
                {geminiSaveMessage}
              </p>
            ) : null}
            {geminiSaveStatus === 'error' ? (
              <p className="text-sm font-medium text-red-700" role="alert">
                {geminiSaveMessage}
              </p>
            ) : null}
          </form>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Yerel hızlı özet için Kayıt ekranı ve{' '}
            <code className="rounded-md border border-ls-line bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8rem] text-slate-800">
              termExpansions.ts
            </code>{' '}
            kullanılmaya devam eder; bulut kesildiğinde sohbet otomatik olarak yerel metne düşer.
          </p>
        </div>

        <div className="ls-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Veri ve yedek</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Stok ve denetim günlüğü otomatik kaydedilir: masaüstünde uygulama veri klasöründeki dosya + tarayıcıda{' '}
            <code className="rounded bg-slate-100 px-1 font-mono text-xs">localStorage</code> yedeği.
          </p>

          <div className="mt-4">
            <label htmlFor="actor-label" className="text-xs font-semibold text-slate-700">
              Denetim günlüğünde görünen ad
            </label>
            <input
              id="actor-label"
              type="text"
              value={actorLabel}
              onChange={(e) => setActorLabel(e.target.value)}
              className="ls-input mt-2 py-2.5"
              placeholder="Örn. Ahmet · Laboratuvar"
              disabled={!hydrated || isViewer}
            />
            <p className="mt-1 text-2xs text-slate-500">Adet değişimleri ve içe aktarmalar bu etiketle kaydedilir.</p>
          </div>

          {dataPath ? (
            <p className="mt-4 break-all rounded-xl border border-ls-line bg-slate-50/80 px-3 py-2 font-mono text-2xs text-slate-600">
              <span className="font-sans font-semibold text-slate-700">Kalıcı dosya: </span>
              {dataPath}
            </p>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Kalıcı dosya yolu yalnızca Electron (masaüstü) sürümünde gösterilir; tarayıcıda yalnızca yerel depolama kullanılır.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportJsonBackup}
              disabled={!hydrated}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-bubble transition hover:brightness-110 disabled:opacity-40"
            >
              JSON yedek indir
            </button>
            <button
              type="button"
              onClick={exportExcelStock}
              disabled={!hydrated || parts.length === 0}
              className="rounded-xl border border-ls-line bg-ls-surface px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-card transition hover:bg-slate-50 disabled:opacity-40"
            >
              Excel stok indir
            </button>
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-ls-line bg-ls-surface px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-card transition hover:bg-slate-50">
              <span>JSON yedek yükle</span>
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
          {backupMsg ? (
            <p
              className={`mt-3 text-sm font-medium ${backupMsg.type === 'ok' ? 'text-teal-800' : 'text-red-700'}`}
              role="status"
            >
              {backupMsg.text}
            </p>
          ) : null}

          <div className="mt-8 border-t border-ls-line/80 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Son işlemler (denetim)</h4>
            <p className="mt-1 text-2xs text-slate-500">En fazla son {Math.min(audit.length, 80)} kayıt gösterilir.</p>
            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-ls-line bg-slate-50/50">
              {audit.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Henüz kayıt yok.</p>
              ) : (
                <ul className="divide-y divide-ls-line text-left text-xs">
                  {[...audit].reverse().slice(0, 80).map((a) => (
                    <li key={a.id} className="px-3 py-2.5 text-slate-700">
                      <span className="font-mono text-2xs text-slate-500">
                        {new Date(a.at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="font-semibold text-slate-800">{a.actor}</span>
                      <span className="mx-1.5 text-slate-400">—</span>
                      <span className="text-slate-600">{auditActionLabel[a.action] ?? a.action}</span>
                      {a.mpn && a.mpn !== '—' ? (
                        <>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="font-mono text-teal-900">{a.mpn}</span>
                          {a.action === 'delta' ? (
                            <span className="tabular-nums text-slate-600">
                              {' '}
                              ({a.delta > 0 ? '+' : ''}
                              {a.delta} → {a.quantityAfter})
                            </span>
                          ) : null}
                        </>
                      ) : null}
                      {a.note ? <p className="mt-1 text-2xs text-slate-500">{a.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="ls-card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Hakkında</h3>
          <p className="mt-2 text-sm text-slate-600">LabStock Assistant · Elektronik bileşen envanteri</p>
          <p className="mt-1 text-xs text-slate-500">Sürüm 0.1.0</p>
        </div>
      </section>
    </main>
  )
}
