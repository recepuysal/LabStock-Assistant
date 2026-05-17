import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { depoChat, type DepoChatPayload } from './depoChat'
import { geminiGenerateContent, type GeminiAskPayload } from './gemini'
import { getLabstockDataPath, loadLabstockDataFile, saveLabstockDataFile } from './persistence'
import { importFromSupplierUrl } from './supplierImport'
import { sendResendEmail, type ResendSendPayload } from './resend'
import { update } from './update'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

/** Vite hazır olmadan Electron açılırsa boş sayfa olur; kısa aralıklarla yeniden dene. */
async function loadDevServerWithRetry(
  browserWin: BrowserWindow,
  url: string,
  maxAttempts = 40,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (browserWin.isDestroyed()) return
    try {
      await browserWin.loadURL(url)
      return
    } catch {
      await new Promise((r) => setTimeout(r, Math.min(250 * attempt, 2000)))
    }
  }
  console.error('[electron] Dev sunucuya bağlanılamadı:', url)
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'LabStock Assistant',
    width: 1100,
    height: 760,
    minWidth: 880,
    minHeight: 560,
    show: false,
    backgroundColor: '#f1f5f9',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
    win?.focus()
  })

  if (VITE_DEV_SERVER_URL) { // #298
    const devUrl = VITE_DEV_SERVER_URL
    void loadDevServerWithRetry(win, devUrl)
    if (process.env.OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
    win.webContents.on('did-fail-load', (_event, errorCode, _desc, validatedURL) => {
      // ERR_ABORTED (-3): yeni yükleme başladığında önceki istek iptal edilir
      if (errorCode === -3) return
      if (validatedURL.startsWith(devUrl)) {
        setTimeout(() => {
          if (win && !win.isDestroyed()) void loadDevServerWithRetry(win, devUrl, 5)
        }, 800)
      }
    })
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(win)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

ipcMain.handle('labstock:gemini-ask', async (_event, payload: GeminiAskPayload) => {
  return geminiGenerateContent(payload)
})

ipcMain.handle('labstock:depo-chat', async (_event, payload: DepoChatPayload) => {
  return depoChat(payload)
})

ipcMain.handle('labstock:persistence-load', async () => {
  return loadLabstockDataFile()
})

ipcMain.handle('labstock:persistence-save', async (_event, json: string) => {
  if (typeof json !== 'string' || json.length > 50 * 1024 * 1024) {
    return { ok: false, error: 'Geçersiz veri boyutu.' }
  }
  return saveLabstockDataFile(json)
})

ipcMain.handle('labstock:persistence-path', () => {
  return getLabstockDataPath()
})

ipcMain.handle('labstock:resend-send', async (_event, payload: ResendSendPayload) => {
  return sendResendEmail(payload)
})

ipcMain.handle('labstock:import-supplier-url', async (_event, payload: { url?: string }) => {
  const url = typeof payload?.url === 'string' ? payload.url : ''
  return importFromSupplierUrl(url)
})
