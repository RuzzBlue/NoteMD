# NoteMD — Local-First Markdown Notes

A desktop note-taking app built with Electron. Pick a folder on your disk — your notes live there as plain `.md` files, organized into projects. Rich editing with TinyMCE, autosave, dark mode, and full import/export.

![Uploading NoteMD_CAPvCcSDCc.gif…]()


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
- **Remembers your root folder** — last path stored in `%AppData%/Roaming/NoteMD/config.json`

## Quick Start

```bash
npm install
npm start
```

On first launch, pick a root folder for your notes. The app restores that path on every startup.

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
| **Help** | Info, About |

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
