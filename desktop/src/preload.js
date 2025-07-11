const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readClipboard: () => ipcRenderer.invoke('clipboard:readText'),
    writeClipboard: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    getLocalIP: () => ipcRenderer.invoke('system:getLocalIP'),
    onGlobalPaste: (callback) => ipcRenderer.on('global-paste', callback),
});
