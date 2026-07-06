import { app as t, BrowserWindow as a, ipcMain as n, Notification as m, shell as f } from "electron";
import { fileURLToPath as h } from "node:url";
import o from "node:path";
const r = o.dirname(h(import.meta.url));
process.env.APP_ROOT = o.join(r, "..");
const s = process.env.VITE_DEV_SERVER_URL, I = o.join(process.env.APP_ROOT, "dist-electron"), l = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = s ? o.join(process.env.APP_ROOT, "public") : l;
let e;
function d() {
  e = new a({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: !0,
    autoHideMenuBar: !0,
    titleBarStyle: "default",
    backgroundColor: "#0f0f1a",
    show: !1,
    icon: o.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: o.join(r, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0,
      sandbox: !1
    }
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toISOString());
  }), s ? (e.loadURL(s), e.webContents.openDevTools()) : e.loadFile(o.join(l, "index.html")), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.focus();
  }), e.on("closed", () => {
    e = null;
  }), e.webContents.setWindowOpenHandler(({ url: i }) => (i.startsWith("https:") && f.openExternal(i), { action: "deny" }));
}
t.on("window-all-closed", () => {
  process.platform !== "darwin" && (t.quit(), e = null);
});
t.on("activate", () => {
  a.getAllWindows().length === 0 && d();
});
t.whenReady().then(() => {
  d(), u();
});
function u() {
  n.handle("show-notification", (i, { title: c, body: p }) => {
    new m({
      title: c,
      body: p
    }).show();
  }), n.handle("get-app-version", () => t.getVersion()), n.handle("minimize-window", () => {
    e == null || e.minimize();
  }), n.handle("maximize-window", () => {
    e != null && e.isMaximized() ? e.restore() : e == null || e.maximize();
  }), n.handle("close-window", () => {
    e == null || e.close();
  }), n.handle("is-maximized", () => (e == null ? void 0 : e.isMaximized()) ?? !1);
}
export {
  I as MAIN_DIST,
  l as RENDERER_DIST,
  s as VITE_DEV_SERVER_URL
};
