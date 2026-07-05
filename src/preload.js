const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // В новых Electron File.path удалён — реальный путь достаём через webUtils
  getPathForFile: (file) => webUtils.getPathForFile(file),
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  pickOutputDir: () => ipcRenderer.invoke('pick-output-dir'),
  reveal: (p) => ipcRenderer.invoke('reveal', p),
  convert: (opts) => ipcRenderer.invoke('convert', opts),
});
