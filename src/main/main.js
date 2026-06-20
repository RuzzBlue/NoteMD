const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');

const pkg = require('../../package.json');

function readDepVersion(name) {
  try {
    return require(`${name}/package.json`).version;
  } catch {
    return null;
  }
}

/** Grouped for About; any other deps/devDeps appear under "Other". */
const ABOUT_PACKAGE_GROUPS = {
  'Editor & UI': ['tinymce', 'bootstrap'],
  Markdown: ['marked', 'turndown', 'turndown-plugin-gfm'],
  'Import & export': ['rtf-parser'],
  Build: ['electron-builder']
};

function buildAboutComponents() {
  const allPkgNames = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {})
  ]);
  const grouped = new Set(Object.values(ABOUT_PACKAGE_GROUPS).flat());

  const components = [
    {
      group: 'Application',
      items: [{ name: 'NoteMD', version: pkg.version }]
    },
    {
      group: 'Runtime',
      items: [
        { name: 'Electron', version: process.versions.electron },
        { name: 'Chromium', version: process.versions.chrome },
        { name: 'Node.js', version: process.versions.node }
      ]
    }
  ];

  for (const [group, names] of Object.entries(ABOUT_PACKAGE_GROUPS)) {
    const items = names
      .filter((name) => allPkgNames.has(name))
      .map((name) => ({ name, version: readDepVersion(name) }));
    if (items.length) components.push({ group, items });
  }

  const other = [...allPkgNames]
    .filter((name) => !grouped.has(name) && name !== 'electron')
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, version: readDepVersion(name) }));
  if (other.length) {
    components.push({ group: 'Other', items: other });
  }

  return components;
}

const {
  ensureRootInitialized,
  ensureMinimumWorkspace,
  loadDataJson,
  saveDataJson,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listNotes,
  createNote,
  readNoteMarkdown,
  writeNoteMarkdown,
  deleteNote,
  moveNotes,
  renameNote,
  getTempPathForNote,
  readMaybeTempMarkdown,
  writeTempMarkdown,
  deleteTempMarkdown
} = require('./notesStore');
const { importFilesAsNotes } = require('./importNotes');
const { runExport } = require('./exportNote');
const { getExportFormatList, IMPORT_DIALOG_EXTENSIONS } = require('./noteFormats');

// Writable profile/cache (avoids "Access is denied" when launched from restricted dirs).
const userDataDir = path.join(os.homedir(), 'AppData', 'Roaming', 'NoteMD');
app.setPath('userData', userDataDir);
app.commandLine.appendSwitch('disk-cache-dir', path.join(userDataDir, 'Cache'));

let mainWindow = null;
let currentRootPath = null;
let sidebarVisible = true;

/** Default content size on first launch (useContentSize: true). */
const DEFAULT_CONTENT_WIDTH = 1280;
const DEFAULT_CONTENT_HEIGHT = 800;

const WINDOW_MIN_HEIGHT = 600;
/** CSS layout mins (see styles.css); Electron setMinimumSize adds +16px fudge. */
const LAYOUT_MIN_WIDTH_WITH_SIDEBAR = 865;
const LAYOUT_MIN_WIDTH_EDITOR_ONLY = 580;
const WINDOW_MIN_WIDTH_CHROME_FUDGE = 16;
const WINDOW_MIN_WIDTH_WITH_SIDEBAR = LAYOUT_MIN_WIDTH_WITH_SIDEBAR + WINDOW_MIN_WIDTH_CHROME_FUDGE;
const WINDOW_MIN_WIDTH_EDITOR_ONLY = LAYOUT_MIN_WIDTH_EDITOR_ONLY + WINDOW_MIN_WIDTH_CHROME_FUDGE;
/** setContentSize(layout) lands ~2px wider than manual resize when revealing sidebar. */
const SIDEBAR_REVEAL_CONTENT_ADJUST = 2;
const SIDEBAR_REVEAL_CONTENT_WIDTH =
  LAYOUT_MIN_WIDTH_WITH_SIDEBAR - SIDEBAR_REVEAL_CONTENT_ADJUST;

function applyWindowMinimumSize() {
  if (!mainWindow) return;
  const minWidth = sidebarVisible ? WINDOW_MIN_WIDTH_WITH_SIDEBAR : WINDOW_MIN_WIDTH_EDITOR_ONLY;
  const currentMin = mainWindow.getMinimumSize();
  const minHeight = currentMin[1] > 0 ? currentMin[1] : WINDOW_MIN_HEIGHT;
  mainWindow.setMinimumSize(minWidth, minHeight);
}

