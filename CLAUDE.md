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

### Remote file edit session naming collision — FIXED
`openRemoteFileForEdit` previously computed `localDestinationPath = joinLocalPath(localDownloadDirectory, entry.name)` — only the filename, ignoring the remote path. Two files named `index.php` in different remote dirs (e.g. `/public/` and `/admin/`) would overwrite each other. Fixed: call `remoteFilesService.downloadRemoteFile(...)` directly (IPC creates a unique `mkdtemp('karga-')` dir per download). Also replaced `window.confirm` re-download dialog with a Vue modal offering "Open existing copy" vs "Re-download from server" choices.

### Worktree agents work from stale base commit
When spawning agents with `isolation: "worktree"`, they fork from the current HEAD at spawn time. If master advances after spawn (e.g. another agent commits), the worktrees are stale. Always `git diff HEAD` inside each worktree to extract only the NEW additions, then apply them surgically to master's current files. Never cherry-pick or direct-merge from stale worktrees.

### Remote scan proxy hash caused all files to show as "modified" — FIXED
`snapshotsScanRemote` used `buildProxyHash(size, mtime, relPath)` = `sha256("mtime|size|path")` for both SFTP and FTP. Local scanning used real content hash `sha256(fileContent)`. Since the two hash methods never match, every file in a local-vs-remote comparison was marked as "modified" even when identical. Fix: download each remote file and compute real SHA-256 content hash. Uses parallel connection pool (`scanConcurrency` threads, default = `cpuCount/2`) to keep it fast.

### CRLF vs LF false positives on cross-platform scans — FIXED
Windows local files use `\r\n`, Linux remote files use `\n`. Hashing raw bytes caused every text file to show as "modified" even when logically identical. Fix: `normalizeForHash(buf)` strips `\r\n`→`\n` in text files (those without null bytes) before hashing in both local and remote scanners. Binary files are left untouched (null byte check). **Existing snapshots must be retaken after this fix** to get normalized hashes; old snapshots still have unnormalized (or proxy) hashes.

### LCS backtracking is O(mn) stack depth — cap file size
The `fileDiff:read` IPC handler uses recursive backtracking (`bt(m,n)`) over the LCS DP table. For very large files (10k+ lines) this will overflow the call stack. Acceptable for typical config/code files; add a file-size guard if needed.

### FTP parallel batches exhaust vsftpd passive ports — FIXED
`snapshotsScanRemote` (FTP branch) used a two-step approach: walk once, then open N parallel FTP connections for batched downloads. Each parallel FTP client requests a new passive port; vsftpd has a limited `pasv_max_port - pasv_min_port` range and throws `500 OOPS: vsf_sysutil_bind, maximum number of attempts to find a listening port exceeded`. Fix: FTP now uses a single connection for the combined walk+hash in one sequential pass. SFTP still uses the parallel batch approach (SFTP multiplexes over SSH and is not affected).

### Sidebar environments not loading on startup — FIXED
`sidebar.load()` in `App.vue`'s `onMounted` restores `expandedProjectIds` from localStorage but never called `loadEnvsFor` for each expanded project. Environments only loaded when the user manually clicked a project to toggle it. Fix: after `sidebar.load()`, iterate `sidebar.expandedProjectIds` and call `void loadEnvsFor(projectId)` for each.

### External editor spawn fails silently on Windows — FIXED
`spawn('code', [localPath])` fails on Windows because `code` is a `.cmd` batch script, not a binary. Using `{ shell: true }` fixes script resolution but breaks arg quoting: Node.js wraps the whole thing in outer quotes for cmd.exe (`cmd /d /s /c "code \"path\""`), causing malformed commands that fail silently and fall back to `shell.openPath()` → system default editor. Fix: use `spawn('cmd.exe', ['/c', cliCmd, localPath], { detached: true, stdio: 'ignore' })` on Windows — Node.js auto-quotes args with spaces, cmd.exe resolves `.cmd` scripts in PATH, no shell-quoting conflicts. The `execPath` (custom `.exe`) case spawns directly without cmd.exe.

### EnvironmentBindingModal shows wrong server/path (race condition) — FIXED
`loadEnvironmentsForSelectedProject` called `projectStore.setEnvironmentsForProject()` immediately after fetching env names (before binding hydration). The async binding hydration loop mutated plain JS objects in place — Vue does not track plain-object property mutations, so the store stayed with `_selectedServer: null`. Clicking "configure" before hydration finished showed empty server/path. Fix: call `projectStore.setEnvironmentsForProject(projectId, [...environments.value])` a second time AFTER the binding hydration loop completes, using a new array reference to trigger reactivity.

### localFiles:readFile UNKNOWN on OneDrive/cloud files — FIXED
`fs.readFile()` fails with `errno: -4094, code: 'UNKNOWN', syscall: 'read'` for OneDrive cloud-only (online-only) files. `lstat` reports them as normal files (`isFile=true`) but the file has no local content — Windows error `ERROR_CLOUD_FILE_PROVIDER_NOT_RUNNING` or `ERROR_CLOUD_FILE_NOT_IN_CACHE`. No Node.js or .NET read method can access these files; the user must first make them locally available (right-click → "Always keep on this device"). Fix: detect `code === 'UNKNOWN'` on win32 in the `localFiles:readFile` handler and throw a user-readable message instead of a raw IPC crash.

