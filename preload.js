const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getApps: () => ipcRenderer.invoke('get-apps'),
  saveApps: (apps) => ipcRenderer.invoke('save-apps', apps),
  selectApp: () => ipcRenderer.invoke('select-app'),
  launchApp: (appPath) => ipcRenderer.invoke('launch-app', appPath),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectIcon: () => ipcRenderer.invoke('select-icon'),
  onAppUpdated: (callback) => ipcRenderer.on('app-updated', callback),
});
