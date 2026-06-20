/* global tinymce, marked, TurndownService, turndownPluginGfm, bootstrap */

const UI = {
  rootPath: document.getElementById('rootPath'),
  btnChangeRoot: document.getElementById('btnChangeRoot'),
  btnHideSidebar: document.getElementById('btnHideSidebar'),
  btnShowSidebar: document.getElementById('btnShowSidebar'),
  sidebar: document.getElementById('sidebar'),
  mainArea: document.querySelector('.main-area'),
  projectSort: document.getElementById('projectSort'),
  btnAddProject: document.getElementById('btnAddProject'),
  projectList: document.getElementById('projectList'),

  tabsLeft: document.getElementById('tabsLeft'),
  tabsRight: document.getElementById('tabsRight'),
  tabsScroller: document.getElementById('tabsScroller'),
  noteTabs: document.getElementById('noteTabs'),
  btnAddNote: document.getElementById('btnAddNote'),

  noteName: document.getElementById('noteName'),
  unsavedBadge: document.getElementById('unsavedBadge'),
  modeEditor: document.getElementById('modeEditor'),
  modeMarkdown: document.getElementById('modeMarkdown'),
  btnToggleTheme: document.getElementById('btnToggleTheme'),
  btnDiscard: document.getElementById('btnDiscard'),
  btnSave: document.getElementById('btnSave'),
  btnMoveNote: document.getElementById('btnMoveNote'),
  btnDeleteNote: document.getElementById('btnDeleteNote'),

  emptyState: document.getElementById('emptyState'),
  btnChooseRootEmpty: document.getElementById('btnChooseRootEmpty'),

  markdownRaw: document.getElementById('markdownRaw'),
  editorWrap: document.getElementById('editorWrap'),
  tinymceHost: document.getElementById('tinymceHost'),

  // modal
  projectModalEl: document.getElementById('projectModal'),
  projectModalTitle: document.getElementById('projectModalTitle'),
  btnDeleteProjectFooter: document.getElementById('btnDeleteProjectFooter'),
  projectOrderDisplay: document.getElementById('projectOrderDisplay'),
  projectName: document.getElementById('projectName'),
  iconGrid: document.getElementById('iconGrid'),
  colorGrid: document.getElementById('colorGrid'),
  colorPicker: document.getElementById('colorPicker'),
  colorHex: document.getElementById('colorHex'),
  btnOrderUp: document.getElementById('btnOrderUp'),
  btnOrderDown: document.getElementById('btnOrderDown'),
  btnProjectSave: document.getElementById('btnProjectSave'),

  infoModalEl: document.getElementById('infoModal'),
  infoAppVersion: document.getElementById('infoAppVersion'),
  aboutModalEl: document.getElementById('aboutModal'),
  aboutVersionsList: document.getElementById('aboutVersionsList'),

  importModalEl: document.getElementById('importModal'),
  importDropZone: document.getElementById('importDropZone'),
  importFileInput: document.getElementById('importFileInput'),
  importFileList: document.getElementById('importFileList'),
  importStatus: document.getElementById('importStatus'),
  btnImportConfirm: document.getElementById('btnImportConfirm'),

  exportModalEl: document.getElementById('exportModal'),
  exportScopeSelect: document.getElementById('exportScopeSelect'),
  exportLayoutGroup: document.getElementById('exportLayoutGroup'),
  exportLayoutStructure: document.getElementById('exportLayoutStructure'),
  exportLayoutFlat: document.getElementById('exportLayoutFlat'),
  exportFormatSelect: document.getElementById('exportFormatSelect'),
  exportStatus: document.getElementById('exportStatus'),
  btnExportConfirm: document.getElementById('btnExportConfirm'),

  moveNotesModalEl: document.getElementById('moveNotesModal'),
  moveSourceProject: document.getElementById('moveSourceProject'),
  moveDestProject: document.getElementById('moveDestProject'),
  moveSourceList: document.getElementById('moveSourceList'),
  moveDestList: document.getElementById('moveDestList'),
  moveNotesStatus: document.getElementById('moveNotesStatus'),
  btnMoveNotesConfirm: document.getElementById('btnMoveNotesConfirm'),

  tinymceSetupModalEl: document.getElementById('tinymceSetupModal'),
  tinymceSetupInput: document.getElementById('tinymceSetupInput'),
  tinymceSetupShowKey: document.getElementById('tinymceSetupShowKey'),
  tinymceSetupStatus: document.getElementById('tinymceSetupStatus'),
  btnTinyMceSetupSave: document.getElementById('btnTinyMceSetupSave'),
  btnTinyMceSetupCancel: document.getElementById('btnTinyMceSetupCancel'),
  btnTinyMceSetupClose: document.getElementById('btnTinyMceSetupClose'),
  linkTinyMceSignup: document.getElementById('linkTinyMceSignup')
};

const IMPORTS_PROJECT = 'Imports';

const moveNotesModalState = {
  sourceProject: null,
  destProject: null,
  allSourceNotes: [],
  stagedNotes: []
};

const importModalState = {
  paths: []
};

const state = {
  rootPath: null,
  data: null, // data.json contents
  projectsOnDisk: [],
  selectedProject: null,
  notes: [],
  selectedNote: null,
  markdownMode: false,
  darkMode: false,
  tinymceApiKey: null,
  dirty: false,
  hasTemp: false,
  projectSort: 'custom',
  projectModal: {
    mode: 'create', // create|edit
    originalName: null,
    name: '',
    icon: 'fa-folder',
    color: '#2b6cb0',
    move: 0,
    baseOrder: 1,
    orderDelta: 0
  },
  autosaveTimer: null,
  suppressAutosave: false
};

/** In-memory TinyMCE undo/content per note tab (cleared on workspace reload). */
const noteEditorSessions = new Map();

/** Must match notesStore.js defaults for post-delete recreation. */
const BOOTSTRAP_PROJECT = 'Folder1';
const BOOTSTRAP_NOTE = 'Note1.md';
const REPLACEMENT_NOTE = 'Untitled 1.md';

/** Lazy init — TinyMCE must not initialize while #tinymceHost is hidden (breaks focus/iframe). */
let editorInitPromise = null;
let tinyMceSetupPromise = null;

const TINYMCE_SIGNUP_URL = 'https://www.tiny.cloud/auth/signup/';
let editorResizeObserver = null;

const ICONS = [
  'fa-folder',
  'fa-folder-open',
  'fa-book',
  'fa-pen',
  'fa-code',
  'fa-terminal',
  'fa-bug',
  'fa-flask',
  'fa-diagram-project',
  'fa-sitemap',
  'fa-list-check',
  'fa-square-check',
  'fa-circle-check',
  'fa-clipboard',
  'fa-file-lines',
  'fa-file-code',
  'fa-file-word',
  'fa-file-pdf',
  'fa-image',
  'fa-camera',
  'fa-music',
  'fa-video',
  'fa-link',
  'fa-globe',
  'fa-cloud',
  'fa-database',
  'fa-server',
  'fa-lock',
  'fa-key',
  'fa-user',
  'fa-users',
  'fa-briefcase',
  'fa-calendar',
  'fa-clock',
  'fa-bell',
  'fa-star',
  'fa-heart',
  'fa-tag',
  'fa-tags',
  'fa-lightbulb',
  'fa-bolt',
  'fa-fire',
  'fa-seedling',
  'fa-rocket',
  'fa-wand-magic-sparkles',
  'fa-compass',
  'fa-map',
  'fa-location-dot',
  'fa-chart-line',
  'fa-chart-pie',
  'fa-money-bill'
];

const PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
  '#94a3b8',
  '#334155',
  '#0f172a',
  '#1f2937',
  '#111827',
  '#7c3aed',
  '#2563eb',
  '#0284c7',
  '#0f766e',
  '#16a34a',
  '#65a30d',
  '#ca8a04',
  '#c2410c',
  '#b91c1c',
  '#be123c',
  '#9f1239',
  '#4c1d95',
  '#312e81',
  '#0b1220',
  '#2b6cb0',
  '#a3e635',
  '#f472b6',
  '#38bdf8',
  '#fb7185',
  '#c084fc',
  '#fda4af',
  '#86efac',
  '#fde047',
  '#fdba74',
  '#93c5fd',
  '#d1d5db',
  '#ffffff'
];

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

let turndownService = null;

function getTurndown() {
  if (turndownService) return turndownService;
  if (typeof TurndownService === 'undefined') {
    throw new Error('Turndown library failed to load');
  }
  turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    headingStyle: 'atx',
    emDelimiter: '*'
  });
  if (typeof turndownPluginGfm !== 'undefined') {
    turndownService.use(turndownPluginGfm.gfm);
  }

  turndownService.addRule('notemdChecklistLi', {
    filter: (node) =>
      node.nodeName === 'LI' &&
      node.parentNode?.nodeName === 'UL' &&
      node.parentNode.classList?.contains('notemd-checklist'),
    replacement: (_content, node) => {
      const checked = node.classList.contains('notemd-checked');
      const textSpan = node.querySelector('.notemd-checklist-text');
      let text = '';
      if (textSpan) {
        text = textSpan.textContent || '';
      } else {
        const clone = node.cloneNode(true);
        clone.querySelector('.notemd-check-box')?.remove();
        clone.querySelector('input[type="checkbox"]')?.remove();
        text = clone.textContent || '';
      }
      text = text.replace(/\u00a0/g, ' ').trim();
      return `- [${checked ? 'x' : ' '}] ${text}\n`;
    }
  });

  return turndownService;
}

function preprocessMarkdown(md) {
  return (md || '')
    .replace(/^\*\s+(\[[ xX]\])/gm, '- $1')
    .replace(/^(\s*-\s*\[[ xX]\])[ \t]*\u00a0+/gm, '$1 ')
    .replace(/^(\s*-\s*\[[ xX]\])[ \t]+$/gm, '$1 ')
    .replace(/^(\s*[-*+])\s*\[\s*\](?=\s|$)/gm, '$1 [ ]')
    .replace(/^(\s*[-*+])\s*\[\s*x\s*\]/gim, '$1 [x]')
    .replace(/^(\s*[-*+])\s*\\\[\s*([xX])?\s*\\\]/gm, (_line, bullet, mark) => {
      const checked = mark && String(mark).toLowerCase() === 'x' ? 'x' : ' ';
      return `${bullet} [${checked}]`;
    })
    .replace(/^(\s*[-*+])\s*\[\s*([xX ])?\s*\]/gm, (_line, bullet, mark) => {
      const checked = mark && String(mark).trim().toLowerCase() === 'x' ? 'x' : ' ';
      return `${bullet} [${checked}]`;
    });
}