/** If sidebar is shown while content is narrower than 285+580, grow to layout width. */
function applySidebarVisibility(visible) {
  sidebarVisible = !!visible;
  if (!mainWindow) return;

  if (sidebarVisible) {
    const [width, height] = mainWindow.getContentSize();
    if (width < LAYOUT_MIN_WIDTH_WITH_SIDEBAR) {
      // Expand before raising minimum; use adjusted width so visible size matches 865 layout.
      mainWindow.setContentSize(SIDEBAR_REVEAL_CONTENT_WIDTH, height);
    }
  }

  applyWindowMinimumSize();
}

function resizeToLayoutMinWidth() {
  if (!mainWindow) return;
  const targetWidth = sidebarVisible
    ? LAYOUT_MIN_WIDTH_WITH_SIDEBAR
    : LAYOUT_MIN_WIDTH_EDITOR_ONLY;
  const [, height] = mainWindow.getContentSize();
  mainWindow.setContentSize(targetWidth, height);
}

function resizeToDefaultLayout() {
  if (!mainWindow) return;
  if (!sidebarVisible) {
    applySidebarVisibility(true);
    mainWindow.webContents.send('ui:sidebarVisible', true);
  }
  const [, height] = mainWindow.getContentSize();
  mainWindow.setContentSize(
    DEFAULT_CONTENT_WIDTH,
    height >= WINDOW_MIN_HEIGHT ? height : DEFAULT_CONTENT_HEIGHT
  );
}

const appConfigPath = path.join(userDataDir, 'config.json');

async function loadAppConfig() {
  try {
    const raw = await fsp.readFile(appConfigPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveAppConfig(config) {
  await fsp.writeFile(appConfigPath, JSON.stringify(config, null, 2), 'utf8');
}

async function saveLastRootPath(rootPath) {
  const config = await loadAppConfig();
  config.lastRootPath = rootPath;
  await saveAppConfig(config);
}

async function clearLastRootPath() {
  const config = await loadAppConfig();
  delete config.lastRootPath;
  await saveAppConfig(config);
}

async function saveDarkMode(enabled) {
  const config = await loadAppConfig();
  config.darkMode = !!enabled;
  await saveAppConfig(config);
}

async function pathExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Change Root Folder…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:requestChangeRoot');
          }
        },
        { type: 'separator' },
        {
          label: 'Import Notes…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:showImport');
          }
        },
        {
          label: 'Export Notes…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:showExport');
          }
        },
        {
          label: 'Move Notes…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:showMoveNotes');
          }
        },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Layout',
          submenu: [
            {
              label: 'Toggle Sidebar',
              accelerator: 'Ctrl+B',
              click: () => {
                applySidebarVisibility(!sidebarVisible);
                if (mainWindow) mainWindow.webContents.send('ui:sidebarVisible', sidebarVisible);
              }
            },
            {
              label: 'Resize to Default',
              accelerator: 'Ctrl+D',
              click: () => resizeToDefaultLayout()
            },
            {
              label: 'Resize to Minimum Width',
              click: () => resizeToLayoutMinWidth()
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Full Screen',
          accelerator: 'F11',
          role: 'togglefullscreen'
        },
        {
          label: 'Minimize',
          role: 'minimize'
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'Ctrl+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:reloadWorkspace');
          }
        }
      ]
    },
    {
      label: 'Editor',
      submenu: [
        {
          label: 'Rich Text Editor',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:setEditorMode');
          }
        },
        {
          label: 'Markdown',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:setMarkdownMode');
          }
        },
        {
          label: 'HTML Source Code…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:openEditorSourceCode');
          }
        },
        { type: 'separator' },
        {
          label: 'Full Screen Editor',
          accelerator: 'Ctrl+Shift+F',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:editorFullscreen');
          }
        }
      ]
    },
    {
      label: 'Dev',
      submenu: [
        {
          label: 'Developer Tools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' });
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Info…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:showInfo');
          }
        },
        {
          label: 'About…',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('ui:showAbout');
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: DEFAULT_CONTENT_WIDTH,
    height: DEFAULT_CONTENT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH_WITH_SIDEBAR,
    minHeight: WINDOW_MIN_HEIGHT,
    useContentSize: true,
    show: false,
    backgroundColor: '#f3f4f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.focus();
  });

  await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createMenu();
  await createWindow();

  if (mainWindow) {
    mainWindow.webContents.send('ui:sidebarVisible', sidebarVisible);
  }
});

function closeDevToolsBeforeShutdown() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const wc = mainWindow.webContents;
  if (wc.isDevToolsOpened()) {
    wc.closeDevTools();
  }
}

