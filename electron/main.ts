import { app, BrowserWindow, ipcMain, shell, Notification } from "electron"
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: true,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f0f1a',
    show: false,
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toISOString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.once('ready-to-show', () => {
    win?.show()
    win?.focus()
  })

  win.on('closed', () => {
    win = null
  })

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

// Handle app events
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  setupIPC()
})

function setupIPC() {
  // Show desktop notification
  ipcMain.handle('show-notification', (_event, { title, body }: { title: string; body: string }) => {
    const notification = new Notification({
      title,
      body,
    })
    notification.show()
  })

  // Open file dialog
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // Minimize window
  ipcMain.handle('minimize-window', () => {
    win?.minimize()
  })

  // Maximize/restore window
  ipcMain.handle('maximize-window', () => {
    if (win?.isMaximized()) {
      win.restore()
    } else {
      win?.maximize()
    }
  })

  // Close window
  ipcMain.handle('close-window', () => {
    win?.close()
  })

  // Check if window is maximized
  ipcMain.handle('is-maximized', () => {
    return win?.isMaximized() ?? false
  })
}
