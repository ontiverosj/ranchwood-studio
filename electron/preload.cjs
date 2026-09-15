const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  importMedia: () => ipcRenderer.invoke('media:import'),
  probeMedia: (filePath) => ipcRenderer.invoke('media:probe', filePath),
  autoEdit: (items) => ipcRenderer.invoke('agent:auto-edit', items),
  exportVideo: (payload) => ipcRenderer.invoke('video:export', payload),
  saveProject: (project) => ipcRenderer.invoke('project:save', project),
  openProject: () => ipcRenderer.invoke('project:open'),
  onExportProgress: (callback) => ipcRenderer.on('export:progress', (_, value) => callback(value))
});
