"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_url = require("node:url");
const path = require("node:path");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: true,
    autoHideMenuBar: true,
    titleBarStyle: "default",
    backgroundColor: "#0f0f1a",
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.once("ready-to-show", () => {
    win == null ? void 0 : win.show();
    win == null ? void 0 : win.focus();
  });
  win.on("closed", () => {
    win = null;
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) {
      electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(() => {
  createWindow();
  setupIPC();
});
function setupIPC() {
  electron.ipcMain.handle("show-notification", (_event, { title, body }) => {
    const notification = new electron.Notification({
      title,
      body
    });
    notification.show();
  });
  electron.ipcMain.handle("get-app-version", () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("minimize-window", () => {
    win == null ? void 0 : win.minimize();
  });
  electron.ipcMain.handle("maximize-window", () => {
    if (win == null ? void 0 : win.isMaximized()) {
      win.restore();
    } else {
      win == null ? void 0 : win.maximize();
    }
  });
  electron.ipcMain.handle("close-window", () => {
    win == null ? void 0 : win.close();
  });
  electron.ipcMain.handle("is-maximized", () => {
    return (win == null ? void 0 : win.isMaximized()) ?? false;
  });
}
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
