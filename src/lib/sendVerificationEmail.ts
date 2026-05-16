import { LS_RESEND_API_KEY, LS_RESEND_FROM } from '@/lib/settingsKeys'
import { getSupabaseClient, isCloudTeamMode } from '@/lib/supabase/client'

function verificationHtml(code: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 12px">E-posta doğrulama</h2>
      <p>LabStock kaydınızı tamamlamak için doğrulama kodunuz:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
      <p style="color:#666;font-size:13px">Kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız e-postayı yoksayın.</p>
    </div>
  `
}

export async function sendVerificationEmail(
  toEmail: string,
  code: string,
): Promise<{ ok: true; devPreviewCode?: string } | { ok: false; error: string }> {
  const to = toEmail.trim().toLowerCase()

  if (isCloudTeamMode()) {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { ok: false, error: 'Supabase yapılandırması eksik.' }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: to,
      options: { shouldCreateUser: true },
    })
    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  }

  const apiKey = readResendKey()
  if (apiKey) {
    const from = readResendFrom()
    const html = verificationHtml(code)
    const payload = {
      apiKey,
      from,
      to,
      subject: 'LabStock doğrulama kodunuz',
      html,
    }

    if (typeof window !== 'undefined' && window.labstock?.sendResendEmail) {
      const res = await window.labstock.sendResendEmail(payload)
      if (!res.ok) return res
      return { ok: true }
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: payload.subject,
          html,
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        return { ok: false, error: `E-posta gönderilemedi (${res.status}): ${body.slice(0, 120)}` }
      }
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'Failed to fetch') {
        return {
          ok: false,
          error:
            'E-posta gönderilemedi (ağ/CORS). LabStock Electron penceresinden deneyin (tarayıcı sekmesi değil).',
        }
      }
      return { ok: false, error: msg }
    }
  }

  if (import.meta.env.DEV) {
    return { ok: true, devPreviewCode: code }
  }

  return {
    ok: false,
    error:
      'E-posta göndermek için .env dosyasına VITE_RESEND_API_KEY ekleyin, Ayarlar → E-posta doğrulama veya Supabase kullanın.',
  }
}

function readResendKey(): string {
  const fromEnv = import.meta.env.VITE_RESEND_API_KEY?.trim()
  if (fromEnv) return fromEnv
  try {
    return localStorage.getItem(LS_RESEND_API_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

function readResendFrom(): string {
  const fromEnv = import.meta.env.VITE_RESEND_FROM?.trim()
  if (fromEnv) return fromEnv
  const fallback = 'LabStock <onboarding@resend.dev>'
  try {
    return localStorage.getItem(LS_RESEND_FROM)?.trim() || fallback
  } catch {
    return fallback
  }
}
