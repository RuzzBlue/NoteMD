const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('notemd', {
  // root
  chooseRoot: () => ipcRenderer.invoke('root:choose'),
  getLastRoot: () => ipcRenderer.invoke('root:getLast'),
  setRoot: (rootPath) => ipcRenderer.invoke('root:set', rootPath),

  // projects
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (payload) => ipcRenderer.invoke('projects:create', payload),
  updateProject: (payload) => ipcRenderer.invoke('projects:update', payload),
  deleteProject: (folderName) => ipcRenderer.invoke('projects:delete', folderName),

  // notes
  listNotes: (folderName) => ipcRenderer.invoke('notes:list', folderName),
  createNote: (folderName) => ipcRenderer.invoke('notes:create', folderName),
  readNote: (folderName, noteFile) => ipcRenderer.invoke('notes:read', folderName, noteFile),
  saveNote: (folderName, noteFile, markdown) => ipcRenderer.invoke('notes:save', folderName, noteFile, markdown),
  autosaveTemp: (folderName, noteFile, markdown) =>
    ipcRenderer.invoke('notes:autosaveTemp', folderName, noteFile, markdown),
  discardTemp: (folderName, noteFile) => ipcRenderer.invoke('notes:discardTemp', folderName, noteFile),
  renameNote: (folderName, oldFile, newFile) => ipcRenderer.invoke('notes:rename', folderName, oldFile, newFile),
  deleteNote: (folderName, noteFile) => ipcRenderer.invoke('notes:delete', folderName, noteFile),
  moveNotes: (payload) => ipcRenderer.invoke('notes:moveMany', payload),

  // import
  pickImportFiles: () => ipcRenderer.invoke('import:pickFiles'),
  importFromPaths: (filePaths) => ipcRenderer.invoke('import:fromPaths', filePaths),
  getPathForFile: (file) => {
    if (webUtils?.getPathForFile) return webUtils.getPathForFile(file);
    return file?.path || '';
  },

  // export
  getExportFormats: () => ipcRenderer.invoke('export:getFormats'),
  exportNotes: (payload) => ipcRenderer.invoke('export:run', payload),

  // app
  focusWindow: () => ipcRenderer.invoke('app:focusWindow'),
  setSidebarVisible: (visible) => ipcRenderer.invoke('app:setSidebarVisible', visible),
  resizeToLayoutMin: () => ipcRenderer.invoke('app:resizeToLayoutMin'),
  confirm: (payload) => ipcRenderer.invoke('app:confirm', payload),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  getPreferences: () => ipcRenderer.invoke('app:getPreferences'),
  setDarkMode: (enabled) => ipcRenderer.invoke('app:setDarkMode', enabled),

  // events
  onSidebarVisible: (cb) => ipcRenderer.on('ui:sidebarVisible', (_e, v) => cb(v)),
  onRequestChangeRoot: (cb) => ipcRenderer.on('ui:requestChangeRoot', () => cb()),
  onReloadWorkspace: (cb) => ipcRenderer.on('ui:reloadWorkspace', () => cb()),
  onShowInfo: (cb) => ipcRenderer.on('ui:showInfo', () => cb()),
  onShowAbout: (cb) => ipcRenderer.on('ui:showAbout', () => cb()),
  onShowImport: (cb) => ipcRenderer.on('ui:showImport', () => cb()),
  onShowExport: (cb) => ipcRenderer.on('ui:showExport', () => cb()),
  onShowMoveNotes: (cb) => ipcRenderer.on('ui:showMoveNotes', () => cb()),
  onSetMarkdownMode: (cb) => ipcRenderer.on('ui:setMarkdownMode', () => cb()),
  onSetEditorMode: (cb) => ipcRenderer.on('ui:setEditorMode', () => cb()),
  onOpenEditorSourceCode: (cb) => ipcRenderer.on('ui:openEditorSourceCode', () => cb()),
  onEditorFullscreen: (cb) => ipcRenderer.on('ui:editorFullscreen', () => cb())
});
