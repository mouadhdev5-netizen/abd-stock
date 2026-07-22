const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure electron-log
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ABD Stock',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle WhatsApp popup internally or with a BrowserView if needed
  // For now, external links open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Check for updates automatically in the background
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    if (mainWindow) mainWindow.webContents.send('update-message', { type: 'checking-for-update' });
  });
  autoUpdater.on('update-available', (info) => {
    log.info('Update available.');
    if (mainWindow) mainWindow.webContents.send('update-message', { type: 'update-available', info });
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
    if (mainWindow) mainWindow.webContents.send('update-message', { type: 'update-not-available', info });
  });
  autoUpdater.on('error', (err) => {
    log.info('Error in auto-updater. ' + err);
    if (mainWindow) mainWindow.webContents.send('update-message', { type: 'update-error', error: err.message });
  });
  autoUpdater.on('download-progress', (progressObj) => {
    log.info('Download progress: ' + progressObj.percent + '%');
    if (mainWindow) mainWindow.webContents.send('update-message', { type: 'download-progress', progress: progressObj });
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    if (mainWindow) mainWindow.webContents.send('update-message', { type: 'update-downloaded', info });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Example IPC handler for printing silently
ipcMain.handle('print-document', async (event, options) => {
  if (mainWindow) {
    mainWindow.webContents.print({ silent: true, ...options });
    return true;
  }
  return false;
});

// AutoUpdater manual trigger IPC handlers
ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Yalidin API proxy — runs in Node.js, no CORS issues
const https = require('https');

const YALIDIN_BASE_URL = 'api.yalidin.com';
const YALIDIN_API_ID = process.env.YALIDIN_API_ID || 'YOUR_API_ID';
const YALIDIN_API_TOKEN = process.env.YALIDIN_API_TOKEN || 'A2f6u0zGFoV0iprNTdICKfHhnbPQa3DySQ2hiNULhlEZDn4gzArNtrgJcPUw';

function nodeHttpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

ipcMain.handle('yalidin-api', async (event, { action, payload }) => {
  try {
    let result;
    const headers = {
      'X-API-ID': YALIDIN_API_ID,
      'X-API-TOKEN': YALIDIN_API_TOKEN,
      'Content-Type': 'application/json',
    };

    if (action === 'createShipment') {
      const body = JSON.stringify(payload);
      headers['Content-Length'] = Buffer.byteLength(body);
      
      result = await nodeHttpRequest({
        hostname: YALIDIN_BASE_URL,
        path: '/v1/parcels/',
        method: 'POST',
        headers,
      }, body);
    } else if (action === 'getShipmentStatus') {
      const trackingQuery = payload.join(',');
      result = await nodeHttpRequest({
        hostname: YALIDIN_BASE_URL,
        path: `/v1/histories/?tracking=${trackingQuery}`,
        method: 'GET',
        headers: {
          'X-API-ID': YALIDIN_API_ID,
          'X-API-TOKEN': YALIDIN_API_TOKEN,
        },
      }, null);
    } else {
      return { error: `Unknown action: ${action}` };
    }
    return result.data;
  } catch (error) {
    return { error: error.message };
  }
});

