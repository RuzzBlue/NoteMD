const { BrowserWindow } = require('electron');

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPrintDocument({ title, html, project }) {
  const safeTitle = escapeHtml(title || 'Untitled');
  const meta = project ? `<div class="print-meta">${escapeHtml(project)}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>
    @page { margin: 18mm 16mm; }
    html, body {
      margin: 0;
      padding: 0;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.55;
    }
    .print-wrap {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 20px 40px;
    }
    .print-title {
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0 0 0.35rem;
    }
    .print-meta {
      color: #6b7280;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1.1em 0 0.45em; line-height: 1.25; }
    p { margin: 0.65em 0; }
    ul, ol { margin: 0.65em 0; padding-left: 1.4em; }
    blockquote {
      margin: 0.85em 0;
      padding: 0.2em 0 0.2em 0.9em;
      border-left: 3px solid #d1d5db;
      color: #374151;
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.92em;
    }
    pre {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.75em 0.9em;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    code {
      background: #f3f4f6;
      padding: 0.1em 0.35em;
      border-radius: 4px;
    }
    table { border-collapse: collapse; width: 100%; margin: 0.85em 0; }
    th, td { border: 1px solid #d1d5db; padding: 0.4em 0.55em; text-align: left; }
    img { max-width: 100%; height: auto; }
    hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1.25em 0; }
  </style>
</head>
<body>
  <div class="print-wrap">
    <h1 class="print-title">${safeTitle}</h1>
    ${meta}
    <div class="print-body">${html || ''}</div>
  </div>
</body>
</html>`;
}

async function runPrintJob(parentWindow, payload) {
  const doc = buildPrintDocument(payload || {});
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(doc)}`;

  const printWindow = new BrowserWindow({
    show: false,
    parent: parentWindow || undefined,
    modal: Boolean(parentWindow),
    width: 800,
    height: 600,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    await printWindow.loadURL(dataUrl);
    const result = await new Promise((resolve) => {
      printWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (!success) {
          resolve({ ok: false, canceled: failureReason === 'Print job canceled', error: failureReason || 'Print failed' });
          return;
        }
        resolve({ ok: true, canceled: false });
      });
    });
    return result;
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

module.exports = {
  buildPrintDocument,
  runPrintJob
};
