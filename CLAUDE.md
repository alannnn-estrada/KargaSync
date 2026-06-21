# KargaSync — CLAUDE.md

## What is this

Desktop app (Electron + Vue 3 + TypeScript) for comparing file environments between local folders and remote servers (SFTP/FTP). Think "diff tool" for deployment environments — take snapshots, compare them, explore files.

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 41 + electron-forge |
| UI | Vue 3 + Pinia + vue-router + vue-i18n + Tailwind 4 |
| Build | Vite (main: `vite.main.config.ts`, renderer: `vite.renderer.config.mts`, preload: `vite.preload.config.ts`) |
| DB | SQLite via custom wrapper (`src/db/`) |
| Remote | ssh2-sftp-client (SFTP) + basic-ftp (FTP) |
| IPC | Electron ipcMain/ipcRenderer with typed contracts |

## Project structure

```
src/
  electron/main/          # Main process
    main.ts               # App bootstrap (single-instance lock, DB init, IPC register)
    ipc/register-ipc-handlers.ts  # ALL IPC handlers (big file ~1080 lines)
    services/app-menu.ts  # Native context menu
    windows/create-main-window.ts
  preload.ts              # Exposes window.api to renderer
  renderer.ts             # Renderer entry
  App.vue                 # Root: sidebar layout + router-view
  renderer/
    app/router/index.ts   # Routes: /workspace, /servers, /explorer, /settings
    pages/                # WorkspacePage, ServersPage, FileExplorerPage, SettingsPage
    components/           # EnvironmentDiffTree, EnvironmentBindingModal, ChangelogModal, etc.
    stores/               # Pinia stores (project-comparison, settings, sidebar, changelog)
    services/api.ts       # Renderer-side IPC wrappers
    i18n/locales/         # en.json, es.json
  core/
    application/          # Commands + queries (create-project, create-snapshot, get-all-projects, compare-environments)
    domain/snapshots/     # Snapshot types, comparator, repository
    file-scanner/         # Local + SFTP providers, path utils, upload preflight
    shared/utils/         # diff-engine
  db/
    bootstrap.ts          # DB init + migration runner
    schema.sql            # Full schema (projects, environments, snapshots, snapshot_files, servers, bindings, backups)
    project-manager.ts    # CRUD for all entities
    credentials.ts        # Credential store (keychain/encrypted)
    settings-manager.ts
  shared/
    dto/                  # All DTOs (project, server, environment, binding, snapshot, compare)
    ipc/contracts.ts      # IPC_CHANNELS, LOCAL_FILE_CHANNELS, REMOTE_FILE_CHANNELS + RendererApi interface
    settings.ts           # Settings types (language, theme, externalEditor)
```

## Key domain concepts

- **Project** — named workspace with optional local root path
- **Environment** — named slot inside a project (e.g. "production", "staging")
- **EnvironmentBinding** — links an environment to either a local path or a remote server+path
- **Snapshot** — point-in-time capture of file list (hashes + sizes) for an environment
- **Compare** — diff two snapshots: added/deleted/modified/unchanged per file

## IPC pattern

All renderer↔main communication goes through typed channels:
- `IPC_CHANNELS` — projects, environments, bindings, snapshots, compare, settings, dialog, servers
- `LOCAL_FILE_CHANNELS` — local FS operations
- `REMOTE_FILE_CHANNELS` — SFTP/FTP operations

`window.api` in the renderer is typed via `RendererApi` interface in `src/shared/ipc/contracts.ts`.

## Remote file operations

Each remote operation creates a **new connection per call** (no persistent connection pool). Timeout: 15s (`REMOTE_OPERATION_TIMEOUT_MS`).

FTP quirks:
- `localhost` normalized to `127.0.0.1` (Docker Desktop + vsftpd passive mode)
- `prepareTransfer = enterPassiveModeIPv4` forced on all FTP clients
- FTP paths stripped of leading `/` when using `ensureDir`

SFTP quirk:
- `list('.')` used instead of `list('/')` when path is root

## Dev commands

```bash
npm run dev       # electron-forge start (full dev)
npm run lint      # eslint
npm run make      # build distributable
```

SQLite DB stored at Electron userData path: `karga-sync.sqlite3`

## Known pitfalls / past errors

> **Add entries here whenever something fails and the root cause is found.**

### FTP passive mode with Docker Desktop
`localhost` must be mapped to `127.0.0.1` and `enterPassiveModeIPv4` must be set on every FTP client instance. Forgetting either causes connection hangs with vsftpd on Docker Desktop.

### SFTP root listing
`client.list('/')` can fail on some servers; always use `client.list('.')` when path is `/`.

### IPC handler deduplication
`registerIpcHandlers` starts with a `removeHandler` loop for all channels — required because on macOS `activate` can call it twice. Never add a new channel to the removal list without also adding the `ipcMain.handle` below it.

### writeFile channel was missing from removal list — FIXED
`LOCAL_FILE_CHANNELS.writeFile` was handled but missing from the `removeHandler` array at top of `registerIpcHandlers`. Fixed in design overhaul commit.

### settings-store cache drops externalEditor — FIXED
`setLanguage()` and `setTheme()` both called `cacheSettings({ language, theme })` omitting `externalEditor`. Every time the user changed language or theme, the external editor preference was silently reset to `'system'`. Fixed to pass all three fields.

### TypeScript version
Project uses TypeScript `~4.5.4` (older). Avoid TS 4.6+ syntax. `satisfies` operator (4.9+) appears in `changelog.ts:65` — pre-existing, not a blocker because Vite/esbuild strips types at runtime.

