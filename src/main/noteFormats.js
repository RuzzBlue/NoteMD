const path = require('path');
const TurndownService = require('turndown');
const turndownPluginGfm = require('turndown-plugin-gfm');
const marked = require('marked');
const parseRTF = require('rtf-parser');

const SUPPORTED_IMPORT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.text',
  '.html',
  '.htm',
  '.json',
  '.rtf'
]);

const EXPORT_FORMATS = {
  md: { ext: 'md', label: 'Markdown', mime: 'text/markdown' },
  txt: { ext: 'txt', label: 'Plain text', mime: 'text/plain' },
  html: { ext: 'html', label: 'HTML', mime: 'text/html' },
  json: { ext: 'json', label: 'JSON', mime: 'application/json' },
  rtf: { ext: 'rtf', label: 'Rich Text (RTF)', mime: 'application/rtf' }
};

const IMPORT_DIALOG_EXTENSIONS = [
  'md',
  'markdown',
  'txt',
  'text',
  'html',
  'htm',
  'json',
  'rtf'
];

marked.setOptions({ gfm: true, breaks: true });

function getTurndown() {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
  });
  if (turndownPluginGfm?.gfm) service.use(turndownPluginGfm.gfm);
  return service;
}

function textToMarkdown(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '\n';
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return `${normalized}\n`;
  return `${paragraphs.join('\n\n')}\n`;
}

function htmlToMarkdown(html) {
  return getTurndown().turndown(html || '');
}

function rtfNodeToText(node) {
  if (!node) return '';
  if (node.value != null && node.value !== '') return String(node.value);
  const chunks = [];
  for (const child of node.content || []) {
    chunks.push(rtfNodeToText(child));
    if (child?.constructor?.name === 'RTFParagraph') chunks.push('\n\n');
  }
  return chunks.join('');
}

function rtfToPlainText(rtf) {
  return new Promise((resolve, reject) => {
    parseRTF.string(rtf || '', (err, doc) => {
      if (err) return reject(err);
      resolve(rtfNodeToText(doc).replace(/\r\n/g, '\n').trim());
    });
  });
}

function jsonObjectToMarkdown(obj) {
  if (obj == null) return '\n';
  if (typeof obj === 'string') return textToMarkdown(obj);
  if (typeof obj !== 'object') return textToMarkdown(String(obj));

  const contentFields = ['markdown', 'content', 'body', 'text', 'note', 'description'];
  for (const field of contentFields) {
    if (typeof obj[field] === 'string' && obj[field].trim()) {
      const title = obj.title || obj.name || obj.subject;
      if (title && typeof title === 'string') {
        return `# ${String(title).trim()}\n\n${obj[field].trim()}\n`;
      }
      return obj[field].endsWith('\n') ? obj[field] : `${obj[field]}\n`;
    }
  }

  return `\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
}

function jsonToMarkdown(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return textToMarkdown(raw);
  }

  if (Array.isArray(data)) {
    const parts = data.map((item) => jsonObjectToMarkdown(item)).filter(Boolean);
    return parts.length ? `${parts.join('\n\n---\n\n')}\n` : '\n';
  }

  return jsonObjectToMarkdown(data);
}

async function readFileToMarkdown(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_IMPORT_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: ${ext || '(no extension)'}`);
  }

  const raw = await require('fs').promises.readFile(filePath, 'utf8');

  switch (ext) {
    case '.md':
    case '.markdown':
      return raw.trim() ? (raw.endsWith('\n') ? raw : `${raw}\n`) : '\n';
    case '.txt':
    case '.text':
      return textToMarkdown(raw);
    case '.html':
    case '.htm':
      return htmlToMarkdown(raw);
    case '.json':
      return jsonToMarkdown(raw);
    case '.rtf': {
      const plain = await rtfToPlainText(raw);
      return textToMarkdown(plain);
    }
    default:
      return textToMarkdown(raw);
  }
}

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markdownToHtmlDocument(markdown, title = 'Note') {
  const body = marked.parse(markdown || '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
${body}
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRtf(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\t/g, '\\tab ')
    .replace(/\n/g, '\\par\n');
}

function markdownToRtf(markdown) {
  const plain = htmlToPlainText(marked.parse(markdown || ''));
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fswiss Helvetica;}}\\f0\\fs24 ${escapeRtf(plain)}}`;
}

function markdownToExport(markdown, format, meta = {}) {
  const fmt = String(format || 'md').toLowerCase();
  const title = meta.title || meta.noteFile || 'note';
  const stem = path.basename(title, path.extname(title));

  switch (fmt) {
    case 'md':
    case 'markdown':
      return {
        content: markdown?.endsWith('\n') ? markdown : `${markdown || ''}\n`,
        ext: 'md',
        defaultName: `${stem}.md`
      };
    case 'txt':
    case 'text':
      return {
        content: `${htmlToPlainText(marked.parse(markdown || ''))}\n`,
        ext: 'txt',
        defaultName: `${stem}.txt`
      };
    case 'html':
    case 'htm':
      return {
        content: markdownToHtmlDocument(markdown, stem),
        ext: 'html',
        defaultName: `${stem}.html`
      };
    case 'json':
      return {
        content: `${JSON.stringify(
          {
            title: stem,
            project: meta.project || null,
            format: 'markdown',
            content: markdown || '',
            exportedAt: new Date().toISOString()
          },
          null,
          2
        )}\n`,
        ext: 'json',
        defaultName: `${stem}.json`
      };
    case 'rtf':
      return {
        content: markdownToRtf(markdown),
        ext: 'rtf',
        defaultName: `${stem}.rtf`
      };
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function getExportFormatList() {
  return Object.entries(EXPORT_FORMATS).map(([id, info]) => ({
    id,
    label: info.label,
    ext: info.ext
  }));
}

function getImportAcceptAttribute() {
  return IMPORT_DIALOG_EXTENSIONS.map((e) => `.${e}`).join(',');
}

module.exports = {
  SUPPORTED_IMPORT_EXTENSIONS,
  EXPORT_FORMATS,
  IMPORT_DIALOG_EXTENSIONS,
  readFileToMarkdown,
  markdownToExport,
  getExportFormatList,
  getImportAcceptAttribute
};