// DevTools may call Autofill.* CDP methods on quit; Electron does not implement them.
app.on('before-quit', () => {
  closeDevToolsBeforeShutdown();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

function activateMainWindow(win = mainWindow) {
  if (!win) return false;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
  win.webContents.focus();
  return true;
}

ipcMain.handle('app:focusWindow', () => {
  return { ok: activateMainWindow(BrowserWindow.getFocusedWindow() || mainWindow) };
});

ipcMain.handle('app:setSidebarVisible', (_evt, visible) => {
  applySidebarVisibility(visible);
  return { ok: true, sidebarVisible };
});

ipcMain.handle('app:resizeToLayoutMin', () => {
  if (!mainWindow) return { ok: false };
  resizeToLayoutMinWidth();
  const [width, height] = mainWindow.getContentSize();
  return { ok: true, width, height, sidebarVisible };
});

ipcMain.handle('app:resizeToDefault', () => {
  if (!mainWindow) return { ok: false };
  resizeToDefaultLayout();
  const [width, height] = mainWindow.getContentSize();
  return { ok: true, width, height, sidebarVisible };
});

ipcMain.handle('app:confirm', async (evt, payload = {}) => {
  const parent = BrowserWindow.fromWebContents(evt.sender) || mainWindow;
  const { title = 'Confirm', message = '', confirmLabel = 'OK', cancelLabel = 'Cancel' } = payload;
  const result = await dialog.showMessageBox(parent, {
    type: 'warning',
    title,
    message,
    buttons: [cancelLabel, confirmLabel],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  });
  activateMainWindow(parent);
  return { ok: result.response === 1 };
});

ipcMain.handle('app:getPreferences', async () => {
  const config = await loadAppConfig();
  return { darkMode: !!config.darkMode };
});

ipcMain.handle('app:setDarkMode', async (_evt, enabled) => {
  await saveDarkMode(enabled);
  return { ok: true, darkMode: !!enabled };
});

ipcMain.handle('app:getInfo', async () => {
  const dependencies = {};
  const devDependencies = {};
  for (const name of Object.keys(pkg.dependencies || {})) {
    dependencies[name] = readDepVersion(name);
  }
  for (const name of Object.keys(pkg.devDependencies || {})) {
    devDependencies[name] = readDepVersion(name);
  }

  return {
    appName: pkg.build?.productName || 'NoteMD',
    appVersion: pkg.version,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    defaultWindowSize: {
      width: DEFAULT_CONTENT_WIDTH,
      height: DEFAULT_CONTENT_HEIGHT
    },
    components: buildAboutComponents(),
    dependencies,
    devDependencies
  };
});

ipcMain.handle('root:getLast', async () => {
  const config = await loadAppConfig();
  const lastRootPath = config.lastRootPath || null;
  if (!lastRootPath) return { ok: false, reason: 'none' };
  if (!(await pathExists(lastRootPath))) {
    await clearLastRootPath();
    return { ok: false, reason: 'missing', path: lastRootPath };
  }
  return { ok: true, path: lastRootPath };
});

ipcMain.handle('root:choose', async (_evt) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose NoteMD Root Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (mainWindow) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  if (res.canceled || !res.filePaths?.[0]) return { canceled: true };
  return { canceled: false, path: res.filePaths[0] };
});

ipcMain.handle('root:set', async (_evt, rootPath) => {
  if (!rootPath || !(await pathExists(rootPath))) {
    return { ok: false, error: 'Root folder does not exist' };
  }
  currentRootPath = rootPath;
  await ensureRootInitialized(currentRootPath);
  const data = await loadDataJson(currentRootPath);
  const workspace = await ensureMinimumWorkspace(currentRootPath, data);
  await saveDataJson(currentRootPath, workspace.data);
  await saveLastRootPath(currentRootPath);
  return {
    ok: true,
    rootPath: currentRootPath,
    data: workspace.data,
    projectsOnDisk: workspace.projectsOnDisk
  };
});

ipcMain.handle('projects:list', async () => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  const data = await loadDataJson(currentRootPath);
  const workspace = await ensureMinimumWorkspace(currentRootPath, data);
  await saveDataJson(currentRootPath, workspace.data);
  return {
    ok: true,
    rootPath: currentRootPath,
    data: workspace.data,
    projectsOnDisk: workspace.projectsOnDisk
  };
});

ipcMain.handle('projects:create', async (_evt, payload) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  const created = await createProject(currentRootPath, payload);
  const data = await loadDataJson(currentRootPath);
  const updated = await createProjectMetadata(currentRootPath, data, created.name, created.meta);
  await saveDataJson(currentRootPath, updated);
  return { ok: true };
});

async function createProjectMetadata(_rootPath, data, folderName, meta) {
  const next = structuredClone(data);
  next.folders = next.folders || {};
  next.folders[folderName] = meta;
  next.folders = resequenceOrders(next.folders);
  return next;
}

function resequenceOrders(foldersMap) {
  const entries = Object.entries(foldersMap).map(([name, meta]) => ({
    name,
    meta: { ...meta }
  }));
  entries.sort((a, b) => (a.meta.order ?? 0) - (b.meta.order ?? 0));
  entries.forEach((e, idx) => (e.meta.order = idx + 1));
  return Object.fromEntries(entries.map((e) => [e.name, e.meta]));
}

