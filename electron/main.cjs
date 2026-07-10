const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
    if (url.includes('whatsapp.com')) {
      // You could handle this as a native window, but default browser is usually preferred
      // require('electron').shell.openExternal(url);
      return { action: 'allow' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

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

// Yalidin API proxy — runs in Node.js, no CORS issues
const https = require('https');

const YALIDIN_BASE_URL = 'api.yalidin.com';
const YALIDIN_KEY = 'A2f6u0zGFoV0iprNTdICKfHhnbPQa3DySQ2hiNULhlEZDn4gzArNtrgJcPUw';

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
    if (action === 'createShipment') {
      const body = JSON.stringify(payload);
      result = await nodeHttpRequest({
        hostname: YALIDIN_BASE_URL,
        path: '/v1/parcels/',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${YALIDIN_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, body);
    } else if (action === 'getShipmentStatus') {
      const trackingQuery = payload.join(',');
      result = await nodeHttpRequest({
        hostname: YALIDIN_BASE_URL,
        path: `/v1/histories/?tracking=${trackingQuery}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${YALIDIN_KEY}`,
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