function parseHtmlFragment(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  return wrap;
}

function isTaskListUl(ul) {
  const items = [...ul.children].filter((c) => c.tagName === 'LI');
  if (!items.length) return false;
  if (ul.classList.contains('notemd-checklist') || ul.classList.contains('tox-checklist')) return true;
  if (ul.classList.contains('contains-task-list')) return true;
  return items.some((li) => li.querySelector('input[type="checkbox"]'));
}

function wrapLiTextForChecklist(li) {
  if (li.querySelector(':scope > span.notemd-checklist-text')) return;
  const span = document.createElement('span');
  span.className = 'notemd-checklist-text';
  const toMove = [...li.childNodes].filter(
    (n) => !(n.nodeType === 1 && (n.classList?.contains('notemd-check-box') || n.nodeName === 'INPUT'))
  );
  toMove.forEach((n) => span.appendChild(n));
  li.appendChild(span);
}

function cleanChecklistTextSpan(span) {
  if (!span) return;
  while (span.firstChild) {
    const n = span.firstChild;
    if (n.nodeType === 3 && !n.textContent.replace(/\u00a0/g, ' ').trim()) {
      n.remove();
      continue;
    }
    break;
  }
}

function createCheckBoxSpan(checked) {
  const box = document.createElement('span');
  box.className = 'notemd-check-box';
  box.contentEditable = 'false';
  box.setAttribute('data-mce-contenteditable', 'false');
  box.setAttribute('role', 'checkbox');
  box.setAttribute('aria-checked', checked ? 'true' : 'false');
  return box;
}

function normalizeTaskListsForTinyMCE(html) {
  const root = parseHtmlFragment(html);
  root.querySelectorAll('ul').forEach((ul) => {
    if (!isTaskListUl(ul)) return;

    ul.className = 'notemd-checklist tox-notemd-checklist';
    ul.style.cssText = 'list-style:none;padding-left:0;margin:0 0 0.5em 0';
    ul.removeAttribute('data-mce-type');

    [...ul.children]
      .filter((c) => c.tagName === 'LI')
      .forEach((li) => {
        const oldCb = li.querySelector('input[type="checkbox"]');
        const checked =
          oldCb?.checked ||
          oldCb?.hasAttribute('checked') ||
          li.classList.contains('notemd-checked') ||
          li.classList.contains('tox-checklist--checked') ||
          li.getAttribute('aria-checked') === 'true';
        oldCb?.remove();
        li.querySelector('.notemd-check-box')?.remove();
        li.classList.remove('tox-checklist--checked');
        li.removeAttribute('aria-checked');

        wrapLiTextForChecklist(li);
        const textSpan = li.querySelector('.notemd-checklist-text');
        cleanChecklistTextSpan(textSpan);

        const box = createCheckBoxSpan(checked);
        li.insertBefore(box, li.firstChild);
        li.classList.toggle('notemd-checked', !!checked);
      });
  });
  return root.innerHTML;
}

function normalizeMarkdownOutput(md) {
  return (md || '')
    .replace(/^\*\s+(\[[ xX]\])/gm, '- $1')
    .replace(/^\* (\[[ xX]\])/gm, '- $1')
    .replace(/^(\s+)\*\s+(\[[ xX]\])/gm, '$1- $2');
}

function mdToHtml(md) {
  if (typeof marked === 'undefined') return md || '';
  marked.setOptions({ gfm: true, breaks: true });
  const parsed = marked.parse(preprocessMarkdown(md));
  return normalizeTaskListsForTinyMCE(parsed);
}

function htmlToMd(html) {
  return normalizeMarkdownOutput(getTurndown().turndown(html || ''));
}

function setDirty(v) {
  state.dirty = v;
  UI.unsavedBadge.classList.toggle('d-none', !v);
  updateNoteActionButtons();
}

function cancelAutosave() {
  if (state.autosaveTimer) {
    window.clearTimeout(state.autosaveTimer);
    state.autosaveTimer = null;
  }
}

function updateNoteActionButtons() {
  const canDiscard = !!(state.hasTemp || state.dirty);
  if (!UI.btnDiscard) return;
  UI.btnDiscard.disabled = !canDiscard;
  UI.btnDiscard.classList.toggle('btn-outline-warning', !canDiscard);
  UI.btnDiscard.classList.toggle('btn-warning', canDiscard);
  UI.btnDiscard.classList.toggle('btn-discard-active', canDiscard);
  UI.btnDiscard.classList.toggle('btn-discard-idle', !canDiscard);
}

function debounceAutosave(markdownProvider) {
  if (state.suppressAutosave || state.markdownMode) return;
  if (state.autosaveTimer) window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(async () => {
    state.autosaveTimer = null;
    if (state.suppressAutosave || !state.selectedProject || !state.selectedNote) return;
    const md = markdownProvider();
    await window.notemd.autosaveTemp(state.selectedProject, state.selectedNote, md);
    state.hasTemp = true;
    setDirty(true);
    const editor = getEditor();
    if (editor && !state.markdownMode) {
      editor.setDirty(true);
    }
  }, 900);
}

function noteSessionKey(project, note) {
  return `${project}::${note}`;
}

function applyUndoLevelContent(editor, level) {
  if (!level) return;
  if (typeof level.content === 'string') {
    editor.setContent(level.content);
    return;
  }
  if (Array.isArray(level.fragments)) {
    editor.setContent(level.fragments.join(''));
  }
}

function saveEditorSession(project, note) {
  if (!project || !note || state.markdownMode) return;
  const editor = getEditor();
  if (!editor) return;
  if (editor.undoManager.typing) {
    editor.undoManager.add();
    editor.undoManager.typing = false;
  }
  noteEditorSessions.set(noteSessionKey(project, note), {
    html: editor.getContent({ format: 'html' }),
    undoData: structuredClone(editor.undoManager.data)
  });
}

function restoreEditorSession(session) {
  const editor = getEditor();
  if (!editor) return;
  const levels = structuredClone(session.undoData || []);
  editor.undoManager.clear();
  if (!levels.length) {
    loadEditorHtml(session.html, { hasUnsavedTemp: true });
    return;
  }
  editor.undoManager.data.push(...levels);
  editor.undoManager.ignore(() => {
    applyUndoLevelContent(editor, levels[0]);
  });
  for (let i = 0; i < levels.length - 1; i++) {
    editor.undoManager.redo();
  }
  editor.setDirty(levels.length > 1 || !!state.hasTemp);
}

function clearEditorSessions() {
  noteEditorSessions.clear();
}

function normalizeNoteFileName(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  const safe = trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').slice(0, 120);
  return safe.toLowerCase().endsWith('.md') ? safe : `${safe}.md`;
}

function getTinymceBaseUrl() {
  // Resolve from renderer/index.html → ../../node_modules/tinymce/
  return new URL('../../node_modules/tinymce/', window.location.href).href;
}

function getEditorContentStyle(darkMode) {
  const textColor = darkMode ? '#e5e7eb' : '#111827';
  const boxBorder = darkMode ? '#9ca3af' : '#4b5563';
  const boxBg = darkMode ? '#374151' : '#fff';
  return `
      html, body { height: 100%; margin: 0; }
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        color: ${textColor};
        overflow-y: auto;
        box-sizing: border-box;
        padding: 12px 16px;
      }
      ul.notemd-checklist {
        list-style: none !important;
        padding-left: 0 !important;
        margin: 0 0 0.5em 0 !important;
      }
      ul.notemd-checklist > li {
        display: flex !important;
        align-items: flex-start !important;
        gap: 0.5rem !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }
      ul.notemd-checklist .notemd-check-box {
        flex: 0 0 1rem;
        width: 1rem;
        height: 1rem;
        margin-top: 0.15rem;
        border: 2px solid ${boxBorder};
        border-radius: 3px;
        background: ${boxBg};
        cursor: pointer;
        box-sizing: border-box;
        position: relative;
      }
      ul.notemd-checklist li.notemd-checked .notemd-check-box {
        background: #2563eb;
        border-color: #2563eb;
      }
      ul.notemd-checklist li.notemd-checked .notemd-check-box::after {
        content: '';
        position: absolute;
        left: 0.2rem;
        top: 0.05rem;
        width: 0.35rem;
        height: 0.6rem;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      ul.notemd-checklist .notemd-checklist-text {
        flex: 1 1 auto;
        min-width: 0;
        line-height: 1.5;
      }
      ul.notemd-checklist li.notemd-checked .notemd-checklist-text {
        text-decoration: line-through;
        opacity: 0.65;
      }
    `;
}

