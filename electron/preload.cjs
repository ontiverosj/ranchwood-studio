const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  importMedia: () => ipcRenderer.invoke('media:import'),
  probeMedia: (filePath) => ipcRenderer.invoke('media:probe', filePath),
  autoEdit: (items) => ipcRenderer.invoke('agent:auto-edit', items),
  claudeStatus: () => ipcRenderer.invoke('claude:status'),
  saveClaudeKey: (apiKey) => ipcRenderer.invoke('claude:save-key', apiKey),
  removeClaudeKey: () => ipcRenderer.invoke('claude:remove-key'),
  testClaude: () => ipcRenderer.invoke('claude:test'),
  exportVideo: (payload) => ipcRenderer.invoke('video:export', payload),
  saveProject: (project) => ipcRenderer.invoke('project:save', project),
  openProject: () => ipcRenderer.invoke('project:open'),
  onExportProgress: (callback) => ipcRenderer.on('export:progress', (_, value) => callback(value))
});
