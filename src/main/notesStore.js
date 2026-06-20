const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

function rootNotesDir(rootPath) {
  return path.join(rootPath, 'notes');
}

function rootAppDataDir(rootPath) {
  return path.join(rootPath, 'appdata');
}

function rootTempDir(rootPath) {
  return path.join(rootAppDataDir(rootPath), 'temp');
}

function dataJsonPath(rootPath) {
  return path.join(rootAppDataDir(rootPath), 'data.json');
}

function projectDir(rootPath, folderName) {
  return path.join(rootNotesDir(rootPath), folderName);
}

function notePath(rootPath, folderName, noteFile) {
  return path.join(projectDir(rootPath, folderName), noteFile);
}

const DEFAULT_PROJECT_NAME = 'Folder1';
const DEFAULT_NOTE_FILE = 'Note1.md';

function safeName(input) {
  return String(input || '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function ensureRootInitialized(rootPath) {
  await ensureDir(rootNotesDir(rootPath));
  await ensureDir(rootAppDataDir(rootPath));
  await ensureDir(rootTempDir(rootPath));

  if (!(await exists(dataJsonPath(rootPath)))) {
    const initial = {
      schemaVersion: 1,
      folders: {},
      settings: {
        rootPath
      }
    };
    await fsp.writeFile(dataJsonPath(rootPath), JSON.stringify(initial, null, 2), 'utf8');
  }

  await ensureMinimumWorkspace(rootPath, await loadDataJson(rootPath));
}

async function createDefaultProjectWithNote(rootPath) {
  const folderName = DEFAULT_PROJECT_NAME;
  await ensureDir(projectDir(rootPath, folderName));
  const file = DEFAULT_NOTE_FILE;
  const full = notePath(rootPath, folderName, file);
  if (!(await exists(full))) {
    const md = `# Note1

Welcome to **NoteMD** — your notes live as plain \`.md\` files under **projects** (folders). Use the **Editor** for rich formatting, or switch to **Markdown** to edit the source directly. Changes autosave to a temp copy until you save.

## Text styles

Regular paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

> Blockquote — great for callouts, quotes, or side notes.

---

## Lists

**Bullet list**

- First item
- Second item
  - Nested item (use indent in the toolbar)

**Numbered list**

1. Step one
2. Step two
3. Step three

**Checklist** (click the checkbox in the editor; checked items strike through)

- [ ] Open item — try checking this
- [x] Completed item

---

## Code

\`\`\`javascript
// Fenced code block — use the toolbar "code" or codesample for more languages
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

---

## Links & media

[NoteMD on the web](https://example.com) — use the **link** button to insert or edit links.

Images, embeds, and tables: use the toolbar (**image**, **media**, **table**). Tables also work in markdown:

| Feature   | Where to find it      |
| --------- | --------------------- |
| Projects  | Left sidebar          |
| New note  | **+** on a project    |
| Save      | Toolbar or shortcut   |
| Dark mode | Sun / moon near tabs  |

---

## Tips

- **Undo** is per note — switch tabs and come back; your undo history is still there.
- **Clear document** (menu) empties the editor without deleting the file.
- **View → Reload workspace** refreshes projects and notes from disk.

Happy writing!
`;
    await fsp.writeFile(full, md, 'utf8');
  }
  return { folderName, noteFile: file };
}

async function createUntitledNote(rootPath, folderName) {
  const base = 'Untitled';
  let idx = 1;
  let file = `${base} ${idx}.md`;
  while (await exists(notePath(rootPath, folderName, file))) {
    idx += 1;
    file = `${base} ${idx}.md`;
  }
  const md = `# ${base} ${idx}\n\n`;
  await fsp.writeFile(notePath(rootPath, folderName, file), md, 'utf8');
  return { file };
}

async function ensureDefaultNoteInProject(rootPath, folderName) {
  const notes = await listNotes(rootPath, folderName);
  if (notes.length > 0) return { created: false, noteFile: notes[0] };
  const { file } = await createUntitledNote(rootPath, folderName);
  return { created: true, noteFile: file };
}

async function ensureMinimumWorkspace(rootPath, data) {
  let projectsOnDisk = await listProjects(rootPath);

  if (projectsOnDisk.length === 0) {
    await createDefaultProjectWithNote(rootPath);
    projectsOnDisk = await listProjects(rootPath);
  }

  for (const folderName of projectsOnDisk) {
    await ensureDefaultNoteInProject(rootPath, folderName);
  }

  const ensured = await ensureFolderMetadata(rootPath, data, projectsOnDisk);
  return { data: ensured, projectsOnDisk: await listProjects(rootPath) };
}

async function loadDataJson(rootPath) {
  const raw = await fsp.readFile(dataJsonPath(rootPath), 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { schemaVersion: 1, folders: {}, settings: { rootPath } };
  }
}

async function saveDataJson(rootPath, data) {
  await fsp.writeFile(dataJsonPath(rootPath), JSON.stringify(data, null, 2), 'utf8');
}

async function listProjects(rootPath) {
  const base = rootNotesDir(rootPath);
  await ensureDir(base);
  const ents = await fsp.readdir(base, { withFileTypes: true });
  return ents.filter((e) => e.isDirectory()).map((e) => e.name);
}

function nowIso() {
  return new Date().toISOString();
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

async function ensureFolderMetadata(_rootPath, data, foldersOnDisk) {
  const next = structuredClone(data || {});
  next.folders = next.folders || {};
  next.settings = next.settings || {};

  const existingOrders = Object.values(next.folders)
    .map((m) => m?.order)
    .filter((n) => Number.isFinite(n));
  let maxOrder = existingOrders.length ? Math.max(...existingOrders) : 0;

  for (const folderName of foldersOnDisk) {
    if (!next.folders[folderName]) {
      maxOrder += 1;
      next.folders[folderName] = {
        color: '#2b6cb0',
        icon: 'fa-folder',
        order: maxOrder,
        createdAt: nowIso()
      };
    }
  }

  // Remove metadata for folders that no longer exist.
  for (const folderName of Object.keys(next.folders)) {
    if (!foldersOnDisk.includes(folderName)) delete next.folders[folderName];
  }

  next.folders = resequenceOrders(next.folders);
  return next;
}

async function createProject(rootPath, payload) {
  const name = safeName(payload?.name) || 'New Project';
  const dir = projectDir(rootPath, name);
  if (await exists(dir)) throw new Error('Project already exists');
  await ensureDir(dir);
  await ensureDefaultNoteInProject(rootPath, name);
  return {
    name,
    meta: {
      color: payload?.color || '#2b6cb0',
      icon: payload?.icon || 'fa-folder',
      order: Number.isFinite(payload?.order) ? payload.order : 999999,
      createdAt: nowIso()
    }
  };
}

async function updateProject(rootPath, data, payload) {
  const next = structuredClone(data);
  next.folders = next.folders || {};

  const originalName = payload?.originalName;
  const newName = safeName(payload?.name) || originalName;
  const meta = next.folders[originalName];
  if (!meta) throw new Error('Project metadata not found');

  // rename folder on disk
  if (newName !== originalName) {
    const oldDir = projectDir(rootPath, originalName);
    const newDir = projectDir(rootPath, newName);
    if (await exists(newDir)) throw new Error('Target project name already exists');
    await fsp.rename(oldDir, newDir);

    delete next.folders[originalName];
    next.folders[newName] = { ...meta };
  }

  const key = newName;
  next.folders[key] = {
    ...next.folders[key],
    color: payload?.color ?? next.folders[key].color,
    icon: payload?.icon ?? next.folders[key].icon
  };

  // move order
  const move = payload?.move;
  if (move === -1 || move === 1) {
    const entries = Object.entries(next.folders).map(([name, m]) => ({ name, meta: { ...m } }));
    entries.sort((a, b) => (a.meta.order ?? 0) - (b.meta.order ?? 0));
    const idx = entries.findIndex((e) => e.name === key);
    const swapWith = idx + move;
    if (idx >= 0 && swapWith >= 0 && swapWith < entries.length) {
      const tmp = entries[idx].meta.order;
      entries[idx].meta.order = entries[swapWith].meta.order;
      entries[swapWith].meta.order = tmp;
    }
    next.folders = resequenceOrders(Object.fromEntries(entries.map((e) => [e.name, e.meta])));
  } else {
    next.folders = resequenceOrders(next.folders);
  }

  return { data: next };
}

async function deleteProject(rootPath, data, folderName) {
  const next = structuredClone(data);
  const dir = projectDir(rootPath, folderName);
  await fsp.rm(dir, { recursive: true, force: true });
  if (next?.folders?.[folderName]) delete next.folders[folderName];
  next.folders = resequenceOrders(next.folders || {});
  const workspace = await ensureMinimumWorkspace(rootPath, next);
  return { data: workspace.data, projectsOnDisk: workspace.projectsOnDisk };
}

async function listNotes(rootPath, folderName) {
  const dir = projectDir(rootPath, folderName);
  await ensureDir(dir);
  const ents = await fsp.readdir(dir, { withFileTypes: true });
  return ents
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

async function createNote(rootPath, folderName) {
  return await createUntitledNote(rootPath, folderName);
}

async function readNoteMarkdown(rootPath, folderName, noteFile) {
  return await fsp.readFile(notePath(rootPath, folderName, noteFile), 'utf8');
}

async function writeNoteMarkdown(rootPath, folderName, noteFile, markdown) {
  await fsp.writeFile(notePath(rootPath, folderName, noteFile), markdown ?? '', 'utf8');
}

function tempFileName(folderName, noteFile) {
  // safe + deterministic
  const raw = `${folderName}__${noteFile}`;
  return raw.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}

function getTempPathForNote(rootPath, folderName, noteFile) {
  return path.join(rootTempDir(rootPath), tempFileName(folderName, noteFile));
}

async function readMaybeTempMarkdown(rootPath, folderName, noteFile) {
  const t = getTempPathForNote(rootPath, folderName, noteFile);
  if (await exists(t)) return await fsp.readFile(t, 'utf8');
  return await readNoteMarkdown(rootPath, folderName, noteFile);
}

async function writeTempMarkdown(rootPath, folderName, noteFile, markdown) {
  await ensureDir(rootTempDir(rootPath));
  const t = getTempPathForNote(rootPath, folderName, noteFile);
  await fsp.writeFile(t, markdown ?? '', 'utf8');
}

async function deleteTempMarkdown(rootPath, folderName, noteFile) {
  const t = getTempPathForNote(rootPath, folderName, noteFile);
  await fsp.rm(t, { force: true });
}

async function renameNote(rootPath, folderName, oldFile, newFile) {
  const safe = safeName(newFile);
  const target = safe.toLowerCase().endsWith('.md') ? safe : `${safe}.md`;
  await fsp.rename(notePath(rootPath, folderName, oldFile), notePath(rootPath, folderName, target));

  // also rename temp if exists
  const oldTemp = getTempPathForNote(rootPath, folderName, oldFile);
  const newTemp = getTempPathForNote(rootPath, folderName, target);
  if (await exists(oldTemp)) await fsp.rename(oldTemp, newTemp);
}

async function deleteNote(rootPath, folderName, noteFile) {
  await fsp.rm(notePath(rootPath, folderName, noteFile), { force: true });
  await ensureDefaultNoteInProject(rootPath, folderName);
}

function uniqueNoteFileName(existingNotes, stem) {
  const safeStem = safeName(stem) || 'Untitled';
  let file = safeStem.toLowerCase().endsWith('.md') ? safeStem : `${safeStem}.md`;
  let idx = 2;
  const taken = new Set(existingNotes.map((n) => n.toLowerCase()));
  while (taken.has(file.toLowerCase())) {
    file = `${safeStem} ${idx}.md`;
    idx += 1;
  }
  return file;
}

async function moveNote(rootPath, fromProject, noteFile, toProject) {
  if (fromProject === toProject) {
    throw new Error('Source and destination folder must be different');
  }
  const fromFilePath = notePath(rootPath, fromProject, noteFile);
  if (!(await exists(fromFilePath))) {
    throw new Error(`Note not found: ${noteFile}`);
  }

  await ensureDir(projectDir(rootPath, toProject));
  let destNotes = await listNotes(rootPath, toProject);
  let targetFile = noteFile;
  if (destNotes.some((n) => n.toLowerCase() === targetFile.toLowerCase())) {
    const stem = path.basename(noteFile, path.extname(noteFile));
    targetFile = uniqueNoteFileName(destNotes, stem);
  }

  const toFilePath = notePath(rootPath, toProject, targetFile);
  await fsp.rename(fromFilePath, toFilePath);

  const oldTemp = getTempPathForNote(rootPath, fromProject, noteFile);
  if (await exists(oldTemp)) {
    const newTemp = getTempPathForNote(rootPath, toProject, targetFile);
    await fsp.rename(oldTemp, newTemp);
  }

  await ensureDefaultNoteInProject(rootPath, fromProject);

  return {
    fromProject,
    fromFile: noteFile,
    toProject,
    noteFile: targetFile
  };
}

async function moveNotes(rootPath, moves) {
  const moved = [];
  const failed = [];
  for (const move of moves || []) {
    try {
      const result = await moveNote(
        rootPath,
        move.fromProject,
        move.noteFile,
        move.toProject
      );
      moved.push(result);
    } catch (err) {
      failed.push({
        fromProject: move.fromProject,
        noteFile: move.noteFile,
        toProject: move.toProject,
        error: err?.message || String(err)
      });
    }
  }
  return { ok: moved.length > 0, moved, failed };
}

module.exports = {
  ensureRootInitialized,
  ensureMinimumWorkspace,
  DEFAULT_PROJECT_NAME,
  DEFAULT_NOTE_FILE,
  loadDataJson,
  saveDataJson,
  ensureFolderMetadata,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listNotes,
  createNote,
  readNoteMarkdown,
  writeNoteMarkdown,
  deleteNote,
  moveNote,
  moveNotes,
  renameNote,
  getTempPathForNote,
  readMaybeTempMarkdown,
  writeTempMarkdown,
  deleteTempMarkdown
};

