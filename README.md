# NoteMD — Local-First Markdown Notes

A desktop note-taking app built with Electron. Pick a folder on your disk — your notes live there as plain `.md` files, organized into projects. Rich editing with TinyMCE, autosave, dark mode, and full import/export.

<img width="1920" height="1020" alt="NoteMD_CAPvCcSDCc" src="https://github.com/user-attachments/assets/7807bedb-5aa9-48cc-9bb8-9af4cc850315" />

## What's new in 3.0.1

- **Project groups** — expandable sidebar folders with indented projects inside
- **Group-aware export** — export a whole group; structure layout uses `Group/Project/note` paths
- **Group-aware move notes** — source and destination dropdowns organized by group
- **Print preview** — in-app preview before printing (File menu and TinyMCE)
- **Editor improvements** — custom blocks dropdown order, code-mode exit fixes, Default font in font picker
- **Data model v2** — `data.json` adds `groups` and `groupId` per project (auto-migrated from v1)

## Features

- **Local-first storage** — projects are folders, notes are Markdown files on your filesystem
- **Project groups** — create, edit, expand/collapse groups; assign projects to groups or leave ungrouped
- **Rich editor** — TinyMCE with dual toolbar, GFM task lists, font size, colors, preview & fullscreen
- **Three editor modes** — Rich Text, Markdown, or HTML source
- **Projects & tabs** — multiple projects with icons, colors, sort order, and optional group membership; multi-tab note editing
- **Autosave** — scratch copies in `appdata/temp/` so edits survive crashes
- **Dark mode** — sun/moon toggle in the toolbar (persisted across sessions)
- **Import notes** — drag-and-drop or pick files (`.txt`, `.md`, `.html`, `.json`, `.rtf`) → saved under `notes/Imports/`
- **Export notes** — current note, whole folder, whole group, or everything; output as Markdown, plain text, HTML, JSON, or RTF
- **Move notes** — shuttle notes between project folders, with group labels in the picker
- **Print notes** — preview the current note in-app, then send to the system print dialog
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
| **Installer** | `dist/NoteMD Setup 3.0.1.exe` |
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
    data.json         # project + group metadata (icon, color, order, groupId)
    temp/             # autosave scratch files
```

`data.json` schema v2 example:

```json
{
  "schemaVersion": 2,
  "groups": {
    "group-…": { "name": "Work", "icon": "fa-briefcase", "color": "#3b82f6", "order": 1, "expanded": true }
  },
  "folders": {
    "Folder1": { "color": "#2b6cb0", "icon": "fa-folder", "order": 1, "groupId": null }
  }
}
```

Existing workspaces from earlier versions are migrated automatically on first load (`groupId` defaults to `null`).

Notes are plain Markdown — open them in any editor, back them up with any sync tool.

## App Menu

| Menu | Actions |
|------|---------|
| **File** | Print note, change root folder, import notes, export notes, move notes |
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
    notesStore.js        # Projects, notes, groups, filesystem CRUD
    printNote.js         # Print preview and print job
    importNotes.js       # Multi-format import
    exportNote.js        # Multi-format export
    noteFormats.js       # Format conversion helpers
  renderer/
    index.html           # App shell
    renderer.js          # UI logic, TinyMCE init
    styles.css           # Layout & theming
    notemd-blocks-plugin.js      # Custom blocks dropdown
    notemd-fontfamily-plugin.js  # Font family dropdown with Default
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
| `notemd-blocks-plugin.js` | Blocks dropdown order and code-mode exit |
| `notemd-fontfamily-plugin.js` | Font picker with Default stack |
| Turndown + `normalizeTaskListsForTinyMCE` | Markdown ↔ checklist HTML round-trip |

**Toolbar:** row 1 = undo, blocks, font, font size, styles, colors, align, ⋮ toggle · row 2 = lists, links/media, code/preview/fullscreen, removeformat, help.
