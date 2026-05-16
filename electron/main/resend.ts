export type ResendSendPayload = {
  apiKey: string
  from: string
  to: string
  subject: string
  html: string
}

export type ResendSendResult = { ok: true } | { ok: false; error: string }

export async function sendResendEmail(payload: ResendSendPayload): Promise<ResendSendResult> {
  const apiKey = payload.apiKey?.trim()
  const to = payload.to?.trim().toLowerCase()
  const from = payload.from?.trim()
  if (!apiKey) return { ok: false, error: 'Resend API anahtarı eksik.' }
  if (!to || !to.includes('@')) return { ok: false, error: 'Geçersiz alıcı e-postası.' }
  if (!from) return { ok: false, error: 'Gönderen (From) adresi eksik.' }

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
        html: payload.html,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: mapResendError(res.status, body) }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/fetch failed|network|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
      return {
        ok: false,
        error: `Ağ hatası: ${msg}. İnternet bağlantınızı ve güvenlik duvarını kontrol edin.`,
      }
    }
    return { ok: false, error: msg }
  }
}

function mapResendError(status: number, body: string): string {
  const lower = body.toLowerCase()
  if (
    status === 403 &&
    (lower.includes('only send testing emails') || lower.includes('verify a domain'))
  ) {
    const allowed = body.match(/[\w.+-]+@[\w.-]+\.\w+/gi)?.[0]
    const allowedHint = allowed
      ? ` Şu an yalnızca ${allowed} adresine gönderebilirsiniz.`
      : ' Şu an yalnızca Resend hesabınızdaki e-postaya gönderebilirsiniz.'
    return (
      `Resend test modu: hotmail vb. adreslere mail gitmez.${allowedHint} ` +
      `Diğer adresler için resend.com/domains üzerinden alan adınızı doğrulayın veya kayıtta test e-postanızı kullanın.`
    )
  }
  return `E-posta gönderilemedi (${status}): ${body.slice(0, 180)}`
}