function applyAppTheme(darkMode) {
  state.darkMode = !!darkMode;
  const theme = darkMode ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-bs-theme', theme);
  if (UI.btnToggleTheme) {
    UI.btnToggleTheme.setAttribute('aria-pressed', darkMode ? 'true' : 'false');
    UI.btnToggleTheme.title = darkMode ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

async function loadPreferences() {
  if (!window.notemd?.getPreferences) return;
  const prefs = await window.notemd.getPreferences();
  applyAppTheme(!!prefs?.darkMode);
}

async function loadTinyMceConfig() {
  if (!window.notemd?.getTinyMceConfig) return;
  const config = await window.notemd.getTinyMceConfig();
  state.tinymceApiKey = config?.apiKey || null;
}

function setTinyMceSetupStatus(message, tone = 'secondary') {
  if (!UI.tinymceSetupStatus) return;
  UI.tinymceSetupStatus.textContent = message || '';
  UI.tinymceSetupStatus.className = `import-status small mt-2 text-${tone}`;
}

function showTinyMceSetupModal({ allowCancel = false } = {}) {
  if (tinyMceSetupPromise) return tinyMceSetupPromise;

  tinyMceSetupPromise = new Promise((resolve) => {
    if (!UI.tinymceSetupModalEl) {
      tinyMceSetupPromise = null;
      resolve(false);
      return;
    }

    let settled = false;

    UI.tinymceSetupInput.value = state.tinymceApiKey || '';
    UI.tinymceSetupInput.type = 'password';
    if (UI.tinymceSetupShowKey) UI.tinymceSetupShowKey.checked = false;
    setTinyMceSetupStatus('');

    UI.btnTinyMceSetupCancel?.classList.toggle('d-none', !allowCancel);
    UI.btnTinyMceSetupClose?.classList.toggle('d-none', !allowCancel);

    const modal = bootstrap.Modal.getOrCreateInstance(UI.tinymceSetupModalEl, {
      backdrop: 'static',
      keyboard: false
    });

    const cleanup = () => {
      UI.btnTinyMceSetupSave?.removeEventListener('click', onSave);
      UI.btnTinyMceSetupCancel?.removeEventListener('click', onCancel);
      UI.tinymceSetupModalEl.removeEventListener('hidden.bs.modal', onHidden);
      tinyMceSetupPromise = null;
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onHidden = () => {
      finish(false);
    };

    const onCancel = () => {
      modal.hide();
      finish(false);
    };

    const onSave = async () => {
      const key = UI.tinymceSetupInput.value.trim();
      if (!key) {
        setTinyMceSetupStatus('Please enter your TinyMCE API key.', 'danger');
        UI.tinymceSetupInput.focus();
        return;
      }

      UI.btnTinyMceSetupSave.disabled = true;
      setTinyMceSetupStatus('Saving…', 'secondary');
      try {
        const res = await window.notemd.setTinyMceApiKey(key);
        if (!res?.ok) {
          setTinyMceSetupStatus(res?.error || 'Failed to save API key.', 'danger');
          return;
        }
        state.tinymceApiKey = key;
        modal.hide();
        finish(true);
      } catch (err) {
        setTinyMceSetupStatus(err?.message || 'Failed to save API key.', 'danger');
      } finally {
        UI.btnTinyMceSetupSave.disabled = false;
      }
    };

    UI.btnTinyMceSetupSave?.addEventListener('click', onSave);
    UI.btnTinyMceSetupCancel?.addEventListener('click', onCancel);
    UI.tinymceSetupModalEl.addEventListener('hidden.bs.modal', onHidden, { once: false });

    modal.show();
    window.setTimeout(() => UI.tinymceSetupInput?.focus(), 150);
  });

  return tinyMceSetupPromise;
}

async function ensureTinyMceSetup({ allowCancel = false } = {}) {
  if (state.tinymceApiKey) return true;
  await loadTinyMceConfig();
  if (state.tinymceApiKey) return true;
  return showTinyMceSetupModal({ allowCancel });
}

async function openTinyMceSignup() {
  if (window.notemd?.openExternal) {
    await window.notemd.openExternal(TINYMCE_SIGNUP_URL);
    return;
  }
  window.open(TINYMCE_SIGNUP_URL, '_blank', 'noopener,noreferrer');
}

async function toggleDarkMode() {
  const next = !state.darkMode;
  applyAppTheme(next);
  if (window.notemd?.setDarkMode) {
    await window.notemd.setDarkMode(next);
  }
  await reinitTinyMCE();
}

async function reinitTinyMCE() {
  const editor = getEditor();
  const html =
    editor && !state.markdownMode && state.selectedNote
      ? editor.getContent({ format: 'html' })
      : '';
  if (editor) {
    await tinymce.remove('#tinymceEditor');
  }
  editorInitPromise = null;
  const height = await waitForEditorHostHeight();
  await initTinyMCE(height);
  bindEditorDocActivation(getEditor());
  syncEditorHeight();
  if (html && !state.markdownMode) {
    loadEditorHtml(html, { hasUnsavedTemp: state.dirty || state.hasTemp });
  }
}

async function waitForEditorHostHeight() {
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const h = UI.tinymceHost.clientHeight;
    if (h >= 120) return h;
  }
  return Math.max(320, UI.tinymceHost.clientHeight || 320);
}

function syncEditorHeight() {
  const editor = getEditor();
  if (!editor || UI.tinymceHost.classList.contains('d-none')) return;
  const h = UI.tinymceHost.clientHeight;
  if (h < 80) return;
  try {
    if (editor.theme?.resizeTo) editor.theme.resizeTo(null, h);
    editor.dispatch('ResizeEditor');
  } catch (_) {
    /* ignore */
  }
}

function ensureEditorResizeObserver() {
  if (editorResizeObserver || typeof ResizeObserver === 'undefined') return;
  editorResizeObserver = new ResizeObserver(() => syncEditorHeight());
  editorResizeObserver.observe(UI.tinymceHost);
}

function bindEditorDocActivation(editor) {
  if (!editor || editor._notemdDocActivationBound) return;
  editor._notemdDocActivationBound = true;
}

function focusEditorOnly(editor = getEditor()) {
  if (!editor || state.markdownMode || UI.tinymceHost.classList.contains('d-none')) return;
  try {
    editor.focus();
    editor.getBody()?.focus();
  } catch (_) {
    /* ignore */
  }
}

async function ensureEditorReady() {
  const setupOk = await ensureTinyMceSetup({ allowCancel: false });
  if (!setupOk) return;

  if (getEditor()) {
    syncEditorHeight();
    return;
  }
  if (!editorInitPromise) {
    editorInitPromise = (async () => {
      if (UI.tinymceHost.classList.contains('d-none')) {
        UI.tinymceHost.classList.remove('d-none');
      }
      ensureEditorResizeObserver();
      const height = await waitForEditorHostHeight();
      await initTinyMCE(height);
      setMarkdownMode(state.markdownMode);
      bindEditorDocActivation(getEditor());
      syncEditorHeight();
    })();
  }
  await editorInitPromise;
}

async function initTinyMCE(editorHeight) {
  if (typeof tinymce === 'undefined') {
    throw new Error('TinyMCE failed to load');
  }
  if (!state.tinymceApiKey) {
    throw new Error('TinyMCE API key is not configured');
  }

  UI.tinymceHost.innerHTML = '<textarea id="tinymceEditor"></textarea>';

  const baseUrl = getTinymceBaseUrl();

  await tinymce.init({
    selector: '#tinymceEditor',
    api_key: state.tinymceApiKey,
    license_key: 'gpl',
    base_url: baseUrl,
    suffix: '.min',
    skin: state.darkMode ? 'oxide-dark' : 'oxide',
    content_css: state.darkMode ? 'dark' : 'default',
    menubar: true,
    branding: false,
    promotion: false,
    height: editorHeight || 400,
    resize: false,
    plugins:
      'advlist anchor autolink charmap code codesample directionality emoticons fullscreen help image insertdatetime link lists media notemdchecklist notemdtoolbar pagebreak preview quickbars searchreplace table visualblocks visualchars wordcount',
    font_size_input_default_unit: 'px',
    toolbar: [
      'undo redo | blocks fontfamily fontsizeinput | bold italic underline strikethrough forecolor backcolor | align | notemdtoolbarexpand',
      'outdent indent | bullist numlist notemdchecklist hr | link image media table | emoticons charmap insertdatetime | code preview fullscreen | removeformat help'
    ],
    quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
    quickbars_insert_toolbar: 'quickimage quicktable | bullist numlist notemdchecklist',
    extended_valid_elements:
      'span[class|contenteditable|data-mce-contenteditable|role|aria-checked|style],input[type|checked|contenteditable|disabled|class|style]',
    valid_children: '+li[span|#text|br|strong|em|a]',
    noneditable_class: 'notemd-check-box',
    image_caption: true,
    automatic_uploads: false,
    file_picker_types: 'image',
    content_style: getEditorContentStyle(state.darkMode),
    setup: (editor) => {
      editor.on('init', () => {
        bindEditorDocActivation(editor);
        syncEditorHeight();
        window.requestAnimationFrame(() => syncEditorHeight());
        window.setTimeout(() => syncEditorHeight(), 50);
        window.setTimeout(() => syncEditorHeight(), 200);
      });

      editor.ui.registry.addMenuItem('newdocument', {
        text: 'Clear document',
        icon: 'new-document',
        shortcut: 'Meta+N',
        onAction: () => clearEditorDocument()
      });

      const autosaveFromEditor = () => {
        if (state.markdownMode || state.suppressAutosave) return;
        debounceAutosave(() => htmlToMd(editor.getContent({ format: 'html' })));
      };
      editor.on('input', autosaveFromEditor);
      editor.on('Undo Redo', autosaveFromEditor);
      editor.on('Change', autosaveFromEditor);
      editor.on('ExecCommand', autosaveFromEditor);
    }
  });
}

function getEditor() {
  return tinymce.get('tinymceEditor');
}

/** Load HTML into TinyMCE with a fresh undo stack for this note. */
function loadEditorHtml(html, { hasUnsavedTemp = false } = {}) {
  const editor = getEditor();
  if (!editor) return;
  cancelAutosave();
  state.suppressAutosave = true;
  const value = html ?? '';
  editor.undoManager.transact(() => {
    editor.setContent(value, { format: 'html' });
  });
  editor.undoManager.clear();
  editor.undoManager.add();
  editor.setDirty(!!hasUnsavedTemp);
  window.setTimeout(() => {
    state.suppressAutosave = false;
  }, 50);
}

async function confirmAction({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel' }) {
  if (!window.notemd?.confirm) return false;
  const res = await window.notemd.confirm({ title, message, confirmLabel, cancelLabel });
  return !!res?.ok;
}

async function confirmDestructive({ title, message }) {
  return confirmAction({ title, message, confirmLabel: 'Delete', cancelLabel: 'Cancel' });
}

/** Tear down and recreate TinyMCE, then load HTML (fixes post-dialog focus on Windows). */
async function hardResetEditorWithContent(html) {
  cancelAutosave();
  state.suppressAutosave = true;
  if (state.markdownMode) {
    setMarkdownMode(false);
  }
  showEmptyState(false);

  const existing = getEditor();
  if (existing) {
    await tinymce.remove('#tinymceEditor');
  }
  editorInitPromise = null;

  await ensureEditorReady();
  loadEditorHtml(html ?? '', { hasUnsavedTemp: false });
  bindEditorDocActivation(getEditor());
  syncEditorHeight();

  window.setTimeout(() => {
    state.suppressAutosave = false;
  }, 50);

  await focusEditorAfterRecreate();
}

async function loadNoteIntoFreshEditor(project, noteFile) {
  clearEditorSessions();
  state.selectedProject = project;
  state.selectedNote = noteFile;
  state.hasTemp = false;
  setDirty(false);

  const res = await window.notemd.readNote(project, noteFile);
  if (!res.ok) return;

  const list = await window.notemd.listNotes(project);
  if (list.ok) state.notes = list.notes || [];

  UI.noteName.value = noteFile.replace(/\.md$/i, '');
  renderProjects();
  renderTabs();

  await hardResetEditorWithContent(mdToHtml(res.markdown || ''));
}

/** One-shot focus after delete recreated Note1 / Untitled 1 (no repeated window activation). */
async function focusEditorAfterRecreate() {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  try {
    await window.notemd?.focusWindow?.();
  } catch (_) {
    /* ignore */
  }
  syncEditorHeight();
  focusEditorOnly(getEditor());
}

function findReplacementUntitledNote(notes) {
  return notes.find((f) => f.toLowerCase() === REPLACEMENT_NOTE.toLowerCase()) || null;
}

function waitForModalHidden(modalEl) {
  return new Promise((resolve) => {
    if (!modalEl || !modalEl.classList.contains('show')) {
      resolve();
      return;
    }
    modalEl.addEventListener('hidden.bs.modal', () => resolve(), { once: true });
  });
}

function clearEditorDocument() {
  loadEditorHtml('', { hasUnsavedTemp: true });
}

function showEmptyState(show) {
  UI.emptyState.classList.toggle('d-none', !show);
  UI.tinymceHost.classList.toggle('d-none', show);
  UI.markdownRaw.classList.toggle('d-none', show || !state.markdownMode);
}

function toggleSidebar() {
  const hidden = UI.sidebar.classList.contains('hidden');
  setSidebarVisible(hidden);
}

function setSidebarVisible(visible) {
  UI.sidebar.classList.toggle('hidden', !visible);
  UI.mainArea.classList.toggle('sidebar-hidden', !visible);
  UI.btnShowSidebar?.classList.toggle('d-none', visible);
  window.notemd?.setSidebarVisible?.(visible);
}

function sortedProjects() {
  const meta = state.data?.folders || {};
  const projects = state.projectsOnDisk.map((name) => ({
    name,
    meta: meta[name] || { color: '#2b6cb0', icon: 'fa-folder', order: 999999, createdAt: '1970-01-01T00:00:00.000Z' }
  }));

  switch (state.projectSort) {
    case 'az':
      projects.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'za':
      projects.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'new':
      projects.sort((a, b) => (b.meta.createdAt || '').localeCompare(a.meta.createdAt || ''));
      break;
    case 'old':
      projects.sort((a, b) => (a.meta.createdAt || '').localeCompare(b.meta.createdAt || ''));
      break;
    case 'custom':
    default:
      projects.sort((a, b) => (a.meta.order ?? 0) - (b.meta.order ?? 0));
      break;
  }
  return projects;
}

function renderProjects() {
  const items = sortedProjects();
  UI.projectList.innerHTML = items
    .map((p) => {
      const active = p.name === state.selectedProject ? 'active' : '';
      const icon = p.meta.icon || 'fa-folder';
      const color = p.meta.color || '#2b6cb0';
      return `
        <div class="project-item ${active}" data-project="${escapeHtml(p.name)}" style="border-left: 6px solid ${escapeHtml(
        color
      )};">
          <div class="project-swatch" style="background:${escapeHtml(color)};" title="Order ${escapeHtml(p.meta.order ?? '')}">
            <span class="project-order-badge">${escapeHtml(p.meta.order ?? '')}</span>
          </div>
          <div class="project-name">
            <div class="name fw-semibold"><i class="fa-solid ${escapeHtml(icon)} me-2"></i>${escapeHtml(p.name)}</div>
          </div>
          <div class="project-actions">
            <button class="btn btn-sm btn-outline-secondary" data-edit="${escapeHtml(p.name)}" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderTabs() {
  UI.noteTabs.innerHTML = state.notes
    .map((file) => {
      const label = file.replace(/\.md$/i, '');
      const active = file === state.selectedNote ? 'active' : '';
      return `
        <div class="note-tab ${active}" data-note="${escapeHtml(file)}">
          <i class="fa-regular fa-file-lines"></i>
          <div class="label">${escapeHtml(label)}</div>
        </div>
      `;
    })
    .join('');
}

async function refreshProjects() {
  const res = await window.notemd.listProjects();
  if (!res.ok) return false;
  state.rootPath = res.rootPath;
  state.data = res.data;
  state.projectsOnDisk = res.projectsOnDisk || [];
  UI.rootPath.textContent = state.rootPath || '';
  renderProjects();
  return true;
}

async function ensureWorkspaceSelection(options = {}) {
  const { preferProject = null, preferNote = null, forceFirst = false } = options;

  await refreshProjects();
  const projects = sortedProjects();
  if (!projects.length) return;

  let projectName = preferProject;
  if (forceFirst || !projectName || !state.projectsOnDisk.includes(projectName)) {
    projectName = projects[0].name;
  }

  await selectProject(projectName, { preferNote, forceFirstNote: forceFirst });
}

async function selectProject(folderName, options = {}) {
  const { preferNote = null, forceFirstNote = false } = options;

  cancelAutosave();

  if (state.selectedProject && state.selectedNote) {
    saveEditorSession(state.selectedProject, state.selectedNote);
  }

  state.selectedProject = folderName;
  state.selectedNote = null;
  state.notes = [];
  setDirty(false);
  state.hasTemp = false;

  renderProjects();

  const res = await window.notemd.listNotes(folderName);
  if (!res.ok) return;
  state.notes = res.notes || [];

  let noteToOpen = null;
  if (forceFirstNote) {
    noteToOpen = state.notes[0] || null;
  } else if (preferNote && state.notes.includes(preferNote)) {
    noteToOpen = preferNote;
  } else if (state.notes.length > 0) {
    noteToOpen = state.notes[0];
  }

  if (noteToOpen) {
    await selectNote(noteToOpen);
  } else {
    const created = await window.notemd.createNote(folderName);
    if (created.ok) {
      const list = await window.notemd.listNotes(folderName);
      state.notes = list.notes || [];
      if (created.note?.file) await selectNote(created.note.file);
    }
    renderTabs();
    UI.noteName.value = '';
    await ensureEditorReady();
    clearEditorDocument();
    UI.markdownRaw.value = '';
  }

  renderProjects();
  renderTabs();
}

async function openBootstrapNoteAfterProjectDelete() {
  await refreshProjects();
  const project = state.projectsOnDisk.includes(BOOTSTRAP_PROJECT)
    ? BOOTSTRAP_PROJECT
    : state.projectsOnDisk[0];
  if (!project) return;

  const list = await window.notemd.listNotes(project);
  const notes = list.ok ? list.notes || [] : [];
  const noteFile =
    notes.find((f) => f.toLowerCase() === BOOTSTRAP_NOTE.toLowerCase()) || notes[0];
  if (!noteFile) return;

  await loadNoteIntoFreshEditor(project, noteFile);
}

async function openReplacementNoteAfterLastDelete(project) {
  const list = await window.notemd.listNotes(project);
  if (!list.ok) return;
  const notes = list.notes || [];
  const noteFile = findReplacementUntitledNote(notes) || notes[0];
  if (!noteFile) return;
  await loadNoteIntoFreshEditor(project, noteFile);
}

async function selectNote(noteFile, options = {}) {
  const { fresh = false } = options;
  cancelAutosave();

  if (state.selectedProject && state.selectedNote && state.selectedNote !== noteFile) {
    saveEditorSession(state.selectedProject, state.selectedNote);
  }

  state.selectedNote = noteFile;
  setDirty(false);
  const res = await window.notemd.readNote(state.selectedProject, noteFile);
  if (!res.ok) return;
  state.hasTemp = !!res.hasTemp;
  const md = res.markdown || '';
  const html = mdToHtml(md);

  UI.noteName.value = noteFile.replace(/\.md$/i, '');
  if (state.markdownMode) {
    UI.markdownRaw.value = md;
  } else {
    await ensureEditorReady();
    const key = noteSessionKey(state.selectedProject, noteFile);
    if (fresh) {
      noteEditorSessions.delete(key);
      loadEditorHtml(html, { hasUnsavedTemp: state.hasTemp });
    } else {
      const session = noteEditorSessions.get(key);
      if (session && session.html === html) {
        restoreEditorSession(session);
      } else {
        noteEditorSessions.delete(key);
        loadEditorHtml(html, { hasUnsavedTemp: state.hasTemp });
      }
    }
  }
  setDirty(state.hasTemp);
  renderTabs();
}

function setMarkdownMode(on) {
  state.markdownMode = on;
  if (state.rootPath) {
    UI.markdownRaw.classList.toggle('d-none', !on);
    UI.tinymceHost.classList.toggle('d-none', on);
  }
  if (UI.modeEditor) UI.modeEditor.checked = !on;
  if (UI.modeMarkdown) UI.modeMarkdown.checked = on;
}

async function switchToMarkdownMode() {
  if (!state.selectedProject || !state.selectedNote) return;
  if (state.markdownMode) return;
  const editor = getEditor();
  UI.markdownRaw.value = htmlToMd(editor?.getContent({ format: 'html' }) || '');
  setMarkdownMode(true);
}

async function switchToEditorMode() {
  if (!state.selectedProject || !state.selectedNote) return;
  if (!state.markdownMode) return;
  const md = UI.markdownRaw.value || '';
  loadEditorHtml(mdToHtml(md), { hasUnsavedTemp: false });
  setMarkdownMode(false);
  focusEditorOnly(getEditor());
}

async function menuSetMarkdownMode() {
  if (!state.rootPath || !state.selectedNote) return;
  if (state.markdownMode) return;
  await switchToMarkdownMode();
}

async function menuSetEditorMode() {
  if (!state.rootPath || !state.selectedNote) return;
  if (!state.markdownMode) return;
  await switchToEditorMode();
}

function menuOpenEditorSourceCode() {
  if (!state.rootPath || !state.selectedNote) {
    return;
  }
  if (state.markdownMode) {
    alert('Switch to Rich Text Editor (View → Editor → Rich Text Editor) to edit HTML source.');
    return;
  }
  const editor = getEditor();
  if (!editor) return;
  editor.execCommand('mceCodeEditor');
}

function menuToggleEditorFullscreen() {
  if (!state.rootPath || state.markdownMode) return;
  const editor = getEditor();
  if (!editor) return;
  editor.execCommand('mceFullScreen');
}

function getModalBaseOrder() {
  if (state.projectModal.mode === 'create') {
    const orders = Object.values(state.data?.folders || {}).map((f) => f.order || 0);
    return orders.length ? Math.max(...orders) + 1 : 1;
  }
  return state.data?.folders?.[state.projectModal.originalName]?.order || 1;
}

function getModalOrderMax() {
  const count = Object.keys(state.data?.folders || {}).length;
  return state.projectModal.mode === 'create' ? Math.max(1, count + 1) : Math.max(1, count);
}

function resetProjectModalOrder() {
  state.projectModal.baseOrder = getModalBaseOrder();
  state.projectModal.orderDelta = 0;
  updateProjectOrderDisplay();
}

function updateProjectOrderDisplay() {
  const max = getModalOrderMax();
  let order = state.projectModal.baseOrder + (state.projectModal.orderDelta || 0);
  order = Math.max(1, Math.min(max, order));
  state.projectModal.orderDelta = order - state.projectModal.baseOrder;
  if (UI.projectOrderDisplay) UI.projectOrderDisplay.textContent = String(order);
}

function shiftProjectModalOrder(delta) {
  state.projectModal.orderDelta = (state.projectModal.orderDelta || 0) + delta;
  updateProjectOrderDisplay();
}

function openProjectModalCreate() {
  state.projectModal = {
    mode: 'create',
    originalName: null,
    name: '',
    icon: 'fa-folder',
    color: '#2b6cb0',
    move: 0,
    baseOrder: 1,
    orderDelta: 0
  };
  UI.projectModalTitle.textContent = 'Create Project';
  UI.btnDeleteProjectFooter?.classList.add('d-none');
  UI.projectName.value = '';
  setIconSelection(state.projectModal.icon);
  setColorSelection(state.projectModal.color);
  resetProjectModalOrder();
  bootstrap.Modal.getOrCreateInstance(UI.projectModalEl).show();
}

function openProjectModalEdit(projectName) {
  const meta = state.data?.folders?.[projectName];
  state.projectModal = {
    mode: 'edit',
    originalName: projectName,
    name: projectName,
    icon: meta?.icon || 'fa-folder',
    color: meta?.color || '#2b6cb0',
    move: 0,
    baseOrder: meta?.order || 1,
    orderDelta: 0
  };
  UI.projectModalTitle.textContent = 'Edit Project';
  UI.btnDeleteProjectFooter?.classList.remove('d-none');
  UI.projectName.value = state.projectModal.name;
  setIconSelection(state.projectModal.icon);
  setColorSelection(state.projectModal.color);
  resetProjectModalOrder();
  bootstrap.Modal.getOrCreateInstance(UI.projectModalEl).show();
}

function buildIconGrid() {
  UI.iconGrid.innerHTML = ICONS.map((ic) => {
    return `<div class="icon-tile" data-icon="${escapeHtml(ic)}"><i class="fa-solid ${escapeHtml(ic)}"></i></div>`;
  }).join('');
}

function buildColorGrid() {
  UI.colorGrid.innerHTML = PALETTE.map((c) => {
    return `<div class="color-tile" data-color="${escapeHtml(c)}" style="background:${escapeHtml(c)};"></div>`;
  }).join('');
}

function setIconSelection(icon) {
  state.projectModal.icon = icon;
  [...UI.iconGrid.querySelectorAll('.icon-tile')].forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-icon') === icon);
  });
}

function setColorSelection(color) {
  state.projectModal.color = color;
  UI.colorPicker.value = color;
  UI.colorHex.value = color;
  [...UI.colorGrid.querySelectorAll('.color-tile')].forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-color') === color);
  });
}

async function saveProjectModal() {
  const name = UI.projectName.value.trim();
  const color = state.projectModal.color;
  const icon = state.projectModal.icon;

  if (state.projectModal.mode === 'create') {
    await window.notemd.createProject({ name, color, icon });
  } else {
    await window.notemd.updateProject({
      originalName: state.projectModal.originalName,
      name,
      color,
      icon,
      move: 0
    });

    const steps = Math.abs(state.projectModal.orderDelta || 0);
    const dir = state.projectModal.orderDelta < 0 ? -1 : 1;
    for (let i = 0; i < steps; i++) {
      await window.notemd.updateProject({
        originalName: name,
        name,
        color,
        icon,
        move: dir
      });
    }
  }

  state.projectModal.move = 0;
  state.projectModal.orderDelta = 0;
  bootstrap.Modal.getOrCreateInstance(UI.projectModalEl).hide();

  const createdName = name;
  if (state.projectModal.mode === 'create') {
    await ensureWorkspaceSelection({ preferProject: createdName, forceFirst: false });
  } else {
    await ensureWorkspaceSelection({ preferProject: createdName || state.projectModal.originalName });
  }
}

async function deleteProjectFromModal() {
  if (state.projectModal.mode !== 'edit') return;
  const name = state.projectModal.originalName;
  const ok = await confirmDestructive({
    title: 'Delete project',
    message: `Delete project "${name}"?\n\nThis deletes the folder and its notes on disk.`
  });
  if (!ok) return;

  bootstrap.Modal.getOrCreateInstance(UI.projectModalEl).hide();
  await waitForModalHidden(UI.projectModalEl);

  const res = await window.notemd.deleteProject(name);
  if (res.ok && res.data) state.data = res.data;
  if (res.ok && res.projectsOnDisk) state.projectsOnDisk = res.projectsOnDisk;

  state.selectedProject = null;
  state.selectedNote = null;
  state.notes = [];
  await openBootstrapNoteAfterProjectDelete();
}

async function ensureRoot() {
  if (state.rootPath) return true;
  return chooseAndSetRoot();
}

async function addNote() {
  if (!(await ensureRoot())) return;
  if (!state.selectedProject) {
    alert('Select a project first.');
    return;
  }
  const res = await window.notemd.createNote(state.selectedProject);
  if (!res.ok) return;
  const list = await window.notemd.listNotes(state.selectedProject);
  state.notes = list.notes || [];
  renderTabs();
  await selectNote(res.note.file);
}

async function saveCurrentNote() {
  if (!state.selectedProject || !state.selectedNote) {
    await ensureWorkspaceSelection({ forceFirst: true });
    if (!state.selectedProject || !state.selectedNote) {
      alert('Select a project and note first.');
      return;
    }
  }
  cancelAutosave();
  state.suppressAutosave = true;
  try {
    const md = state.markdownMode ? UI.markdownRaw.value : htmlToMd(getEditor()?.getContent({ format: 'html' }) || '');
    await window.notemd.saveNote(state.selectedProject, state.selectedNote, md);
    state.hasTemp = false;
    setDirty(false);
    noteEditorSessions.delete(noteSessionKey(state.selectedProject, state.selectedNote));
    getEditor()?.setDirty(false);
  } finally {
    window.setTimeout(() => {
      state.suppressAutosave = false;
    }, 50);
  }
}

async function discardCurrentNote() {
  if (!state.selectedProject || !state.selectedNote) return;
  if (!state.hasTemp && !state.dirty) return;

  const ok = await confirmAction({
    title: 'Discard changes',
    message:
      'Discard all unsaved changes for this note?\n\n' +
      'Auto-saved changes that you have not saved will be lost.',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing'
  });
  if (!ok) return;

  cancelAutosave();
  state.suppressAutosave = true;
  try {
    const res = await window.notemd.discardTemp(state.selectedProject, state.selectedNote);
    if (!res.ok) return;
    state.hasTemp = false;
    setDirty(false);
    noteEditorSessions.delete(noteSessionKey(state.selectedProject, state.selectedNote));
    const md = res.markdown || '';
    if (state.markdownMode) {
      UI.markdownRaw.value = md;
    } else {
      loadEditorHtml(mdToHtml(md), { hasUnsavedTemp: false });
    }
  } finally {
    window.setTimeout(() => {
      state.suppressAutosave = false;
    }, 50);
  }
}

async function renameCurrentNote() {
  if (!state.selectedProject || !state.selectedNote) return;
  const next = normalizeNoteFileName(UI.noteName.value);
  if (!next) return;
  if (next === state.selectedNote) return;
  await window.notemd.renameNote(state.selectedProject, state.selectedNote, next);
  state.selectedNote = next;
  const list = await window.notemd.listNotes(state.selectedProject);
  state.notes = list.notes || [];
  renderTabs();
}

async function deleteCurrentNote() {
  if (!state.selectedProject || !state.selectedNote) return;
  const project = state.selectedProject;
  const deletedNote = state.selectedNote;
  const wasOnlyNote = state.notes.length === 1;
  const ok = await confirmDestructive({
    title: 'Delete note',
    message: `Delete note "${deletedNote}"?`
  });
  if (!ok) return;

  noteEditorSessions.delete(noteSessionKey(project, deletedNote));
  await window.notemd.deleteNote(project, deletedNote);

  if (wasOnlyNote) {
    await openReplacementNoteAfterLastDelete(project);
    return;
  }

  const list = await window.notemd.listNotes(project);
  state.notes = list.notes || [];
  renderTabs();
  if (state.notes.length > 0) {
    await selectNote(state.notes[0]);
  }
}

async function applyRootPath(rootPath, { alertOnError = true } = {}) {
  const set = await window.notemd.setRoot(rootPath);
  if (!set.ok) {
    if (alertOnError) alert(set.error || 'Failed to set root folder');
    state.rootPath = null;
    UI.rootPath.textContent = '';
    showEmptyState(true);
    return false;
  }
  clearEditorSessions();
  state.rootPath = set.rootPath;
  state.data = set.data;
  state.projectsOnDisk = set.projectsOnDisk || [];
  UI.rootPath.textContent = state.rootPath || '';
  showEmptyState(false);
  try {
    await window.notemd?.focusWindow?.();
  } catch (_) {
    /* ignore */
  }
  renderProjects();
  return true;
}

async function restoreRootUiAfterPickerCancel() {
  if (state.rootPath) {
    showEmptyState(false);
    UI.rootPath.textContent = state.rootPath;
    await ensureWorkspaceSelection({
      preferProject: state.selectedProject,
      preferNote: state.selectedNote,
      forceFirst: false
    });
    return true;
  }
  state.rootPath = null;
  UI.rootPath.textContent = '';
  showEmptyState(true);
  return false;
}

async function promptChangeRootFolder() {
  if (!window.notemd) {
    alert('App bridge not available. Restart NoteMD.');
    return false;
  }
  const res = await window.notemd.chooseRoot();
  if (res.canceled) {
    return restoreRootUiAfterPickerCancel();
  }
  const ok = await applyRootPath(res.path);
  if (!ok) return false;
  await ensureWorkspaceSelection({ forceFirst: true });
  return true;
}

async function chooseAndSetRoot() {
  if (!window.notemd) {
    alert('App bridge not available. Restart NoteMD.');
    return false;
  }
  const res = await window.notemd.chooseRoot();
  if (res.canceled) {
    return restoreRootUiAfterPickerCancel();
  }
  const ok = await applyRootPath(res.path);
  if (!ok) return false;
  await ensureWorkspaceSelection({ forceFirst: true });
  return true;
}

async function initializeRoot({ promptIfMissing = true } = {}) {
  if (!window.notemd) {
    alert('App bridge not available. Restart NoteMD.');
    return false;
  }

  const last = await window.notemd.getLastRoot();
  if (last.ok && last.path) {
    const ok = await applyRootPath(last.path, { alertOnError: false });
    if (ok) return true;
  }

  state.rootPath = null;
  UI.rootPath.textContent = '';

  if (!promptIfMissing) {
    showEmptyState(true);
    return false;
  }

  return chooseAndSetRoot();
}

async function reloadWorkspace() {
  saveEditorSession(state.selectedProject, state.selectedNote);
  clearEditorSessions();

  const preferProject = state.selectedProject;
  const preferNote = state.selectedNote;

  if (!state.rootPath) {
    const ok = await initializeRoot({ promptIfMissing: true });
    if (!ok) return;
    await ensureWorkspaceSelection({ preferProject, preferNote, forceFirst: !preferProject });
    return;
  }

  const ok = await applyRootPath(state.rootPath);
  if (!ok) {
    const picked = await chooseAndSetRoot();
    if (!picked) return;
    await ensureWorkspaceSelection({ preferProject, preferNote, forceFirst: !preferProject });
    return;
  }

  await ensureWorkspaceSelection({ preferProject, preferNote, forceFirst: !preferProject });
}

function bindEvents() {
  UI.btnChangeRoot.addEventListener('click', async () => {
    await promptChangeRootFolder();
  });
  UI.btnChooseRootEmpty.addEventListener('click', async () => {
    await chooseAndSetRoot();
  });

  UI.btnHideSidebar?.addEventListener('click', () => toggleSidebar());
  UI.btnShowSidebar?.addEventListener('click', () => toggleSidebar());

  UI.projectSort.addEventListener('change', () => {
    state.projectSort = UI.projectSort.value;
    renderProjects();
  });

  UI.btnAddProject.addEventListener('click', async () => {
    if (!(await ensureRoot())) return;
    openProjectModalCreate();
  });

  UI.projectList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      openProjectModalEdit(editBtn.getAttribute('data-edit'));
      return;
    }
    const item = e.target.closest('[data-project]');
    if (!item) return;
    const name = item.getAttribute('data-project');
    await selectProject(name);
  });

  UI.tabsLeft.addEventListener('click', () => {
    const el = UI.noteTabs;
    el.scrollBy({ left: -260, behavior: 'smooth' });
  });
  UI.tabsRight.addEventListener('click', () => {
    const el = UI.noteTabs;
    el.scrollBy({ left: 260, behavior: 'smooth' });
  });

  UI.noteTabs.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-note]');
    if (!tab) return;
    const note = tab.getAttribute('data-note');
    await selectNote(note);
  });

  UI.btnAddNote.addEventListener('click', async () => addNote());

  UI.modeEditor?.addEventListener('change', async () => {
    if (UI.modeEditor.checked) await switchToEditorMode();
  });
  UI.modeMarkdown?.addEventListener('change', async () => {
    if (UI.modeMarkdown.checked) await switchToMarkdownMode();
  });

  UI.btnToggleTheme?.addEventListener('click', () => {
    toggleDarkMode().catch((err) => console.error(err));
  });

  UI.btnSave.addEventListener('click', async () => saveCurrentNote());
  UI.btnDiscard.addEventListener('click', async () => discardCurrentNote());
  UI.btnMoveNote?.addEventListener('click', async () => {
    if (!(await ensureRoot())) return;
    await openMoveNotesModal();
  });
  UI.btnDeleteNote.addEventListener('click', async () => deleteCurrentNote());

  UI.noteName.addEventListener('change', async () => renameCurrentNote());

  UI.markdownRaw.addEventListener('input', () => {
    if (!state.markdownMode) return;
    debounceAutosave(() => UI.markdownRaw.value);
  });

  UI.tinymceHost.addEventListener('mousedown', () => {
    if (state.markdownMode || !state.selectedNote) return;
    focusEditorOnly(getEditor());
  });

  // modal interactions
  UI.iconGrid.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-icon]');
    if (!tile) return;
    setIconSelection(tile.getAttribute('data-icon'));
  });
  UI.colorGrid.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-color]');
    if (!tile) return;
    setColorSelection(tile.getAttribute('data-color'));
  });
  UI.colorPicker.addEventListener('input', () => setColorSelection(UI.colorPicker.value));
  UI.colorHex.addEventListener('change', () => {
    const v = UI.colorHex.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setColorSelection(v);
  });
  UI.btnOrderUp.addEventListener('click', () => shiftProjectModalOrder(-1));
  UI.btnOrderDown.addEventListener('click', () => shiftProjectModalOrder(1));
  UI.btnProjectSave.addEventListener('click', async () => saveProjectModal());
  UI.btnDeleteProjectFooter?.addEventListener('click', async () => deleteProjectFromModal());

  if (window.notemd) {
    window.notemd.onSidebarVisible((v) => setSidebarVisible(v));
    window.notemd.onSetMarkdownMode(() => menuSetMarkdownMode());
    window.notemd.onSetEditorMode(() => menuSetEditorMode());
    window.notemd.onOpenEditorSourceCode(() => menuOpenEditorSourceCode());
    window.notemd.onEditorFullscreen(() => menuToggleEditorFullscreen());
    window.notemd.onRequestChangeRoot(async () => {
      await promptChangeRootFolder();
    });
    window.notemd.onReloadWorkspace(async () => {
      await reloadWorkspace();
    });
    window.notemd.onShowInfo(() => showInfoModal());
    window.notemd.onShowAbout(() => showAboutModal());
    window.notemd.onShowTinyMceSetup(() => openTinyMceSetupFromMenu());
    window.notemd.onShowImport(() => showImportModal());
    window.notemd.onShowExport(() => showExportModal());
    window.notemd.onShowMoveNotes(() => openMoveNotesModal());
  }

  bindImportModal();
  bindExportModal();
  bindMoveNotesModal();

  UI.linkTinyMceSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    openTinyMceSignup().catch((err) => console.error(err));
  });

  UI.tinymceSetupShowKey?.addEventListener('change', () => {
    if (!UI.tinymceSetupInput) return;
    UI.tinymceSetupInput.type = UI.tinymceSetupShowKey.checked ? 'text' : 'password';
  });

  UI.tinymceSetupInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      UI.btnTinyMceSetupSave?.click();
    }
  });
}

async function getAppInfo() {
  if (!window.notemd?.getAppInfo) return null;
  return window.notemd.getAppInfo();
}

function basenameFromPath(filePath) {
  if (!filePath) return '';
  const parts = String(filePath).replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function setImportStatus(message, isError = false) {
  if (!UI.importStatus) return;
  UI.importStatus.textContent = message || '';
  UI.importStatus.classList.toggle('text-danger', Boolean(isError));
  UI.importStatus.classList.toggle('text-secondary', !isError);
}

function updateImportConfirmButton() {
  if (!UI.btnImportConfirm) return;
  const canImport = Boolean(state.rootPath) && importModalState.paths.length > 0;
  UI.btnImportConfirm.disabled = !canImport;
}

function renderImportFileList() {
  if (!UI.importFileList) return;
  if (!importModalState.paths.length) {
    UI.importFileList.innerHTML = '';
    updateImportConfirmButton();
    return;
  }
  UI.importFileList.innerHTML = importModalState.paths
    .map(
      (p) => `
        <li>
          <span class="text-truncate" title="${escapeHtml(p)}">${escapeHtml(basenameFromPath(p))}</span>
          <button type="button" class="import-remove" data-path="${escapeHtml(p)}" aria-label="Remove">&times;</button>
        </li>
      `
    )
    .join('');
  updateImportConfirmButton();
}

function addImportPaths(paths) {
  const next = [...importModalState.paths];
  for (const p of paths || []) {
    const path = String(p || '').trim();
    if (!path || next.includes(path)) continue;
    next.push(path);
  }
  importModalState.paths = next;
  renderImportFileList();
  if (next.length) setImportStatus('');
}

function pathsFromFileList(fileList) {
  const paths = [];
  for (const file of fileList || []) {
    const p = window.notemd?.getPathForFile?.(file) || file?.path || '';
    if (p) paths.push(p);
  }
  return paths;
}

function resetImportModal() {
  importModalState.paths = [];
  renderImportFileList();
  setImportStatus(
    state.rootPath
      ? ''
      : 'Choose a root folder before importing (File → Change Root Folder…).',
    !state.rootPath
  );
}

function showImportModal() {
  resetImportModal();
  const modal = bootstrap.Modal.getOrCreateInstance(UI.importModalEl);
  modal.show();
}

async function runImportFromModal() {
  if (!state.rootPath) {
    setImportStatus('Choose a root folder before importing.', true);
    return;
  }
  if (!importModalState.paths.length) return;

  UI.btnImportConfirm.disabled = true;
  setImportStatus('Importing…');

  const res = await window.notemd.importFromPaths(importModalState.paths);
  const imported = res?.imported || [];
  const failed = res?.failed || [];

  if (!imported.length) {
    const detail =
      failed.length > 0
        ? failed.map((f) => `${basenameFromPath(f.path)}: ${f.error}`).join('; ')
        : res?.error || 'Import failed';
    setImportStatus(detail, true);
    updateImportConfirmButton();
    return;
  }

  bootstrap.Modal.getOrCreateInstance(UI.importModalEl).hide();
  importModalState.paths = [];
  renderImportFileList();

  await refreshProjects();
  const project = res.project || IMPORTS_PROJECT;
  const firstNote = imported[0]?.note;
  await selectProject(project, { preferNote: firstNote });

  if (failed.length > 0) {
    const summary = failed
      .map((f) => `${basenameFromPath(f.path)}: ${f.error}`)
      .join('\n');
    alert(`${imported.length} note(s) imported.\n\nCould not import:\n${summary}`);
  }
}

function getCurrentNoteMarkdown() {
  if (state.markdownMode) return UI.markdownRaw.value || '';
  return htmlToMd(getEditor()?.getContent({ format: 'html' }) || '');
}

function setExportStatus(message, isError = false) {
  if (!UI.exportStatus) return;
  UI.exportStatus.textContent = message || '';
  UI.exportStatus.classList.toggle('text-danger', Boolean(isError));
  UI.exportStatus.classList.toggle('text-secondary', !isError);
}

async function populateExportFormats() {
  if (!UI.exportFormatSelect) return;
  const res = await window.notemd?.getExportFormats?.();
  const formats = res?.formats || [
    { id: 'md', label: 'Markdown' },
    { id: 'txt', label: 'Plain text' },
    { id: 'html', label: 'HTML' },
    { id: 'json', label: 'JSON' },
    { id: 'rtf', label: 'Rich Text (RTF)' }
  ];
  UI.exportFormatSelect.innerHTML = formats
    .map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`)
    .join('');
}

function noteDisplayName(noteFile) {
  return String(noteFile || '').replace(/\.md$/i, '') || 'Untitled';
}

function populateExportScopeOptions() {
  if (!UI.exportScopeSelect) return;

  const currentNote = state.selectedNote ? noteDisplayName(state.selectedNote) : null;
  const currentFolder = state.selectedProject || null;

  const options = [];

  if (currentNote && currentFolder) {
    options.push({
      value: 'current',
      label: `Current note: ${currentNote}`,
      enabled: true
    });
  }

  if (currentFolder) {
    options.push({
      value: 'folder',
      label: `Whole folder: ${currentFolder}`,
      enabled: true
    });
  }

  options.push({
    value: 'all',
    label: 'All notes',
    enabled: Boolean(state.rootPath)
  });

  UI.exportScopeSelect.innerHTML = options
    .map(
      (o) =>
        `<option value="${escapeHtml(o.value)}" ${o.enabled ? '' : 'disabled'}>${escapeHtml(o.label)}</option>`
    )
    .join('');

  if (options.some((o) => o.value === 'current' && o.enabled)) {
    UI.exportScopeSelect.value = 'current';
  } else if (options.some((o) => o.value === 'folder' && o.enabled)) {
    UI.exportScopeSelect.value = 'folder';
  } else {
    UI.exportScopeSelect.value = 'all';
  }

  updateExportScopeUi();
}

function getExportLayout() {
  if (UI.exportLayoutFlat?.checked) return 'flat';
  return 'structure';
}

function updateExportScopeUi() {
  const scope = UI.exportScopeSelect?.value || 'current';
  const isBatch = scope === 'folder' || scope === 'all';
  UI.exportLayoutGroup?.classList.toggle('d-none', !isBatch);

  const needsNote = scope === 'current';
  const hasNote = Boolean(state.selectedNote && state.selectedProject);
  if (UI.btnExportConfirm) {
    UI.btnExportConfirm.disabled = needsNote && !hasNote;
  }
}

async function showExportModal() {
  if (!state.rootPath) {
    alert('Choose a root folder before exporting (File → Change Root Folder…).');
    return;
  }

  const scopeAvailable =
    (state.selectedNote && state.selectedProject) || state.selectedProject || state.rootPath;
  if (!scopeAvailable) {
    alert('Nothing to export yet.');
    return;
  }

  await populateExportFormats();
  populateExportScopeOptions();
  setExportStatus('');
  bootstrap.Modal.getOrCreateInstance(UI.exportModalEl).show();
}

async function runExportFromModal() {
  if (!state.rootPath) {
    setExportStatus('Choose a root folder before exporting.', true);
    return;
  }

  const scope = UI.exportScopeSelect?.value || 'current';
  const format = UI.exportFormatSelect?.value || 'md';
  const layout = getExportLayout();

  if (scope === 'current' && (!state.selectedNote || !state.selectedProject)) {
    setExportStatus('Open a note to export.', true);
    return;
  }

  if (scope === 'folder' && !state.selectedProject) {
    setExportStatus('Select a folder to export.', true);
    return;
  }

  UI.btnExportConfirm.disabled = true;
  setExportStatus(scope === 'current' ? 'Choose where to save…' : 'Choose export folder…');

  const payload = {
    scope,
    format,
    layout,
    project: state.selectedProject,
    noteFile: state.selectedNote,
    currentMarkdown: getCurrentNoteMarkdown()
  };

  const res = await window.notemd.exportNotes(payload);

  UI.btnExportConfirm.disabled = false;
  updateExportScopeUi();

  if (res?.canceled) {
    setExportStatus('');
    return;
  }
  if (!res?.ok) {
    setExportStatus(res?.error || 'Export failed.', true);
    return;
  }

  bootstrap.Modal.getOrCreateInstance(UI.exportModalEl).hide();
  setExportStatus('');

  if (res.failed?.length) {
    const summary = res.failed
      .map((f) => `${f.project}/${f.note}: ${f.error}`)
      .join('\n');
    alert(`${res.count} note(s) exported to:\n${res.path}\n\nFailed:\n${summary}`);
  } else if (res.count > 1) {
    alert(`${res.count} notes exported to:\n${res.path}`);
  }
}

function bindExportModal() {
  if (!UI.exportModalEl) return;

  UI.exportModalEl.addEventListener('hidden.bs.modal', () => setExportStatus(''));

  UI.exportScopeSelect?.addEventListener('change', () => updateExportScopeUi());

  UI.btnExportConfirm?.addEventListener('click', async () => {
    await runExportFromModal();
  });
}

function noteLabelFromFile(noteFile) {
  return String(noteFile || '').replace(/\.md$/i, '') || 'Untitled';
}

function setMoveNotesStatus(message, isError = false) {
  if (!UI.moveNotesStatus) return;
  UI.moveNotesStatus.textContent = message || '';
  UI.moveNotesStatus.classList.toggle('text-danger', Boolean(isError));
  UI.moveNotesStatus.classList.toggle('text-secondary', !isError);
}

function populateMoveProjectSelects() {
  const projects = [...(state.projectsOnDisk || [])].sort((a, b) => a.localeCompare(b));
  const options = projects
    .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
    .join('');
  if (UI.moveSourceProject) UI.moveSourceProject.innerHTML = options;
  if (UI.moveDestProject) UI.moveDestProject.innerHTML = options;
}

function updateMoveNotesConfirmButton() {
  if (!UI.btnMoveNotesConfirm) return;
  const sameFolder =
    moveNotesModalState.sourceProject &&
    moveNotesModalState.sourceProject === moveNotesModalState.destProject;
  const canMove =
    moveNotesModalState.stagedNotes.length > 0 &&
    moveNotesModalState.sourceProject &&
    moveNotesModalState.destProject &&
    !sameFolder;
  UI.btnMoveNotesConfirm.disabled = !canMove;
}

async function loadMoveSourceNotes() {
  const folder = moveNotesModalState.sourceProject;
  if (!folder) {
    moveNotesModalState.allSourceNotes = [];
    renderMoveNotesLists();
    return;
  }
  const res = await window.notemd.listNotes(folder);
  moveNotesModalState.allSourceNotes = res.ok ? res.notes || [] : [];
  moveNotesModalState.stagedNotes = moveNotesModalState.stagedNotes.filter((n) =>
    moveNotesModalState.allSourceNotes.includes(n)
  );
  renderMoveNotesLists();
}

function stageNoteForMove(noteFile) {
  if (!noteFile || moveNotesModalState.stagedNotes.includes(noteFile)) return;
  moveNotesModalState.stagedNotes.push(noteFile);
  renderMoveNotesLists();
}

function unstageNoteForMove(noteFile) {
  moveNotesModalState.stagedNotes = moveNotesModalState.stagedNotes.filter((n) => n !== noteFile);
  renderMoveNotesLists();
}

function renderMoveNotesLists() {
  const staged = new Set(moveNotesModalState.stagedNotes);
  const available = moveNotesModalState.allSourceNotes.filter((n) => !staged.has(n));

  if (UI.moveSourceList) {
    if (!available.length) {
      UI.moveSourceList.innerHTML =
        '<li class="move-note-empty">No notes left in source (or folder is empty).</li>';
    } else {
      UI.moveSourceList.innerHTML = available
        .map(
          (noteFile) => `
        <li>
          <span class="move-note-label" title="${escapeHtml(noteFile)}">${escapeHtml(noteLabelFromFile(noteFile))}</span>
          <button type="button" class="move-note-action" data-action="stage" data-note="${escapeHtml(noteFile)}" title="Move to destination" aria-label="Move to destination">
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </li>
      `
        )
        .join('');
    }
  }

  if (UI.moveDestList) {
    if (!moveNotesModalState.stagedNotes.length) {
      UI.moveDestList.innerHTML =
        '<li class="move-note-empty">Use arrows to add notes to move.</li>';
    } else {
      UI.moveDestList.innerHTML = moveNotesModalState.stagedNotes
        .map(
          (noteFile) => `
        <li>
          <button type="button" class="move-note-action" data-action="unstage" data-note="${escapeHtml(noteFile)}" title="Keep in source" aria-label="Keep in source">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <span class="move-note-label" title="${escapeHtml(noteFile)}">${escapeHtml(noteLabelFromFile(noteFile))}</span>
        </li>
      `
        )
        .join('');
    }
  }

  const sameFolder =
    moveNotesModalState.sourceProject &&
    moveNotesModalState.sourceProject === moveNotesModalState.destProject;
  if (sameFolder) {
    setMoveNotesStatus('Choose a different destination folder.', true);
  } else if (moveNotesModalState.stagedNotes.length) {
    setMoveNotesStatus(
      `${moveNotesModalState.stagedNotes.length} note(s) will move to "${moveNotesModalState.destProject}".`
    );
  } else {
    setMoveNotesStatus('');
  }

  updateMoveNotesConfirmButton();
}

async function openMoveNotesModal() {
  if (!state.rootPath) {
    alert('Choose a root folder first (File → Change Root Folder…).');
    return;
  }
  await refreshProjects();
  populateMoveProjectSelects();

  const defaultSource = state.selectedProject || state.projectsOnDisk[0] || '';
  let defaultDest =
    state.projectsOnDisk.find((p) => p !== defaultSource) || state.projectsOnDisk[0] || '';

  moveNotesModalState.sourceProject = defaultSource;
  moveNotesModalState.destProject = defaultDest;
  moveNotesModalState.stagedNotes = [];

  if (UI.moveSourceProject) UI.moveSourceProject.value = defaultSource;
  if (UI.moveDestProject) UI.moveDestProject.value = defaultDest;

  await loadMoveSourceNotes();
  setMoveNotesStatus('');
  bootstrap.Modal.getOrCreateInstance(UI.moveNotesModalEl).show();
}

async function ensureStagedNotesSavedOnDisk() {
  if (!state.selectedProject || !state.selectedNote) return;
  if (moveNotesModalState.sourceProject !== state.selectedProject) return;
  if (!moveNotesModalState.stagedNotes.includes(state.selectedNote)) return;
  if (!state.dirty && !state.hasTemp) return;
  await saveCurrentNote();
}

async function applyAfterNotesMoved(moved) {
  if (!moved?.length) return;

  const currentMove = moved.find(
    (m) => m.fromProject === state.selectedProject && m.fromFile === state.selectedNote
  );

  if (state.selectedProject && state.selectedNote) {
    saveEditorSession(state.selectedProject, state.selectedNote);
  }

  for (const item of moved) {
    noteEditorSessions.delete(noteSessionKey(item.fromProject, item.fromFile));
  }

  if (currentMove) {
    state.selectedProject = currentMove.toProject;
    state.selectedNote = currentMove.noteFile;
  }

  // Reload tabs/notes from disk (same as View → Reload) so open folder reflects moves immediately.
  await reloadWorkspace();
}

async function saveMoveNotesModal() {
  const { sourceProject, destProject, stagedNotes } = moveNotesModalState;
  if (!sourceProject || !destProject) {
    setMoveNotesStatus('Select source and destination folders.', true);
    return;
  }
  if (sourceProject === destProject) {
    setMoveNotesStatus('Destination must be different from the source folder.', true);
    return;
  }
  if (!stagedNotes.length) {
    setMoveNotesStatus('Add at least one note to move.', true);
    return;
  }

  UI.btnMoveNotesConfirm.disabled = true;
  setMoveNotesStatus('Moving notes…');

  try {
    await ensureStagedNotesSavedOnDisk();
    const res = await window.notemd.moveNotes({
      moves: stagedNotes.map((noteFile) => ({
        fromProject: sourceProject,
        noteFile,
        toProject: destProject
      }))
    });

    if (!res?.ok && !(res?.moved?.length)) {
      setMoveNotesStatus(res?.error || 'Move failed.', true);
      updateMoveNotesConfirmButton();
      return;
    }

    bootstrap.Modal.getOrCreateInstance(UI.moveNotesModalEl).hide();
    moveNotesModalState.stagedNotes = [];
    await applyAfterNotesMoved(res.moved || []);

    if (res.failed?.length) {
      const summary = res.failed
        .map((f) => `${f.noteFile}: ${f.error}`)
        .join('\n');
      alert(`${res.moved.length} note(s) moved.\n\nFailed:\n${summary}`);
    }
  } catch (err) {
    setMoveNotesStatus(err?.message || String(err), true);
    updateMoveNotesConfirmButton();
  }
}

function bindMoveNotesModal() {
  if (!UI.moveNotesModalEl) return;

  UI.moveNotesModalEl.addEventListener('hidden.bs.modal', () => {
    moveNotesModalState.stagedNotes = [];
    setMoveNotesStatus('');
  });

  UI.moveSourceProject?.addEventListener('change', async () => {
    moveNotesModalState.sourceProject = UI.moveSourceProject.value;
    moveNotesModalState.stagedNotes = [];
    await loadMoveSourceNotes();
  });

  UI.moveDestProject?.addEventListener('change', () => {
    moveNotesModalState.destProject = UI.moveDestProject.value;
    renderMoveNotesLists();
  });

  UI.moveSourceList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="stage"]');
    if (!btn) return;
    stageNoteForMove(btn.getAttribute('data-note'));
  });

  UI.moveDestList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="unstage"]');
    if (!btn) return;
    unstageNoteForMove(btn.getAttribute('data-note'));
  });

  UI.btnMoveNotesConfirm?.addEventListener('click', async () => {
    await saveMoveNotesModal();
  });
}

