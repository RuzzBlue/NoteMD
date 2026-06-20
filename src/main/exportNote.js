const path = require('path');
const fsp = require('fs').promises;

const {
  listProjects,
  listNotes,
  readMaybeTempMarkdown
} = require('./notesStore');
const { markdownToExport, EXPORT_FORMATS } = require('./noteFormats');

function safeFileSegment(name) {
  return (
    String(name || '')
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || 'Untitled'
  );
}

function noteStem(noteFile) {
  const base = path.basename(noteFile || 'note.md', path.extname(noteFile || '.md'));
  return safeFileSegment(base);
}

/**
 * Write note markdown to a user-chosen path in the requested format.
 */
async function exportNoteToPath(filePath, markdown, format, meta = {}) {
  const { content } = markdownToExport(markdown, format, meta);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content, 'utf8');
  return { ok: true, path: filePath, format };
}

function getSaveDialogFilter(format) {
  const info = EXPORT_FORMATS[format] || EXPORT_FORMATS.md;
  return [{ name: info.label, extensions: [info.ext] }];
}

function getExportExtension(format) {
  return (EXPORT_FORMATS[format] || EXPORT_FORMATS.md).ext;
}

async function uniqueExportPath(dir, fileName) {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let idx = 2;
  while (true) {
    try {
      await fsp.access(candidate);
      candidate = path.join(dir, `${stem} ${idx}${ext}`);
      idx += 1;
    } catch {
      return candidate;
    }
  }
}

/**
 * @param {'current'|'folder'|'all'} scope
 */
async function collectNotesToExport(rootPath, scope, options = {}) {
  const {
    project,
    noteFile,
    currentMarkdown,
    currentProject,
    currentNoteFile
  } = options;

  const items = [];
  const useLive = (p, f) =>
    p === currentProject && f === currentNoteFile && currentMarkdown != null;

  if (scope === 'current') {
    if (!project || !noteFile) return items;
    const markdown = useLive(project, noteFile)
      ? currentMarkdown
      : await readMaybeTempMarkdown(rootPath, project, noteFile);
    items.push({ project, noteFile, markdown });
    return items;
  }

  if (scope === 'folder') {
    if (!project) return items;
    const notes = await listNotes(rootPath, project);
    for (const f of notes) {
      const markdown = useLive(project, f)
        ? currentMarkdown
        : await readMaybeTempMarkdown(rootPath, project, f);
      items.push({ project, noteFile: f, markdown });
    }
    return items;
  }

  if (scope === 'all') {
    const projects = await listProjects(rootPath);
    for (const p of projects) {
      const notes = await listNotes(rootPath, p);
      for (const f of notes) {
        const markdown = useLive(p, f)
          ? currentMarkdown
          : await readMaybeTempMarkdown(rootPath, p, f);
        items.push({ project: p, noteFile: f, markdown });
      }
    }
  }

  return items;
}

/**
 * @param {'structure'|'flat'} layout
 * @param {'folder'|'all'} scope - batch scope (not current)
 */
function buildExportRelativePath(item, format, layout, scope) {
  const ext = getExportExtension(format);
  const fileName = `${noteStem(item.noteFile)}.${ext}`;

  if (layout === 'structure') {
    return path.join(safeFileSegment(item.project), fileName);
  }

  if (scope === 'folder') {
    return fileName;
  }

  return `${safeFileSegment(item.project)} - ${fileName}`;
}

async function exportNotesToDirectory(destDir, items, format, layout, scope) {
  const usedPaths = new Set();
  const exported = [];
  const failed = [];

  for (const item of items) {
    try {
      const relative = buildExportRelativePath(item, format, layout, scope);
      const dir = path.dirname(relative);
      const outDir = dir === '.' ? destDir : path.join(destDir, dir);
      await fsp.mkdir(outDir, { recursive: true });
      const baseName = path.basename(relative);
      let outPath = path.join(outDir, baseName);
      if (usedPaths.has(outPath.toLowerCase())) {
        outPath = await uniqueExportPath(outDir, baseName);
      } else {
        try {
          await fsp.access(outPath);
          outPath = await uniqueExportPath(outDir, baseName);
        } catch {
          /* file does not exist */
        }
      }
      usedPaths.add(outPath.toLowerCase());
      await exportNoteToPath(outPath, item.markdown, format, {
        project: item.project,
        noteFile: item.noteFile
      });
      exported.push({ path: outPath, project: item.project, note: item.noteFile });
    } catch (err) {
      failed.push({
        project: item.project,
        note: item.noteFile,
        error: err?.message || String(err)
      });
    }
  }

  return { exported, failed };
}

async function runExport(rootPath, payload, showSaveDialog, showDirectoryDialog) {
  const {
    scope = 'current',
    format = 'md',
    layout = 'structure',
    project,
    noteFile,
    currentMarkdown
  } = payload || {};

  const fmt = String(format).toLowerCase();
  const items = await collectNotesToExport(rootPath, scope, {
    project,
    noteFile,
    currentMarkdown,
    currentProject: project,
    currentNoteFile: noteFile
  });

  if (!items.length) {
    return { ok: false, canceled: false, error: 'No notes to export' };
  }

  if (scope === 'current') {
    const item = items[0];
    const { defaultName } = markdownToExport(item.markdown, fmt, {
      title: item.noteFile,
      noteFile: item.noteFile,
      project: item.project
    });
    const res = await showSaveDialog({
      title: 'Export note',
      defaultPath: defaultName,
      filters: [...getSaveDialogFilter(fmt), { name: 'All files', extensions: ['*'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    await exportNoteToPath(res.filePath, item.markdown, fmt, {
      project: item.project,
      noteFile: item.noteFile
    });
    return { ok: true, canceled: false, path: res.filePath, count: 1 };
  }

  const batchScope = scope === 'folder' ? 'folder' : 'all';
  const batchLayout = layout === 'flat' ? 'flat' : 'structure';

  const res = await showDirectoryDialog({
    title: 'Choose folder for exported notes',
    buttonLabel: 'Export here'
  });
  if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };

  const destDir = res.filePaths[0];
  const { exported, failed } = await exportNotesToDirectory(
    destDir,
    items,
    fmt,
    batchLayout,
    batchScope
  );

  if (!exported.length) {
    return {
      ok: false,
      canceled: false,
      error: failed[0]?.error || 'Export failed',
      failed
    };
  }

  return {
    ok: true,
    canceled: false,
    path: destDir,
    count: exported.length,
    exported,
    failed
  };
}

module.exports = {
  exportNoteToPath,
  getSaveDialogFilter,
  markdownToExport,
  collectNotesToExport,
  exportNotesToDirectory,
  runExport
};
