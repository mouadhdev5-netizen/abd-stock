const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  print: (options) => ipcRenderer.invoke('print-document', options),
  yalidinApi: (action, payload) => ipcRenderer.invoke('yalidin-api', { action, payload }),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateMessage: (callback) => {
    const subscription = (event, payload) => callback(payload);
    ipcRenderer.on('update-message', subscription);
    return () => ipcRenderer.removeListener('update-message', subscription);
  }
});

