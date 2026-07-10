const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  print: (options) => ipcRenderer.invoke('print-document', options),
  yalidinApi: (action, payload) => ipcRenderer.invoke('yalidin-api', { action, payload }),
});

