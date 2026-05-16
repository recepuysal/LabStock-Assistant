import { FormEvent, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthPasswordField } from '@/components/AuthPasswordField'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '@/lib/authRemember'
import { getVerifiedEmail } from '@/lib/emailOtp'
import { LS_START_ON_KAYIT } from '@/lib/settingsKeys'
import { isCloudTeamMode } from '@/lib/supabase/client'

type Mode = 'login' | 'register'
type RegisterStep = 'email' | 'verify' | 'password'

const BRAND_POINTS = [
  'Stok listesi ve anlık adet takibi',
  'Depo sohbeti ile yapay zeka desteği',
  'Yedekleme ve denetim günlüğü',
]

export function AuthPage() {
  const navigate = useNavigate()
  const {
    user,
    loading,
    modeLabel,
    login,
    register,
    sendRegistrationCode,
    verifyRegistrationCode,
    cancelRegistration,
    resetLocalRegistration,
  } = useAuth()
  const passwordRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>('login')
  const [registerStep, setRegisterStep] = useState<RegisterStep>('email')
  const [email, setEmail] = useState(() => getRememberedEmail())
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [rememberMe, setRememberMe] = useState(() => !!getRememberedEmail())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [devPreviewCode, setDevPreviewCode] = useState<string | null>(null)
  const [codeSentHint, setCodeSentHint] = useState<string | null>(null)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterPassword2, setShowRegisterPassword2] = useState(false)

  useEffect(() => {
    if (successMessage && mode === 'login') {
      passwordRef.current?.focus()
    }
  }, [successMessage, mode])

  useEffect(() => {
    if (registerStep === 'verify') {
      otpRef.current?.focus()
    }
  }, [registerStep])

  function switchMode(next: Mode) {
    if (mode === 'register') {
      cancelRegistration()
    }
    setMode(next)
    setRegisterStep('email')
    setError(null)
    setSuccessMessage(null)
    setCodeSentHint(null)
    setDevPreviewCode(null)
    setOtpCode('')
    setPassword('')
    setPassword2('')
    setShowLoginPassword(false)
    setShowRegisterPassword(false)
    setShowRegisterPassword2(false)
  }

  function handleResetLocalRegistration() {
    setError(null)
    setSuccessMessage(null)
    resetLocalRegistration(email)
    cancelRegistration()
    setRegisterStep('email')
    setOtpCode('')
    setPassword('')
    setPassword2('')
    setDevPreviewCode(null)
    setCodeSentHint(null)
    setSuccessMessage('Yerel kayıt verisi temizlendi. «Doğrulama kodu gönder» ile yeniden deneyin.')
  }

  function goDepo() {
    try {
      if (localStorage.getItem(LS_START_ON_KAYIT) === '1') {
        navigate('/app/kayit', { replace: true })
        return
      }
    } catch {
      /* yoksay */
    }
    navigate('/app', { replace: true })
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCodeSentHint(null)
    setDevPreviewCode(null)
    setBusy(true)
    const res = await sendRegistrationCode(email)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setRegisterStep('verify')
    setOtpCode('')
    if (res.devPreviewCode) {
      setDevPreviewCode(res.devPreviewCode)
      setCodeSentHint('Geliştirme modu: kod aşağıda gösterilir (gerçek e-posta gönderilmedi).')
    } else {
      setCodeSentHint(`${email.trim()} adresine doğrulama kodu gönderildi. Gelen kutunuzu kontrol edin.`)
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await verifyRegistrationCode(email, otpCode)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setRegisterStep('password')
    setPassword('')
    setPassword2('')
    passwordRef.current?.focus()
  }

  async function handleRegisterPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    if (password !== password2) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setBusy(true)
    const res = await register(email, password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    cancelRegistration()
    setSuccessMessage('Kayıt oluşturuldu. Şifrenizi girerek giriş yapın.')
    setMode('login')
    setRegisterStep('email')
    setEmail(res.email)
    setPassword('')
    setPassword2('')
    setOtpCode('')
    setDevPreviewCode(null)
    setCodeSentHint(null)
  }

  async function onSubmitLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setBusy(true)
    const res = await login(email, password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    if (rememberMe) {
      setRememberedEmail(email)
    } else {
      clearRememberedEmail()
    }
    goDepo()
  }

  useEffect(() => {
    if (mode !== 'register') return
    const verified = getVerifiedEmail()
    if (verified && verified === email.trim().toLowerCase()) {
      setRegisterStep('password')
    }
  }, [mode, email])

  if (!loading && user) {
    return <Navigate to="/app" replace />
  }

  const isLogin = mode === 'login'
  const isCloudAuth = isCloudTeamMode()
  const otpMaxLen = isCloudAuth ? 8 : 6
  const otpReady = isCloudAuth ? otpCode.length >= 6 : otpCode.length === 6
  const showResetRegistration =
    mode === 'register' && error !== null && /zaten kayıt|already registered/i.test(error)

  function renderAuthError() {
    if (!error) return null
    return (
      <div className="space-y-2">
        <p
          className="rounded-lg border border-ls-danger/30 bg-ls-danger-soft px-3.5 py-2.5 text-sm text-ls-danger"
          role="alert"
        >
          {error}
        </p>
        {showResetRegistration ? (
          <button
            type="button"
            data-testid="auth-reset-local-registration"
            className="w-full text-center text-sm text-ls-accent underline-offset-2 hover:underline"
            onClick={handleResetLocalRegistration}
          >
            Bu e-postanın yerel kaydını sil ve yeniden dene
          </button>
        ) : null}
      </div>
    )
  }

  const registerSubtitle =
    registerStep === 'email'
      ? 'E-postanıza doğrulama kodu gönderelim.'
      : registerStep === 'verify'
        ? 'E-postanıza gelen doğrulama kodunu girin.'
        : 'E-posta doğrulandı. Şifrenizi belirleyin.'

  return (
    <div className="ls-auth-screen">
      <aside className="ls-auth-brand" aria-hidden={false}>
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ls-accent text-sm font-bold text-ls-on-accent">
              LS
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ls-text">LabStock</p>
              <p className="text-sm text-ls-text-muted">Depo asistanı</p>
            </div>
          </div>
          <p className="mt-10 max-w-sm text-2xl font-semibold leading-snug tracking-tight text-ls-text">
            Elektronik stokunuzu tek yerden yönetin.
          </p>
          <ul className="mt-8 space-y-3">
            {BRAND_POINTS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-ls-text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ls-accent" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ls-text-muted">{modeLabel}</p>
      </aside>

      <div className="ls-auth-panel">
        <header className="flex shrink-0 items-center justify-between px-6 pt-6 sm:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ls-accent text-xs font-bold text-ls-on-accent">
              LS
            </div>
            <span className="text-sm font-semibold text-ls-text">LabStock</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="ls-auth-panel-inner">
          <div className="ls-auth-form-card">
            <div className="mb-6 hidden lg:block">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ls-accent text-sm font-bold text-ls-on-accent">
                LS
              </div>
            </div>

            <h1 className="text-center text-2xl font-semibold tracking-tight text-ls-text lg:text-left">
              {isLogin ? 'Giriş yap' : 'Hesap oluştur'}
            </h1>
            <p className="mt-2 text-center text-sm text-ls-text-muted lg:text-left">
              {isLogin ? 'E-posta ve şifrenizle depoya erişin.' : registerSubtitle}
            </p>

            {!isLogin && registerStep !== 'email' ? (
              <p className="mt-3 text-center text-xs text-ls-text-muted lg:text-left">
                <span className="font-medium text-ls-text">{email.trim()}</span>
                {registerStep === 'verify' ? (
                  <>
                    {' '}
                    ·{' '}
                    <button
                      type="button"
                      className="text-ls-accent underline-offset-2 hover:underline"
                      onClick={() => {
                        setRegisterStep('email')
                        setOtpCode('')
                        setCodeSentHint(null)
                        setDevPreviewCode(null)
                        cancelRegistration()
                      }}
                    >
                      E-postayı değiştir
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}

            {successMessage ? (
              <p
                className="mt-6 rounded-lg border border-ls-accent-border bg-ls-accent-soft px-3.5 py-2.5 text-sm text-ls-accent"
                role="status"
              >
                {successMessage}
              </p>
            ) : null}

            {codeSentHint ? (
              <p
                className="mt-6 rounded-lg border border-ls-accent-border bg-ls-accent-soft px-3.5 py-2.5 text-sm text-ls-accent"
                role="status"
              >
                {codeSentHint}
              </p>
            ) : null}

            {devPreviewCode ? (
              <p
                className="mt-3 rounded-lg border border-dashed border-ls-line bg-ls-surface-2 px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-ls-text"
                data-testid="auth-dev-code"
                role="status"
              >
                {devPreviewCode}
              </p>
            ) : null}

            {isLogin ? (
              <form className="mt-8 space-y-3" onSubmit={(e) => void onSubmitLogin(e)}>
                <div>
                  <label htmlFor="auth-email" className="sr-only">
                    E-posta
                  </label>
                  <input
                    id="auth-email"
                    data-testid="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ls-auth-field"
                    placeholder="E-posta adresi"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="sr-only">
                    Şifre
                  </label>
                  <AuthPasswordField
                    id="auth-password"
                    testId="auth-password"
                    inputRef={passwordRef}
                    value={password}
                    onChange={setPassword}
                    placeholder="Şifre"
                    autoComplete="current-password"
                    visible={showLoginPassword}
                    onToggleVisible={() => setShowLoginPassword((v) => !v)}
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ls-text-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-ls-line text-ls-accent focus:ring-ls-accent/30"
                  />
                  Beni hatırla
                </label>

                {renderAuthError()}

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="auth-submit"
                  className="ls-btn-primary mt-2 w-full py-2.5 text-[0.9375rem] font-semibold"
                >
                  {busy ? 'Bekleyin…' : 'Giriş yap'}
                </button>
              </form>
            ) : registerStep === 'email' ? (
              <form className="mt-8 space-y-3" onSubmit={(e) => void handleSendCode(e)}>
                <div>
                  <label htmlFor="auth-email" className="sr-only">
                    E-posta
                  </label>
                  <input
                    id="auth-email"
                    data-testid="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ls-auth-field"
                    placeholder="E-posta adresi"
                  />
                </div>

                {renderAuthError()}

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="auth-send-code"
                  className="ls-btn-primary mt-2 w-full py-2.5 text-[0.9375rem] font-semibold"
                >
                  {busy ? 'Gönderiliyor…' : 'Doğrulama kodu gönder'}
                </button>
              </form>
            ) : registerStep === 'verify' ? (
              <form className="mt-8 space-y-3" onSubmit={(e) => void handleVerifyCode(e)}>
                <div>
                  <label htmlFor="auth-otp" className="sr-only">
                    Doğrulama kodu
                  </label>
                  <input
                    ref={otpRef}
                    id="auth-otp"
                    data-testid="auth-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={otpMaxLen}
                    pattern={isCloudAuth ? '[0-9]{6,8}' : '[0-9]{6}'}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, otpMaxLen))}
                    className="ls-auth-field text-center font-mono text-lg tracking-[0.35em]"
                    placeholder={isCloudAuth ? '00000000' : '000000'}
                  />
                </div>

                {renderAuthError()}

                <button
                  type="submit"
                  disabled={busy || !otpReady}
                  data-testid="auth-verify-code"
                  className="ls-btn-primary mt-2 w-full py-2.5 text-[0.9375rem] font-semibold"
                >
                  {busy ? 'Doğrulanıyor…' : 'Kodu doğrula'}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  data-testid="auth-resend-code"
                  className="w-full py-2 text-sm text-ls-text-muted hover:text-ls-accent"
                  onClick={() => void handleSendCode({ preventDefault: () => {} } as FormEvent)}
                >
                  Kodu yeniden gönder
                </button>
              </form>
            ) : (
              <form className="mt-8 space-y-3" onSubmit={(e) => void handleRegisterPassword(e)}>
                <div>
                  <label htmlFor="auth-password" className="sr-only">
                    Şifre
                  </label>
                  <AuthPasswordField
                    id="auth-password"
                    testId="auth-password"
                    inputRef={passwordRef}
                    value={password}
                    onChange={setPassword}
                    placeholder="Şifre"
                    autoComplete="new-password"
                    visible={showRegisterPassword}
                    onToggleVisible={() => setShowRegisterPassword((v) => !v)}
                  />
                </div>

                <div>
                  <label htmlFor="auth-password2" className="sr-only">
                    Şifre tekrar
                  </label>
                  <AuthPasswordField
                    id="auth-password2"
                    testId="auth-password2"
                    value={password2}
                    onChange={setPassword2}
                    placeholder="Şifre (tekrar)"
                    autoComplete="new-password"
                    visible={showRegisterPassword2}
                    onToggleVisible={() => setShowRegisterPassword2((v) => !v)}
                  />
                </div>

                {renderAuthError()}

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="auth-submit"
                  className="ls-btn-primary mt-2 w-full py-2.5 text-[0.9375rem] font-semibold"
                >
                  {busy ? 'Bekleyin…' : 'Kayıt ol'}
                </button>
              </form>
            )}

            <p className="ls-auth-divider">veya</p>

            <div className="ls-auth-switch">
              {isLogin ? (
                <>
                  Henüz hesabınız yok mu?
                  <button
                    type="button"
                    data-testid="auth-switch-register"
                    className="ls-auth-switch-btn"
                    onClick={() => switchMode('register')}
                  >
                    Kayıt ol
                  </button>
                </>
              ) : (
                <>
                  Zaten hesabınız var mı?
                  <button
                    type="button"
                    data-testid="auth-switch-login"
                    className="ls-auth-switch-btn"
                    onClick={() => switchMode('login')}
                  >
                    Giriş yap
                  </button>
                </>
              )}
            </div>

            {!isLogin ? (
              <p className="mt-4 text-center text-xs leading-relaxed text-ls-text-muted lg:text-left">
                Yerel modda hesap yalnızca bu cihazda saklanır. E-posta kodu için Ayarlar’dan Resend anahtarı
                eklenebilir; ekip için Supabase kullanılabilir.
              </p>
            ) : null}
          </div>
        </div>

        <footer className="shrink-0 pb-6 text-center text-[11px] text-ls-text-muted lg:hidden">
          {modeLabel}
        </footer>
      </div>
    </div>
  )
}