### Dark mode accent in dark theme
`--app-accent: #22436b` was so dark it was nearly invisible on dark backgrounds. Changed to `#3b82f6` in both light and dark `:root` overrides.

### EnvironmentBindingModal used wrong i18n key
`t('changelog.close')` was used for the cancel button. Changed to `t('actions.cancel')`.

### Context menus go off-screen near viewport edges
`openContextMenu()` used raw `event.clientX/Y` without clamping. Added viewport clamping with MENU_WIDTH=224 and MENU_HEIGHT_ESTIMATE=320 guard.

### File list UL causes unbounded page growth
File lists in FileExplorerPage had no height constraint — with many files the pane grew to thousands of pixels. Added `max-h-[min(40vh,480px)] overflow-y-auto` to both local and remote file list containers.

### FileExplorer panes stacked at 1200px window width
`xl:grid-cols-[...]` breakpoint = 1280px viewport. Default window is 1200px, so panes always stacked. Fixed by adding `lg:grid-cols-2` (1024px breakpoint) before the xl override.

### SettingsPanel header duplicated with SettingsPage
SettingsPanel.vue had its own title/description block, mirroring what SettingsPage.vue already renders as a page header. Removed the header from SettingsPanel.

### SettingsPanel theme labels hardcoded English
`themeOptions` array had `label: 'Auto'/'Light'/'Dark'` hardcoded. Template now uses `t(\`settings.\${opt.value}\`)` to pick up translated labels.

### playwright screenshots grab DevTools window, not the app
Electron auto-opens DevTools in detached mode in dev builds. `app.firstWindow()` or `app.windows()[0]` returns the DevTools window (url = devtools://...). Must filter: `app.windows().find(w => !w.url().startsWith('devtools://'))`.

### playwright fails with single-instance lock when app already running
`requestSingleInstanceLock()` returns false → app quits immediately. Launch with `--user-data-dir=<tmp>` to bypass the lock and run a second instance for testing.

### Versioning: session model, not per-file atomic
The versioning system works as a session: `versionsStart` creates a running session, each upload calls `versionsBackupFile` (backs up the current remote file before it's overwritten), `versionsFinish` or `versionsAbort` closes the session. Rollback uses `version_files` table (records each backed-up remote_path → local_path pair). `version_files` must exist or rollback does nothing. The `versions` table is scoped per server_id, not per path. `pushTransferLog` signature is `(message: string, level?, operationId?)` — positional, not object.

### PPK key format
PPK files detected by `isPpkContent()` (prefix `PuTTY-User-Key-File-`). Converted to PEM via pure Node.js JWK import (`crypto.createPrivateKey({ format: 'jwk' })`). Encrypted PPK (with passphrase) throws — not supported. `resolveSftpPrivateKey()` helper in register-ipc-handlers.ts wraps this transparently. Key file chooser (`chooseKeyFile` IPC) reads the file content and returns it as string — the credential store holds the full key content, not a file path.

### openRemoteFileForEdit checked existing session AFTER download — FIXED
The existing-session check (and `window.confirm` re-download prompt) was placed AFTER `downloadRemoteFileIntoLocalPath` and `openRemoteFileExternal`, so the file was already overwritten locally and opened before asking. Moved the check to before `runTransferOperation` so the user can cancel without triggering any download.

### Pinia 3 auto-unwraps refs/computed in store proxy — use storeToRefs — FIXED
Pinia 3 wraps setup stores in `reactive()`, which auto-unwraps nested refs and computed refs. So `projectStore.selectedProjectId` returns the raw value (e.g. `null`) NOT a `ComputedRef`. Doing `const selectedProjectId = projectStore.selectedProjectId` captures a stale primitive — `.value` on it is `undefined`, watches on it are inert, and the variable never updates when the store changes. Fix: always use `storeToRefs(projectStore)` to extract reactive refs: `const { projects, selectedProject, selectedProjectId } = storeToRefs(projectStore)`. The `environments:create` error "Provided value cannot be bound to SQLite parameter 1" was caused by `selectedProjectId.value` returning `undefined` (from a captured `null`), which `node:sqlite` cannot bind.

### Sidebar collapsed overflow — FIXED
When `isSidebarCollapsed=true`, the old markup tried to reuse expanded layout with conditional Tailwind classes. Two bugs: (1) `px-2.5 py-2.5 md:w-11` on nav links — 32px icon + 20px padding = 52px but w-11=44px; (2) two `h-9 w-9` buttons side by side (76px) in 44px content area. Fixed by using separate `<template v-if>` blocks for expanded vs collapsed header, and `justify-center p-2 w-full` on nav items in collapsed mode.

### Ignore patterns DB migration version
`ignore_patterns` table uses migration version **4**. Versions 1–3 were already claimed by earlier migrations. Always check the latest migration version in `src/db/bootstrap.ts` before adding a new one.

### Deploy push channel requires isDestroyed() guard
`event.sender.send(DEPLOY_CHANNELS.progress, ...)` must be wrapped with `if (!event.sender.isDestroyed())` — the renderer window may close mid-transfer and sending to a destroyed webContents throws. Pattern used in `deploy:batch` handler in `register-ipc-handlers.ts`.

### Worktree agents work from stale base commit
When spawning agents with `isolation: "worktree"`, they fork from the current HEAD at spawn time. If master advances after spawn (e.g. another agent commits), the worktrees are stale. Always `git diff HEAD` inside each worktree to extract only the NEW additions, then apply them surgically to master's current files. Never cherry-pick or direct-merge from stale worktrees.
