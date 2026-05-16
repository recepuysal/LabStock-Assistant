import path from 'node:path'
import {
  type ElectronApplication,
  type Page,
  type JSHandle,
  _electron as electron,
} from 'playwright'
import type { BrowserWindow } from 'electron'
import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
} from 'vitest'

const root = path.join(__dirname, '..')
const E2E_EMAIL = 'e2e@labstock.test'
const E2E_PASSWORD = 'testpass123'

let electronApp: ElectronApplication
let page: Page

async function ensureLoggedIn(p: Page) {
  const email = p.locator('#auth-email')
  const visible = await email.isVisible().catch(() => false)
  if (!visible) return

  await email.fill(E2E_EMAIL)
  await p.locator('#auth-password').fill(E2E_PASSWORD)
  await p.getByTestId('auth-submit').click()
  await p.waitForTimeout(800)

  const stillAuth = await email.isVisible().catch(() => false)
  if (stillAuth) {
    await p.getByTestId('auth-switch-register').click()
    await email.fill(E2E_EMAIL)
    await p.getByTestId('auth-send-code').click()
    await p.waitForTimeout(600)
    const devCode = await p.getByTestId('auth-dev-code').textContent()
    if (devCode?.trim()) {
      await p.locator('#auth-otp').fill(devCode.trim())
    }
    await p.getByTestId('auth-verify-code').click()
    await p.waitForTimeout(500)
    await p.locator('#auth-password').fill(E2E_PASSWORD)
    await p.locator('#auth-password2').fill(E2E_PASSWORD)
    await p.getByTestId('auth-submit').click()
    await p.waitForTimeout(500)
    await email.fill(E2E_EMAIL)
    await p.locator('#auth-password').fill(E2E_PASSWORD)
    await p.getByTestId('auth-submit').click()
  }

  await p.waitForURL(/#\/app/, { timeout: 15000 })
}

async function ensureKayit(p: Page) {
  if (await p.$('#stock-search')) return
  await p.getByTestId('nav-kayit').click()
  await p.waitForSelector('#stock-search', { timeout: 15000 })
}

if (process.platform === 'linux') {
  test(() => expect(true).true)
} else {
  beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox'],
      cwd: root,
      env: { ...process.env, NODE_ENV: 'development' },
    })
    page = await electronApp.firstWindow()

    const mainWin: JSHandle<BrowserWindow> = await electronApp.browserWindow(page)
    await mainWin.evaluate(async (win) => {
      win.webContents.executeJavaScript('console.log("Execute JavaScript with e2e testing.")')
    })

    await ensureLoggedIn(page)
  })

  afterAll(async () => {
    await page.screenshot({ path: 'test/screenshots/e2e.png' })
    await page.close()
    await electronApp.close()
  })

  describe('LabStock Assistant e2e', async () => {
    test('startup', async () => {
      const title = await page.title()
      expect(title).eq('LabStock Assistant')
    })

    test('depo ana sayfa', async () => {
      await page.goto(`${await page.url()}`.replace(/#.*$/, '') + '#/app')
      await page.waitForSelector('h1', { timeout: 15000 })
      const text = await page.$eval('h1', (el) => el.textContent)
      expect(text).eq('Hoş geldiniz')
    })

    test('sohbet paneli', async () => {
      await page.getByTestId('nav-sohbet').click()
      await page.waitForSelector('text=Depo asistanı', { timeout: 15000 })
    })

    test('stok arama kutusu (Kayıt sayfası)', async () => {
      await ensureKayit(page)
      const input = await page.$('#stock-search')
      expect(input).toBeTruthy()
      await input?.fill('LM358')
      const value = await input?.inputValue()
      expect(value).eq('LM358')
    })

    test('NE555 araması tabloda satır gösterir', async () => {
      await ensureKayit(page)
      const input = await page.$('#stock-search')
      await input?.fill('')
      await input?.fill('NE555')
      const cell = await page.$('text=NE555P')
      expect(cell).toBeTruthy()
    })

    test('Direnç kategorisi yalnızca direnç satırı gösterir', async () => {
      await ensureKayit(page)
      await page.getByRole('tab', { name: 'Tümü' }).click()
      await page.getByRole('tab', { name: 'Direnç' }).click()
      expect(await page.$('text=RC0603FR-0710KL')).toBeTruthy()
      expect(await page.$('text=LM358N')).toBeFalsy()
    })
  })
}
