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
let electronApp: ElectronApplication
let page: Page

async function ensureKayit(p: Page) {
  if (await p.$('#stock-search')) return
  await p.getByTestId('nav-kayit').click()
  await p.waitForSelector('#stock-search', { timeout: 15000 })
}

if (process.platform === 'linux') {
  // pass ubuntu
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

    test('giriş (landing) başlığı', async () => {
      const h1 = await page.$('h1')
      const text = await h1?.textContent()
      expect(text).eq('Depo girişi')
    })

    test('sohbet başlığı', async () => {
      await page.getByTestId('nav-sohbet').click()
      await page.waitForSelector('h1', { timeout: 15000 })
      const h1 = await page.$('h1')
      const text = await h1?.textContent()
      expect(text).eq('Depo asistanı')
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