function bindImportModal() {
  if (!UI.importModalEl) return;

  UI.importModalEl.addEventListener('hidden.bs.modal', () => {
    importModalState.paths = [];
    renderImportFileList();
    setImportStatus('');
  });

  const openPicker = () => UI.importFileInput?.click();

  UI.importDropZone?.addEventListener('click', openPicker);
  UI.importDropZone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  UI.importFileInput?.addEventListener('change', () => {
    const paths = pathsFromFileList(UI.importFileInput.files);
    addImportPaths(paths);
    UI.importFileInput.value = '';
  });

  UI.importDropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    UI.importDropZone.classList.add('drag-over');
  });
  UI.importDropZone?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    UI.importDropZone.classList.remove('drag-over');
  });
  UI.importDropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    UI.importDropZone.classList.remove('drag-over');
    addImportPaths(pathsFromFileList(e.dataTransfer?.files));
  });

  UI.importFileList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.import-remove');
    if (!btn) return;
    const path = btn.getAttribute('data-path');
    importModalState.paths = importModalState.paths.filter((p) => p !== path);
    renderImportFileList();
  });

  UI.btnImportConfirm?.addEventListener('click', async () => {
    await runImportFromModal();
  });
}

async function showInfoModal() {
  const info = await getAppInfo();
  if (UI.infoAppVersion) {
    UI.infoAppVersion.textContent = info?.appVersion ? `Version ${info.appVersion}` : 'Version unknown';
  }
  bootstrap.Modal.getOrCreateInstance(UI.infoModalEl).show();
}

