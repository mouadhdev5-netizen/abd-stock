"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", withPrototype(electron.ipcRenderer));
function withPrototype(obj) {
  const protos = Object.getPrototypeOf(obj);
  for (const [key, value] of Object.entries(protos)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) continue;
    if (typeof value === "function") {
      obj[key] = function(...args) {
        return value.call(obj, ...args);
      };
    }
  }
  return obj;
}
electron.contextBridge.exposeInMainWorld("electron", {
  showNotification: (title, body) => electron.ipcRenderer.invoke("show-notification", { title, body }),
  getAppVersion: () => electron.ipcRenderer.invoke("get-app-version"),
  minimize: () => electron.ipcRenderer.invoke("minimize-window"),
  maximize: () => electron.ipcRenderer.invoke("maximize-window"),
  close: () => electron.ipcRenderer.invoke("close-window"),
  isMaximized: () => electron.ipcRenderer.invoke("is-maximized"),
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel, callback) => {
    electron.ipcRenderer.off(channel, callback);
  }
});
