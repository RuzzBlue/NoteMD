const path = require('path');
const fsp = require('fs').promises;

const { readFileToMarkdown, SUPPORTED_IMPORT_EXTENSIONS } = require('./noteFormats');

const {
  listProjects,
  listNotes,
  loadDataJson,
  saveDataJson,
  ensureFolderMetadata,
  writeNoteMarkdown
} = require('./notesStore');

const IMPORTS_PROJECT_NAME = 'Imports';

function importsProjectDir(rootPath) {
  return path.join(rootPath, 'notes', IMPORTS_PROJECT_NAME);
}

function safeName(input) {
  return String(input || '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function uniqueNoteFileName(existingNotes, stem) {
  const safeStem = safeName(stem) || 'Imported note';
  let file = `${safeStem}.md`;
  let idx = 2;
  const taken = new Set(existingNotes.map((n) => n.toLowerCase()));
  while (taken.has(file.toLowerCase())) {
    file = `${safeStem} ${idx}.md`;
    idx += 1;
  }
  return file;
}

async function ensureImportsProjectDir(rootPath) {
  const dir = importsProjectDir(rootPath);
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Import files into notes/Imports/*.md
 * @param {string} rootPath
 * @param {string[]} filePaths
 */
async function importFilesAsNotes(rootPath, filePaths) {
  if (!rootPath) throw new Error('Root not set');
  const paths = [...new Set((filePaths || []).filter(Boolean))];
  if (!paths.length) {
    return { ok: false, error: 'No files selected', imported: [], failed: [] };
  }

  await ensureImportsProjectDir(rootPath);
  let data = await loadDataJson(rootPath);
  const existingNotes = await listNotes(rootPath, IMPORTS_PROJECT_NAME);
  const imported = [];
  const failed = [];

  for (const sourcePath of paths) {
    try {
      const stat = await fsp.stat(sourcePath);
      if (!stat.isFile()) {
        failed.push({ path: sourcePath, error: 'Not a file' });
        continue;
      }
      const markdown = await readFileToMarkdown(sourcePath);
      const stem = path.basename(sourcePath, path.extname(sourcePath));
      const noteFile = uniqueNoteFileName(existingNotes, stem);
      await writeNoteMarkdown(rootPath, IMPORTS_PROJECT_NAME, noteFile, markdown);
      existingNotes.push(noteFile);
      imported.push({ source: sourcePath, note: noteFile, name: path.basename(sourcePath) });
    } catch (err) {
      failed.push({ path: sourcePath, error: err?.message || String(err) });
    }
  }

  const projectsOnDisk = await listProjects(rootPath);
  data = await ensureFolderMetadata(rootPath, data, projectsOnDisk);
  if (imported.length > 0 && data.folders[IMPORTS_PROJECT_NAME]) {
    data.folders[IMPORTS_PROJECT_NAME] = {
      ...data.folders[IMPORTS_PROJECT_NAME],
      color: '#0d9488',
      icon: 'fa-file-import'
    };
  }
  await saveDataJson(rootPath, data);

  return {
    ok: imported.length > 0,
    project: IMPORTS_PROJECT_NAME,
    imported,
    failed,
    data,
    projectsOnDisk
  };
}

module.exports = {
  IMPORTS_PROJECT_NAME,
  SUPPORTED_IMPORT_EXTENSIONS,
  importFilesAsNotes
};