function renderAboutVersionRow(name, version) {
  return `<tr><td class="text-secondary">${escapeHtml(name)}</td><td class="text-end font-monospace">${escapeHtml(version || '—')}</td></tr>`;
}

async function showAboutModal() {
  const info = await getAppInfo();
  if (UI.aboutVersionsList && info) {
    const sections = info.components?.length
      ? info.components
      : [
          {
            group: 'Application',
            items: [{ name: 'NoteMD', version: info.appVersion }]
          },
          {
            group: 'Runtime',
            items: [
              { name: 'Electron', version: info.electron },
              { name: 'Chromium', version: info.chrome },
              { name: 'Node.js', version: info.node }
            ]
          }
        ];

    UI.aboutVersionsList.innerHTML = sections
      .map((section) => {
        const head = `<tr class="about-section-head"><td colspan="2" class="small text-secondary fw-semibold pt-2 pb-1">${escapeHtml(section.group)}</td></tr>`;
        const body = (section.items || [])
          .map((item) => renderAboutVersionRow(item.name, item.version))
          .join('');
        return head + body;
      })
      .join('');
  }
  bootstrap.Modal.getOrCreateInstance(UI.aboutModalEl).show();
}

async function openTinyMceSetupFromMenu() {
  const previous = state.tinymceApiKey;
  const ok = await showTinyMceSetupModal({ allowCancel: true });
  if (!ok || state.tinymceApiKey === previous) return;

  const editor = getEditor();
  if (editor) {
    await tinymce.remove('#tinymceEditor');
  }
  editorInitPromise = null;
  await reinitTinyMCE();
}

async function boot() {
  if (!window.notemd) {
    throw new Error('Preload bridge (window.notemd) is missing');
  }

  buildIconGrid();
  buildColorGrid();
  bindEvents();
  updateNoteActionButtons();

  UI.rootPath.textContent = '';
  showEmptyState(true);

  await loadPreferences();
  await loadTinyMceConfig();

  const ok = await initializeRoot({ promptIfMissing: true });
  if (!ok) return;

  const setupOk = await ensureTinyMceSetup({ allowCancel: false });
  if (!setupOk) return;

  await ensureWorkspaceSelection({ forceFirst: true });
  ensureEditorResizeObserver();
}

boot().catch((err) => {
  console.error(err);
  alert(`Startup error: ${err?.message || err}\n\nOpen DevTools (Ctrl+Shift+I) for details.`);
});

