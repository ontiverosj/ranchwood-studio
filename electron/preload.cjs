const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  importMedia: () => ipcRenderer.invoke('media:import'),
  exportVideo: (payload) => ipcRenderer.invoke('video:export', payload),
  saveProject: (project) => ipcRenderer.invoke('project:save', project),
  openProject: () => ipcRenderer.invoke('project:open'),
  onExportProgress: (callback) => ipcRenderer.on('export:progress', (_, value) => callback(value))
});
