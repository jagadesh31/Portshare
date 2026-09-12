const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portshare', {
  localRequest: (payload) => ipcRenderer.invoke('portshare:local-request', payload),
});
