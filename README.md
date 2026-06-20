# NoteMD — Local-First Markdown Notes

A desktop note-taking app built with Electron. Pick a folder on your disk — your notes live there as plain `.md` files, organized into projects. Rich editing with TinyMCE, autosave, dark mode, and full import/export.

## Features

- **Local-first storage** — projects are folders, notes are Markdown files on your filesystem
- **Rich editor** — TinyMCE with dual toolbar, GFM task lists, font size, colors, preview & fullscreen
- **Three editor modes** — Rich Text, Markdown, or HTML source
- **Projects & tabs** — multiple projects with icons, colors, and sort order; multi-tab note editing
- **Autosave** — scratch copies in `appdata/temp/` so edits survive crashes
- **Dark mode** — sun/moon toggle in the toolbar (persisted across sessions)
- **Import notes** — drag-and-drop or pick files (`.txt`, `.md`, `.html`, `.json`, `.rtf`) → saved under `notes/Imports/`
- **Export notes** — current note, whole folder, or everything; output as Markdown, plain text, HTML, JSON, or RTF
- **Move notes** — shuttle notes between project folders (duplicates renamed automatically)
- **First-run setup** — after choosing your notes folder, a one-time dialog walks you through adding a free TinyMCE API key
- **Remembers your root folder** — last path stored in `%AppData%/Roaming/NoteMD/config.json`

## Quick Start

```bash
npm install
npm start
```

On first launch:

1. Pick a root folder for your notes
2. Enter your **free TinyMCE API key** in the setup dialog (see [Security & API Keys](#security--api-keys))
3. Start writing — the app restores your folder and key on every startup

**Change your API key later:** Help → **Editor API Key…**

**Development mode** (opens DevTools):

```bash
npm run dev
```

## Build Windows Installer

```bash
npm install
npm run dist
```

Output (version from `package.json`):

| Artifact | Path |
|----------|------|
| **Installer** | `dist/NoteMD Setup 2.3.12.exe` |
| **Portable (no install)** | `dist/win-unpacked/NoteMD.exe` |

Unpacked build only (faster, no installer):

```bash
npm run pack
```

First build downloads Electron binaries — allow a few minutes.

### Build failed at "symbolic link"?

Windows may block `electron-builder` when extracting winCodeSign. Try in order:

1. Run `npm run dist` — the project script prepares the cache without symlinks
2. Enable **Developer Mode**: Settings → System → For developers → **Developer Mode** → On, then retry
3. Run PowerShell **as Administrator** in the project folder and run `npm run dist` again

## Data on Disk

Everything lives inside the root folder you choose at startup:

```
your-root/
  notes/
    Folder1/
      Note1.md
    Imports/          # imported files land here
  appdata/
    data.json         # project metadata (icon, color, order)
    temp/             # autosave scratch files
```

Notes are plain Markdown — open them in any editor, back them up with any sync tool.

## App Menu

| Menu | Actions |
|------|---------|
| **File** | Change root folder, import notes, export notes, move notes |
| **View** | Toggle sidebar, window sizing, full screen |
| **Editor** | Rich Text / Markdown / HTML source, full-screen editor |
| **Dev** | Developer tools |
| **Help** | Info, Editor API key, About |

## App Icon

Place a square PNG at `build/icon.png` (256×256 minimum; 512×512 recommended). `electron-builder` converts it to `.ico` for Windows during `npm run dist`.

## Tech Stack

- Electron 42
- TinyMCE 8 (rich text editor)
- Bootstrap 5 (UI)
- Turndown + turndown-plugin-gfm (HTML → Markdown)
- marked (Markdown → HTML)
- rtf-parser (RTF import)
- electron-builder (Windows NSIS installer)

## Project Structure

```
src/
  main/
    main.js              # Electron main process, menus, IPC
    preload.js           # Secure bridge to renderer
    notesStore.js        # Projects, notes, filesystem CRUD
    importNotes.js       # Multi-format import
    exportNote.js        # Multi-format export
    noteFormats.js       # Format conversion helpers
  renderer/
    index.html           # App shell
    renderer.js          # UI logic, TinyMCE init
    styles.css           # Layout & theming
    notemd-checklist-plugin.js   # GFM task lists
    notemd-toolbar-plugin.js     # Expandable second toolbar row
build/
  icon.png               # App icon for packaging
scripts/
  prepare-win-build-cache.ps1    # Windows build helper
```

## Editor Notes (for contributors)

The TinyMCE setup is a known-good baseline — keep these pieces together when changing toolbar or checklist behavior:

| Piece | Role |
|-------|------|
| `renderer.js` → `initTinyMCE()` | Dual toolbar, plugins, content styles |
| `notemd-checklist-plugin.js` | GFM task lists, checklist button state |
| `notemd-toolbar-plugin.js` | Second-row toggle (⋮), expanded by default |
| Turndown + `normalizeTaskListsForTinyMCE` | Markdown ↔ checklist HTML round-trip |

**Toolbar:** row 1 = undo, blocks, font size, styles, colors, align, ⋮ toggle · row 2 = lists, links/media, code/preview/fullscreen, removeformat, help.

## Security & API Keys

**This repo contains no API keys or secrets.** Keys are stored locally on each user's PC only.

### First-time users (installed app)

After you choose your notes folder, NoteMD shows a **TinyMCE setup** dialog. You need a free API key before the rich-text editor works:

1. Click the [tiny.cloud](https://www.tiny.cloud/auth/signup/) link in the dialog (or sign up in your browser)
2. Create a **free** account — no credit card required
3. Open your [Tiny Cloud dashboard](https://www.tiny.cloud/my-account/dashboard/) and copy your API key
4. Paste it into the dialog and click **Save and continue**

The key is saved in `%AppData%/Roaming/NoteMD/config.json` on your machine. It is never committed to GitHub.

To update it later: **Help → Editor API Key…**

### Developers (running from source)

Same first-run dialog appears unless you set the key in your shell before starting:

```bash
set TINYMCE_API_KEY=your-free-tiny-cloud-key-here
npm start
```

(PowerShell: `$env:TINYMCE_API_KEY="your-key"; npm start`)

### What is not a secret

| Value | What it is |
|-------|------------|
| `license_key: 'gpl'` in `renderer.js` | TinyMCE open-source license declaration — safe in public code |
| `%AppData%/Roaming/NoteMD/config.json` | Local preferences: notes folder, dark mode, **your** API key |

### Keeping secrets out of git

- `.env` and `.env.*` are gitignored
- Never commit `config.json` from AppData — it is per-user local storage
- Each person uses their own free TinyMCE key; do not share keys in the repository
