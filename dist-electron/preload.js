import { contextBridge as r, ipcRenderer as i } from "electron";
r.exposeInMainWorld("ipcRenderer", f(i));
function f(e) {
  const o = Object.getPrototypeOf(e);
  for (const [t, n] of Object.entries(o))
    Object.prototype.hasOwnProperty.call(e, t) || typeof n == "function" && (e[t] = function(...c) {
      return n.call(e, ...c);
    });
  return e;
}
r.exposeInMainWorld("electron", {
  showNotification: (e, o) => i.invoke("show-notification", { title: e, body: o }),
  getAppVersion: () => i.invoke("get-app-version"),
  minimize: () => i.invoke("minimize-window"),
  maximize: () => i.invoke("maximize-window"),
  close: () => i.invoke("close-window"),
  isMaximized: () => i.invoke("is-maximized"),
  on: (e, o) => {
    i.on(e, (t, ...n) => o(...n));
  },
  off: (e, o) => {
    i.off(e, o);
  }
});