### Path traversal guards — assertSafeRelativePath + assertWithinBase
All IPC handlers that take user-supplied relative or remote paths must go through two guards (defined near top of register-ipc-handlers.ts): (1) `assertSafeRelativePath(rel)` — rejects any path containing a `..` segment; (2) `assertWithinBase(base, target)` — resolves both paths and verifies target stays inside base. Applied to: `deployNormalizePosixPath`, `deployRelativeToLocal`, `fileDiffRead` (local + remote), `versionsBackupFile`, `versionsRollback` pre-rollback paths. Never skip these when adding new file IPC handlers.

### shell.openExternal URL scheme whitelist
`shell.openExternal` must only receive `http:` or `https:` URLs — arbitrary schemes can trigger protocol handler exploits. Validation done in preload.ts before the call. Never pass unvalidated strings from IPC/renderer to shell.openExternal.

### BrowserWindow security config
`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false` — all set in create-main-window.ts. Do not weaken these. `sandbox: true` confines the renderer process at the OS level.

### versionsBackupFile "new file" detection via existence check, not error parsing
ssh2-sftp-client and basic-ftp both throw varying error messages for "file not found" (depends on SSH server, FTP server, and library version). Error message string matching (`includes('No such file')`) is unreliable. Fix: open one connection per backup call and call `client.exists()` (SFTP) or `client.size()` (FTP) before attempting download. If file doesn't exist → write to `new_files.json` immediately, no download attempted.

### versionsBackupFile missing credentialOverride — FIXED
`versionsBackupFile` built credentials as `{ username: server.username, password: storedCred }` ignoring `input.credentialOverride`. For servers using SSH key auth or custom credentials the download always used stored (possibly null) password. Fix: call `resolveRemoteCredential(storedCred, input.credentialOverride)` and merge with `server.username`. Also: `backupBeforeUpload()` in FileExplorerPage now passes `credentialOverride: getCredentialOverride()`.

### versionsBackupFile silent fail on new files — FIXED
When a file was being uploaded for the first time (no prior remote copy), `versionSftpDownload` threw "No such file" and the handler returned `{ backed: false }` silently. Fix: detect "No such file" / ENOENT errors and write the remote path to `new_files.json` in the version storage dir, returning `{ backed: false, isNewFile: true }`. The UI counts new files in `backedCount`. On rollback, these files are deleted from the server.

### versionsRollback no pre-rollback snapshot — FIXED
`versionsRollback` restored files without first saving the current remote state. If a rollback went wrong there was no way to undo it. Fix: before uploading backed files, create a new version row (`Pre-rollback (before restoring version N)`) and download all files that will be overwritten (including new-file paths) into it. Also handles `new_files.json` from the target version: those files (which were new when that version was created) are deleted from remote to fully restore the original state.

### Vue 3 Set reactivity — use new Set() on each mutation
`ref<Set<number>>` in Vue 3: mutating a Set in-place (`.add()`, `.delete()`) does not trigger reactivity. Always reassign: `mySet.value = new Set([...mySet.value, id])` and `new Set([...mySet.value].filter(x => x !== id))`. Template calls like `.has()` on the ref value work correctly once the ref is reassigned. Apply this in ALL places that touch the Set, including deletion handlers — missing one (as in `doDeleteVersion`) means the expand-state never clears.

### IPC removeHandler array must be kept in sync — FIXED (5 channels added)
`registerIpcHandlers` removes all handlers at the top before re-registering (macOS `activate` guard). Five channels were missing: `projectsUpdate`, `projectsDelete`, `environmentsUpdate`, `environmentsDelete`, `REMOTE_FILE_CHANNELS.downloadToDirectory`. On macOS, calling `registerIpcHandlers` a second time threw "Attempted to register a second handler". Rule: every `ipcMain.handle(CHANNEL, ...)` line must have its channel in the removal array. Audit both lists whenever adding a handler.

### FTP size() bare catch masks real errors — FIXED
`ftpClient.size()` was inside `catch { /* 550 = no such file */ }` — a bare catch that silently ate network timeouts, permission errors (553), and anything else, treating all failures as "file not found". This caused real errors to silently mark files as "new", which on rollback would delete them from the server instead of restoring them. Fix: `catch (err: any) { if (err?.code !== 550) throw err; }` — only code 550 (File unavailable/not found) is treated as "new file"; everything else propagates.

### versionSftpDownload/Upload missing await on client.end() — FIXED
Both helper functions called `client.end()` bare in `finally` (no `await`, no `try/catch`). If `end()` threw, the exception escaped the finally and crashed the `versionsRollback` loop mid-execution, leaving some files restored and others not. Fix: `finally { try { await client.end(); } catch { /* ignore */ } }` — matching the pattern used everywhere else in the file.

### versionsRollback temp dir leaked per file — FIXED
Restore loop created `mkdtemp` temp dirs but only cleaned the file inside, never the directory. Fix: `fs.rm(tmpDir, { recursive: true, force: true })` in finally instead of `fs.rm(tmpPath)`.

### versionsRollback null local_path guard — FIXED
`version_files.local_path` is `TEXT` (not NOT NULL in schema). Calling `path.basename(null)` throws synchronously before the try block, aborting the whole rollback. Fix: `if (!fileRow.local_path) continue;` before building `tmpPath`.
