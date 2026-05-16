/**
 * Yerel kayıt verisini siler (Electron localStorage).
 * Kullanım: node scripts/purge-local-user.mjs rcp_uysl@hotmail.com
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const email = process.argv[2]?.trim().toLowerCase()

if (!email) {
  console.error('E-posta gerekli: node scripts/purge-local-user.mjs user@example.com')
  process.exit(1)
}

const PURGE_JS = ({ email: norm }) => {
  const registryKey = 'labstock.auth.registry'
  const sessionKey = 'labstock.auth.session'
  const rememberKey = 'labstock.auth.rememberEmail'
  const otpKey = 'labstock.auth.pendingOtp'
  const verifiedKey = 'labstock.session.emailVerified'

  const raw = localStorage.getItem(registryKey)
  const registry = raw ? JSON.parse(raw) : { users: [] }
  const before = registry.users?.length ?? 0
  registry.users = (registry.users ?? []).filter((u) => String(u.email).toLowerCase() !== norm)
  localStorage.setItem(registryKey, JSON.stringify(registry))

  try {
    const sess = JSON.parse(localStorage.getItem(sessionKey) || 'null')
    if (sess?.email?.toLowerCase() === norm) localStorage.removeItem(sessionKey)
    if (localStorage.getItem(rememberKey)?.toLowerCase() === norm) localStorage.removeItem(rememberKey)
    const otp = JSON.parse(localStorage.getItem(otpKey) || 'null')
    if (otp?.email?.toLowerCase() === norm) localStorage.removeItem(otpKey)
    if (sessionStorage.getItem(verifiedKey)?.toLowerCase() === norm) {
      sessionStorage.removeItem(verifiedKey)
    }
  } catch {
    localStorage.removeItem(otpKey)
    sessionStorage.removeItem(verifiedKey)
  }

  return {
    removed: before - (registry.users?.length ?? 0),
    remaining: registry.users?.length ?? 0,
    emails: (registry.users ?? []).map((u) => u.email),
  }
}

let app
try {
  app = await electron.launch({
    args: ['.'],
    cwd: root,
    env: { ...process.env, NODE_ENV: 'development' },
    timeout: 90000,
  })
  const page = await app.firstWindow()
  await page.waitForTimeout(4000)
  const result = await page.evaluate(PURGE_JS, { email })
  console.log(JSON.stringify(result, null, 2))
} catch (e) {
  console.error('Hata:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  if (app) await app.close()
}
