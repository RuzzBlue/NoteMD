# NoteMD (Electron)

**Version 2.3.12** — local-first notes with projects, tabs, TinyMCE + markdown, autosave temp files, dark mode, import/export, and move notes between folders.

Local-first note app that stores **projects as folders** and **notes as `.md` files** inside a user-chosen root directory.

## TinyMCE editor (stable baseline)

The editor setup below is the current known-good configuration — keep these pieces together when changing toolbar or checklist behavior:

| Piece | Role |
|--------|------|
| `src/renderer/renderer.js` | `initTinyMCE()` — dual toolbar rows, plugins, content styles |
| `src/renderer/notemd-checklist-plugin.js` | GFM task lists (`notemdchecklist`), `tox-notemd-checklist` class for list-button state |
| `src/renderer/notemd-toolbar-plugin.js` | Second-row toggle (`notemdtoolbarexpand`, ⋮), expanded by default |
| Turndown + `normalizeTaskListsForTinyMCE` | Markdown ↔ checklist HTML round-trip |

**Toolbar layout:** row 1 = undo, blocks, font size input (px), text styles, colors, align dropdown, ⋮ toggle; row 2 = lists, links/media, `code` / `preview` / `fullscreen`, `removeformat`, `help` (hidden when ⋮ is off).

**App menu:** File (import, export, move notes) · View · Editor · Dev · Help.

**Move notes:** Toolbar **Move to** or File → **Move Notes…** — shuttle notes from a source folder to a destination folder (duplicate names are renamed automatically).

**Import notes:** File → **Import Notes…** — drag-and-drop or pick multiple files (`.txt`, `.md`, `.html`, `.json`, `.rtf`). They are converted to Markdown and saved under **Imports** (`notes/Imports/*.md`). JSON objects with `content`, `markdown`, `body`, or `text` fields map to note content.

**Export notes:** File → **Export Notes…** — export the current note, every note in the current folder, or all notes. Choose Markdown, plain text, HTML, JSON, or RTF for the whole batch. For folder/all exports, pick **keep folder structure** (project subfolders) or **export all in one folder** (flat).

**Root folder:** Last used path is saved in `%AppData%/Roaming/NoteMD/config.json` and restored on startup. Folder picker only appears when no saved path exists or the folder is missing.
## Disk structure (inside your chosen root)

- `notes/<projectName>/<noteName>.md`
- `appdata/data.json` (persistent UI metadata for projects: icon/color/order/createdAt)
- `appdata/temp/` (autosave scratch copies for unsaved note edits)

## Run (dev)

```bash
npm install
npm start
```

## App icon

Place your icon here (project root):

```
Notemd/build/icon.png
```

Use a **square PNG**, at least **256×256** (512×512 or 1024×1024 is better). `electron-builder` converts it to `.ico` for Windows when you run `npm run dist`.

Optional: add `build/icon.ico` yourself if you already have a multi-size Windows icon (then set `"win": { "icon": "build/icon.ico" }` in `package.json`).

## Build Windows installer (.exe)

From the `Notemd` folder:

```bash
npm install
npm run dist
```

Output (version in `package.json`, currently **2.3.12**):

- **Installer:** `dist/NoteMD Setup 2.3.12.exe` (NSIS — use this to install on other PCs)
- **Unpacked app:** `dist/win-unpacked/NoteMD.exe` (run without installing; useful for testing)

To build an unpacked folder only (faster, no installer):

```bash
npm run pack
```

First build downloads Electron binaries and can take a few minutes.

### Build failed at “symbolic link” / no `Setup.exe`?

Windows often blocks `electron-builder` when it extracts **winCodeSign** (needs symlink permission). Your log may show:

`ERROR: Cannot create symbolic link : A required privilege is not held by the client`

**Fix (try in order):**

1. **Use the project build script** (prepares cache without symlinks, then builds):

```bash
npm run dist
```

2. If that still fails, enable **Developer Mode**: Settings → System → For developers → **Developer Mode** → On. Close the terminal, open a new one, run `npm run dist` again.

3. Or run **PowerShell as Administrator** in the `Notemd` folder and run `npm run dist`.

You should get **`dist/NoteMD Setup 2.3.12.exe`** (full installer). Use that—not only `win-unpacked/NoteMD.exe` (portable)—for install, Start Menu, and taskbar pin.