ipcMain.handle('projects:update', async (_evt, payload) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  // payload: { originalName, name, color, icon, move: -1|0|+1 }
  const data = await loadDataJson(currentRootPath);
  const result = await updateProject(currentRootPath, data, payload);
  await saveDataJson(currentRootPath, result.data);
  return { ok: true };
});

ipcMain.handle('projects:delete', async (_evt, folderName) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  const data = await loadDataJson(currentRootPath);
  const result = await deleteProject(currentRootPath, data, folderName);
  await saveDataJson(currentRootPath, result.data);
  return {
    ok: true,
    data: result.data,
    projectsOnDisk: result.projectsOnDisk
  };
});

ipcMain.handle('notes:list', async (_evt, folderName) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  const notes = await listNotes(currentRootPath, folderName);
  return { ok: true, notes };
});

ipcMain.handle('notes:create', async (_evt, folderName) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  const created = await createNote(currentRootPath, folderName);
  return { ok: true, note: created };
});

ipcMain.handle('notes:read', async (_evt, folderName, noteFile) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  const md = await readMaybeTempMarkdown(currentRootPath, folderName, noteFile);
  const tempPath = getTempPathForNote(currentRootPath, folderName, noteFile);
  const hasTemp = fs.existsSync(tempPath);
  return { ok: true, markdown: md, hasTemp };
});

ipcMain.handle('notes:save', async (_evt, folderName, noteFile, markdown) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  await writeNoteMarkdown(currentRootPath, folderName, noteFile, markdown);
  await deleteTempMarkdown(currentRootPath, folderName, noteFile);
  return { ok: true };
});

ipcMain.handle('notes:autosaveTemp', async (_evt, folderName, noteFile, markdown) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  await writeTempMarkdown(currentRootPath, folderName, noteFile, markdown);
  return { ok: true };
});

ipcMain.handle('notes:discardTemp', async (_evt, folderName, noteFile) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  await deleteTempMarkdown(currentRootPath, folderName, noteFile);
  const md = await readNoteMarkdown(currentRootPath, folderName, noteFile);
  return { ok: true, markdown: md };
});

ipcMain.handle('notes:rename', async (_evt, folderName, oldFile, newFile) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  await renameNote(currentRootPath, folderName, oldFile, newFile);
  return { ok: true };
});

ipcMain.handle('notes:delete', async (_evt, folderName, noteFile) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  await deleteNote(currentRootPath, folderName, noteFile);
  await deleteTempMarkdown(currentRootPath, folderName, noteFile);
  return { ok: true };
});

ipcMain.handle('notes:moveMany', async (_evt, payload) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  try {
    const moves = payload?.moves || [];
    if (!moves.length) {
      return { ok: false, error: 'No notes selected to move', moved: [], failed: [] };
    }
    return await moveNotes(currentRootPath, moves);
  } catch (err) {
    return { ok: false, error: err?.message || String(err), moved: [], failed: [] };
  }
});

ipcMain.handle('import:pickFiles', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Import notes',
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Supported notes',
        extensions: IMPORT_DIALOG_EXTENSIONS
      },
      { name: 'All files', extensions: ['*'] }
    ]
  });
  if (mainWindow) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  if (res.canceled || !res.filePaths?.length) return { canceled: true, paths: [] };
  return { canceled: false, paths: res.filePaths };
});

ipcMain.handle('import:fromPaths', async (_evt, filePaths) => {
  if (!currentRootPath) return { ok: false, error: 'Root not set' };
  try {
    return await importFilesAsNotes(currentRootPath, filePaths);
  } catch (err) {
    return { ok: false, error: err?.message || String(err), imported: [], failed: [] };
  }
});

ipcMain.handle('export:getFormats', async () => ({
  ok: true,
  formats: getExportFormatList()
}));

ipcMain.handle('export:run', async (_evt, payload) => {
  if (!currentRootPath) return { ok: false, canceled: false, error: 'Root not set' };
  try {
    const focusWindow = () => {
      if (mainWindow) {
        mainWindow.focus();
        mainWindow.webContents.focus();
      }
    };
    const result = await runExport(
      currentRootPath,
      payload,
      (opts) => dialog.showSaveDialog(mainWindow, opts).then((res) => {
        focusWindow();
        return res;
      }),
      (opts) =>
        dialog.showOpenDialog(mainWindow, { ...opts, properties: ['openDirectory', 'createDirectory'] }).then(
          (res) => {
            focusWindow();
            return res;
          }
        )
    );
    return result;
  } catch (err) {
    return { ok: false, canceled: false, error: err?.message || String(err) };
  }
});

