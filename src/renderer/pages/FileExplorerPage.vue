<template>
    <section class="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col gap-4 px-3 py-3 md:px-4 md:py-4">
        <header class="rounded-3xl border border-(--app-border) bg-(--app-surface) px-5 py-4 shadow-(--app-shadow)">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-(--app-muted)">{{
                t('servers.ftpExplorer') }}</p>
            <h1 class="mt-1 text-xl font-semibold tracking-tight text-(--app-text)">{{ t('servers.explorerMenu') }}</h1>
            <p class="mt-2 max-w-3xl text-sm text-(--app-muted)">{{ t('servers.explorerDescription') }}</p>
        </header>

        <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <article
                class="relative rounded-2xl border border-(--app-border) bg-(--app-elevated) p-4 shadow-(--app-shadow-sm)"
                :class="activeExplorerPane === 'local' ? 'ring-2 ring-(--app-accent) ring-offset-2 ring-offset-transparent' : ''"
                @click="setActiveExplorerPane('local')" @contextmenu.prevent="openContextMenu($event, 'local')">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                            t('servers.localFiles') }}</p>
                        <p class="mt-1 text-sm text-(--app-muted)">{{ t('servers.localFilesDescription') }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-2 text-sm font-semibold"
                            @click="chooseLocalRoot">
                            {{ t('servers.chooseFolder') }}
                        </button>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-2 text-sm font-semibold"
                            @click="loadLocalFiles">
                            {{ t('servers.refresh') }}
                        </button>
                    </div>
                </div>

                <label class="mt-3 block">
                    <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                        t('servers.localPath') }}</span>
                    <input v-model="localPath" type="text"
                        class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                        @keyup.enter="loadLocalFiles" />
                </label>

                <div
                    class="mt-3 rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-3 text-sm text-(--app-muted)">
                    <p class="font-medium text-(--app-text)">{{ t('servers.localSelection') }}</p>
                    <p class="mt-1 truncate">{{ selectedLocalFileLabel }}</p>
                    <div v-if="localClipboard || remoteClipboard" class="mt-2 flex flex-wrap items-center gap-2">
                        <span v-if="localClipboard" class="rounded-full px-2.5 py-1 text-xs font-semibold"
                            :class="localClipboard.mode === 'cut' ? 'bg-(--status-deleted-bg) text-(--status-deleted-text)' : 'bg-(--status-modified-soft) text-(--status-modified-text)'">
                            {{ localClipboard.mode === 'cut' ? t('servers.clipboardCut') : t('servers.clipboardCopy') }}
                            {{ localClipboard.entries.length }}
                        </span>
                        <span v-else-if="remoteClipboard" class="rounded-full px-2.5 py-1 text-xs font-semibold"
                            :class="remoteClipboard.mode === 'cut' ? 'bg-(--status-deleted-bg) text-(--status-deleted-text)' : 'bg-(--status-modified-soft) text-(--status-modified-text)'">
                            {{ remoteClipboard.mode === 'cut' ? t('servers.clipboardCut') : t('servers.clipboardCopy')
                            }}
                            {{ remoteClipboard.entries.length }}
                        </span>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-1.5 text-xs font-semibold"
                            @click="void pasteCurrentClipboard()">
                            {{ t('servers.pasteHere') }}
                        </button>
                        <button type="button"
                            class="rounded-lg border border-(--status-deleted-border) bg-(--status-deleted-bg) px-3 py-1.5 text-xs font-semibold text-(--status-deleted-text)"
                            @click="clearClipboardState">
                            {{ t('servers.clearClipboard') }}
                        </button>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <button type="button"
                            class="rounded-lg bg-(--app-accent) px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="!canUploadSelectedLocalFile || !selectedServerId || isRemoteLoading"
                            @click="uploadSelectedLocalFile">
                            {{ t('servers.uploadSelected') }}
                        </button>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold"
                            :disabled="!selectedLocalFile" @click="selectLocalEntry(selectedLocalFile!)">
                            {{ t('servers.selectFile') }}
                        </button>
                    </div>
                </div>

                <!-- Sort + filter toolbar -->
                <div class="mt-3 flex items-center gap-1.5">
                    <input v-model="localFilter" type="text"
                        class="min-w-0 flex-1 rounded-lg border border-(--app-border) bg-(--app-input) px-2.5 py-1.5 text-xs outline-none ring-(--app-accent) transition placeholder:text-(--app-muted) focus:ring-1"
                        :placeholder="t('servers.filterFiles')" />
                    <div class="flex items-center rounded-lg border border-(--app-border) bg-(--app-muted-surface) text-xs">
                        <button type="button"
                            class="flex items-center gap-1 px-2 py-1.5 transition hover:text-(--app-text)"
                            :class="localSortKey === 'name' ? 'text-(--app-accent)' : 'text-(--app-muted)'"
                            :title="t('servers.sortByName')" @click="toggleLocalSort('name')">
                            <span>Az</span>
                            <svg v-if="localSortKey === 'name'" class="h-2.5 w-2.5" viewBox="0 0 8 8" fill="currentColor">
                                <path :d="localSortDir === 'asc' ? 'M4 1L7 6H1Z' : 'M4 7L1 2H7Z'"/>
                            </svg>
                        </button>
                        <span class="h-4 w-px bg-(--app-border)" />
                        <button type="button"
                            class="flex items-center gap-1 px-2 py-1.5 transition hover:text-(--app-text)"
                            :class="localSortKey === 'size' ? 'text-(--app-accent)' : 'text-(--app-muted)'"
                            :title="t('servers.sortBySize')" @click="toggleLocalSort('size')">
                            <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 10V2M5 10V5M8 10V3M11 10V7"/></svg>
                            <svg v-if="localSortKey === 'size'" class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
                                <path :d="localSortDir === 'asc' ? 'M4 1L7 6H1Z' : 'M4 7L1 2H7Z'"/>
                            </svg>
                        </button>
                        <span class="h-4 w-px bg-(--app-border)" />
                        <button type="button"
                            class="flex items-center gap-1 px-2 py-1.5 transition hover:text-(--app-text)"
                            :class="localSortKey === 'date' ? 'text-(--app-accent)' : 'text-(--app-muted)'"
                            :title="t('servers.sortByDate')" @click="toggleLocalSort('date')">
                            <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="10" height="9" rx="1"/><path d="M1 5h10M4 1v2M8 1v2"/></svg>
                            <svg v-if="localSortKey === 'date'" class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
                                <path :d="localSortDir === 'asc' ? 'M4 1L7 6H1Z' : 'M4 7L1 2H7Z'"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <p v-if="isLocalLoading" class="mt-3 text-sm text-(--app-muted)">{{ t('servers.loadingLocal') }}</p>
                <p v-else-if="localErrorMessage" class="mt-3 text-sm text-(--status-deleted-text)">{{ localErrorMessage
                }}</p>

                <ul v-if="displayedLocalEntries.length > 0 || canGoLocalParent" class="mt-2 max-h-[min(40vh,480px)] space-y-0.5 overflow-y-auto rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-1.5">
                    <li v-if="canGoLocalParent"
                        class="flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer transition-colors hover:bg-(--app-muted-surface)"
                        @click="goLocalParent">
                        <span class="shrink-0 text-base leading-none">📁</span>
                        <span class="min-w-0 flex-1 truncate text-sm font-medium text-(--app-muted)">..</span>
                        <span class="shrink-0 text-xs text-(--app-muted) italic">{{ t('servers.back') }}</span>
                    </li>
                    <li v-for="entry in displayedLocalEntries" :key="entry.path"
                        class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                        :class="[
                            isLocalEntrySelected(entry.path)
                                ? 'bg-(--app-accent)/10 ring-1 ring-(--app-accent)/30'
                                : 'hover:bg-(--app-muted-surface)',
                            entry.isDirectory ? 'cursor-pointer' : 'cursor-grab'
                        ]"
                        :draggable="!entry.isDirectory" @click="handleLocalEntryClick(entry, $event)"
                        @dblclick="handleLocalEntryDoubleClick(entry)" @dragstart="handleLocalDragStart(entry, $event)"
                        @dragend="handleLocalDragEnd" @contextmenu.prevent.stop="handleLocalContextMenu($event, entry)">
                        <span class="shrink-0 text-base leading-none">{{ entry.isDirectory ? '📁' : '📄' }}</span>
                        <span class="min-w-0 flex-1 truncate text-sm" :class="isLocalEntrySelected(entry.path) ? 'font-medium text-(--app-text)' : 'text-(--app-text)'">{{ entry.name }}</span>
                        <span class="shrink-0 text-xs text-(--app-muted)">{{ formatEntryMeta(entry) }}</span>
                    </li>
                </ul>
                <p v-else-if="localFilter && localEntries.length > 0" class="mt-2 rounded-lg border border-dashed border-(--app-border) px-3 py-3 text-xs text-(--app-muted)">
                    {{ t('servers.noMatchingFiles') }}
                </p>
                <p v-else class="mt-3 text-sm text-(--app-muted)">{{ t('servers.localNoFiles') }}</p>

                <div v-if="contextMenu.visible && contextMenu.scope === 'local'"
                    class="fixed z-50 min-w-52 rounded-lg border border-(--app-border) bg-(--app-surface) p-1 shadow-(--app-shadow)"
                    :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
                    <button v-if="contextMenu.entry?.isDirectory" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => openLocalEntry(contextMenu.entry!))">
                        {{ t('servers.open') }}
                    </button>
                    <button v-if="contextMenu.entry && !contextMenu.entry.isDirectory" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => uploadSpecificLocalFile(contextMenu.entry!))">
                        {{ t('servers.uploadSelected') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => copySelectedLocalEntries('copy'))">
                        {{ t('servers.copy') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => copySelectedLocalEntries('cut'))">
                        {{ t('servers.cut') }}
                    </button>
                    <button v-if="!contextMenu.entry && (localClipboard || remoteClipboard)" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(pasteCurrentClipboard)">
                        {{ t('servers.pasteHere') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => renameLocalEntry(contextMenu.entry!))">
                        {{ t('servers.rename') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm text-(--status-deleted-text) hover:bg-(--status-deleted-bg)"
                        @click="runMenuAction(() => deleteLocalEntry(contextMenu.entry!))">
                        {{ t('servers.delete') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(chooseLocalRoot)">
                        {{ t('servers.chooseFolder') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(loadLocalFiles)">
                        {{ t('servers.refresh') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(createLocalFolder)">
                        {{ t('servers.newFolder') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(createLocalFile)">
                        {{ t('servers.newFile') }}
                    </button>
                </div>
            </article>

            <article
                class="relative rounded-2xl border border-(--app-border) bg-(--app-elevated) p-4 shadow-(--app-shadow-sm)"
                :class="isRemoteDropActive ? 'ring-2 ring-(--app-accent) ring-offset-2 ring-offset-transparent' : ''"
                @click="setActiveExplorerPane('remote')" @contextmenu.prevent="openContextMenu($event, 'remote')"
                @dragover.prevent="handleRemoteDragOver" @dragleave="handleRemoteDragLeave"
                @drop.prevent="handleRemoteDrop">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p class="text-xs font-medium uppercase tracking-[0.14em] text-(--app-muted)">{{
                            t('servers.remoteFiles') }}</p>
                        <p class="mt-1 text-sm text-(--app-muted)">{{ t('servers.remoteFilesDescription') }}</p>
                        <p class="mt-1 text-xs text-(--app-muted)">{{ t('servers.dragDropHint') }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <select v-model.number="selectedServerId"
                            class="rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm"
                            @change="selectServer(selectedServerId)">
                            <option :value="null">{{ t('project.selectServerPlaceholder') }}</option>
                            <option v-for="server in servers" :key="server.id" :value="server.id">
                                {{ server.name || server.host }}
                            </option>
                        </select>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-2 text-sm font-semibold"
                            :disabled="!selectedServerId || isRemoteLoading" @click="loadRemoteFiles">
                            {{ t('servers.refresh') }}
                        </button>
                        <span v-if="activeRemoteEditSessionCount > 0"
                            class="rounded-lg border border-(--status-modified-border) bg-(--status-modified-soft) px-3 py-2 text-xs font-semibold text-(--status-modified-text)">
                            {{ t('servers.autoSyncActive', { count: activeRemoteEditSessionCount }) }}
                        </span>
                    </div>
                </div>

                <div
                    class="mt-3 rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-3 text-sm text-(--app-muted)">
                    <p class="font-medium text-(--app-text)">{{ t('servers.uploadSelected') }}</p>
                    <p class="mt-1 truncate">{{ selectedRemoteFileLabel }}</p>
                    <div v-if="remoteClipboard || localClipboard" class="mt-2 flex flex-wrap items-center gap-2">
                        <span v-if="remoteClipboard" class="rounded-full px-2.5 py-1 text-xs font-semibold"
                            :class="remoteClipboard.mode === 'cut' ? 'bg-(--status-deleted-bg) text-(--status-deleted-text)' : 'bg-(--status-modified-soft) text-(--status-modified-text)'">
                            {{ remoteClipboard.mode === 'cut' ? t('servers.clipboardCut') : t('servers.clipboardCopy')
                            }}
                            {{ remoteClipboard.entries.length }}
                        </span>
                        <span v-else-if="localClipboard" class="rounded-full px-2.5 py-1 text-xs font-semibold"
                            :class="localClipboard.mode === 'cut' ? 'bg-(--status-deleted-bg) text-(--status-deleted-text)' : 'bg-(--status-modified-soft) text-(--status-modified-text)'">
                            {{ localClipboard.mode === 'cut' ? t('servers.clipboardCut') : t('servers.clipboardCopy') }}
                            {{ localClipboard.entries.length }}
                        </span>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-1.5 text-xs font-semibold"
                            @click="void pasteCurrentClipboard()">
                            {{ t('servers.pasteHere') }}
                        </button>
                        <button type="button"
                            class="rounded-lg border border-(--status-deleted-border) bg-(--status-deleted-bg) px-3 py-1.5 text-xs font-semibold text-(--status-deleted-text)"
                            @click="clearClipboardState">
                            {{ t('servers.clearClipboard') }}
                        </button>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <button type="button"
                            class="rounded-lg bg-(--app-accent) px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="!canUploadSelectedLocalFile || !selectedServerId || isRemoteLoading"
                            @click="uploadSelectedLocalFile">
                            {{ t('servers.uploadSelected') }}
                        </button>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold"
                            :disabled="!selectedServerId" @click="createRemoteFolder">
                            {{ t('servers.newFolder') }}
                        </button>
                        <button type="button"
                            class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold"
                            :disabled="!selectedServerId" @click="createRemoteFile">
                            {{ t('servers.newFile') }}
                        </button>
                    </div>
                </div>

                <label class="mt-3 block">
                    <span class="text-xs font-medium uppercase tracking-[0.12em] text-(--app-muted)">{{
                        t('servers.remotePath') }}</span>
                    <input v-model="remotePath" type="text"
                        class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                        :disabled="!selectedServerId" @keyup.enter="loadRemoteFiles" />
                </label>

                <div v-if="needsPassword"
                    class="mt-3 rounded-xl border border-(--status-modified-border) bg-(--status-modified-soft) p-3">
                    <p class="text-xs font-medium uppercase tracking-[0.12em] text-(--status-modified-text)">{{
                        t('servers.ftpReconnect') }}</p>
                    <input v-model="temporaryUsername" type="text"
                        class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm outline-none"
                        :placeholder="t('servers.usernamePlaceholder')" />
                    <input v-model="temporaryPassword" type="password"
                        class="mt-2 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2 text-sm outline-none"
                        :placeholder="t('servers.passwordPlaceholder')" />
                    <button type="button"
                        class="mt-2 rounded-lg bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white"
                        :disabled="!temporaryUsername.trim() && !temporaryPassword.trim()" @click="retryWithPassword">
                        {{ t('servers.retry') }}
                    </button>
                    <button type="button"
                        class="mt-2 ml-2 rounded-lg border border-(--app-border) bg-(--app-elevated) px-4 py-2 text-sm font-semibold"
                        @click="cancelReconnect">
                        {{ t('servers.cancel') }}
                    </button>
                </div>

                <!-- Remote sort + filter toolbar -->
                <div class="mt-3 flex items-center gap-1.5">
                    <input v-model="remoteFilter" type="text"
                        class="min-w-0 flex-1 rounded-lg border border-(--app-border) bg-(--app-input) px-2.5 py-1.5 text-xs outline-none ring-(--app-accent) transition placeholder:text-(--app-muted) focus:ring-1"
                        :placeholder="t('servers.filterFiles')" :disabled="!selectedServerId" />
                    <div class="flex items-center rounded-lg border border-(--app-border) bg-(--app-muted-surface) text-xs">
                        <button type="button"
                            class="flex items-center gap-1 px-2 py-1.5 transition hover:text-(--app-text)"
                            :class="remoteSortKey === 'name' ? 'text-(--app-accent)' : 'text-(--app-muted)'"
                            :title="t('servers.sortByName')" @click="toggleRemoteSort('name')">
                            <span>Az</span>
                            <svg v-if="remoteSortKey === 'name'" class="h-2.5 w-2.5" viewBox="0 0 8 8" fill="currentColor">
                                <path :d="remoteSortDir === 'asc' ? 'M4 1L7 6H1Z' : 'M4 7L1 2H7Z'"/>
                            </svg>
                        </button>
                        <span class="h-4 w-px bg-(--app-border)" />
                        <button type="button"
                            class="flex items-center gap-1 px-2 py-1.5 transition hover:text-(--app-text)"
                            :class="remoteSortKey === 'size' ? 'text-(--app-accent)' : 'text-(--app-muted)'"
                            :title="t('servers.sortBySize')" @click="toggleRemoteSort('size')">
                            <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 10V2M5 10V5M8 10V3M11 10V7"/></svg>
                            <svg v-if="remoteSortKey === 'size'" class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
                                <path :d="remoteSortDir === 'asc' ? 'M4 1L7 6H1Z' : 'M4 7L1 2H7Z'"/>
                            </svg>
                        </button>
                        <span class="h-4 w-px bg-(--app-border)" />
                        <button type="button"
                            class="flex items-center gap-1 px-2 py-1.5 transition hover:text-(--app-text)"
                            :class="remoteSortKey === 'date' ? 'text-(--app-accent)' : 'text-(--app-muted)'"
                            :title="t('servers.sortByDate')" @click="toggleRemoteSort('date')">
                            <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="10" height="9" rx="1"/><path d="M1 5h10M4 1v2M8 1v2"/></svg>
                            <svg v-if="remoteSortKey === 'date'" class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
                                <path :d="remoteSortDir === 'asc' ? 'M4 1L7 6H1Z' : 'M4 7L1 2H7Z'"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <p v-if="isRemoteLoading" class="mt-2 text-sm text-(--app-muted)">{{ t('servers.loadingRemote') }}</p>
                <p v-else-if="remoteErrorMessage" class="mt-2 text-sm text-(--status-deleted-text)">{{ remoteErrorMessage }}</p>

                <ul v-if="displayedRemoteEntries.length > 0 || canGoRemoteParent" class="mt-2 max-h-[min(40vh,480px)] space-y-0.5 overflow-y-auto rounded-xl border border-(--app-border) bg-(--app-muted-surface) p-1.5">
                    <li v-if="canGoRemoteParent"
                        class="flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer transition-colors hover:bg-(--app-muted-surface)"
                        @click="goRemoteParent">
                        <span class="shrink-0 text-base leading-none">📁</span>
                        <span class="min-w-0 flex-1 truncate text-sm font-medium text-(--app-muted)">..</span>
                        <span class="shrink-0 text-xs text-(--app-muted) italic">{{ t('servers.back') }}</span>
                    </li>
                    <li v-for="entry in displayedRemoteEntries" :key="entry.path"
                        class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                        :class="[
                            isRemoteEntrySelected(entry.path)
                                ? 'bg-(--app-accent)/10 ring-1 ring-(--app-accent)/30'
                                : 'hover:bg-(--app-muted-surface)',
                            entry.isDirectory ? 'cursor-pointer' : 'cursor-default'
                        ]"
                        @click="handleRemoteEntryClick(entry, $event)" @dblclick="handleRemoteEntryDoubleClick(entry)"
                        @contextmenu.prevent.stop="handleRemoteContextMenu($event, entry)">
                        <span class="shrink-0 text-base leading-none">{{ entry.isDirectory ? '📁' : '📄' }}</span>
                        <span class="min-w-0 flex-1 truncate text-sm" :class="isRemoteEntrySelected(entry.path) ? 'font-medium text-(--app-text)' : 'text-(--app-text)'">{{ entry.name }}</span>
                        <span class="shrink-0 text-xs text-(--app-muted)">{{ formatEntryMeta(entry) }}</span>
                    </li>
                </ul>
                <p v-else-if="remoteFilter && remoteEntries.length > 0" class="mt-2 rounded-lg border border-dashed border-(--app-border) px-3 py-3 text-xs text-(--app-muted)">
                    {{ t('servers.noMatchingFiles') }}
                </p>
                <p v-else class="mt-2 rounded-lg border border-dashed border-(--app-border) bg-(--app-muted-surface) px-3 py-4 text-sm text-(--app-muted)">
                    {{ selectedServerId ? t('servers.ftpNoFiles') : t('servers.selectServerFirst') }}
                </p>

                <div v-if="contextMenu.visible && contextMenu.scope === 'remote'"
                    class="fixed z-50 min-w-52 rounded-lg border border-(--app-border) bg-(--app-surface) p-1 shadow-(--app-shadow)"
                    :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
                    <button v-if="contextMenu.entry?.isDirectory" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => openRemoteEntry(contextMenu.entry!))">
                        {{ t('servers.open') }}
                    </button>
                    <button v-if="contextMenu.entry && !contextMenu.entry.isDirectory" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => openRemoteFileWithPrompt(contextMenu.entry!))">
                        {{ t('servers.view') }}
                    </button>
                    <button v-if="contextMenu.entry && !contextMenu.entry.isDirectory" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => openRemoteFileForEdit(contextMenu.entry!))">
                        {{ t('servers.editFile') }}
                    </button>
                    <button v-if="contextMenu.entry && !contextMenu.entry.isDirectory" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => downloadRemoteEntry(contextMenu.entry!))">
                        {{ t('servers.download') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => copySelectedRemoteEntries('copy'))">
                        {{ t('servers.copy') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => copySelectedRemoteEntries('cut'))">
                        {{ t('servers.cut') }}
                    </button>
                    <button v-if="!contextMenu.entry && (remoteClipboard || localClipboard)" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(pasteCurrentClipboard)">
                        {{ t('servers.pasteHere') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(() => renameRemoteEntry(contextMenu.entry!))">
                        {{ t('servers.rename') }}
                    </button>
                    <button v-if="contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm text-(--status-deleted-text) hover:bg-(--status-deleted-bg)"
                        @click="runMenuAction(() => deleteRemoteEntry(contextMenu.entry!))">
                        {{ t('servers.delete') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(loadRemoteFiles)">
                        {{ t('servers.refresh') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(createRemoteFolder)">
                        {{ t('servers.newFolder') }}
                    </button>
                    <button v-if="!contextMenu.entry" type="button"
                        class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-(--app-muted-surface)"
                        @click="runMenuAction(createRemoteFile)">
                        {{ t('servers.newFile') }}
                    </button>
                </div>
            </article>
        </div>

        <section class="rounded-2xl border border-(--app-border) bg-(--app-elevated) p-4 shadow-(--app-shadow-sm)">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-(--app-text)">{{
                    t('servers.transferQueue') }}</h2>
                <div class="flex flex-wrap items-center gap-2">
                    <span v-if="conflictRule !== 'ask'"
                        class="rounded-full border border-(--status-modified-border) bg-(--status-modified-soft) px-2.5 py-1 text-xs font-semibold text-(--status-modified-text)">
                        {{ t('servers.conflictRuleActive', { rule: formatConflictRule(conflictRule) }) }}
                    </span>
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-1.5 text-xs font-semibold"
                        :disabled="conflictRule === 'ask'" @click="resetConflictRule">
                        {{ t('servers.resetConflictRule') }}
                    </button>
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-3 py-1.5 text-xs font-semibold"
                        :disabled="transferLog.length === 0" @click="clearTransferLog">
                        {{ t('servers.clearTransferLog') }}
                    </button>
                </div>
            </div>

            <ul v-if="transferQueue.length > 0" class="mt-3 space-y-2">
                <li v-for="item in transferQueue" :key="item.id"
                    class="rounded-xl border border-(--app-border) bg-(--app-surface) p-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-semibold text-(--app-text)">{{ item.label }}</p>
                            <p class="mt-1 text-xs text-(--app-muted)">
                                {{ formatTransferDirection(item.direction) }}
                                ·
                                {{ formatTransferStatus(item.status) }}
                                ·
                                {{ formatTransferTime(item.startedAt) }}
                            </p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <button v-if="item.status === 'running'" type="button"
                                class="rounded-lg border border-(--status-deleted-border) bg-(--status-deleted-bg) px-2.5 py-1 text-xs font-semibold text-(--status-deleted-text)"
                                :disabled="item.cancelRequested" @click="requestTransferCancellation(item.id)">
                                {{ item.cancelRequested ? t('servers.cancelRequested') : t('servers.cancelTransfer') }}
                            </button>
                            <button v-else type="button"
                                class="rounded-lg border border-(--app-border) bg-(--app-muted-surface) px-2.5 py-1 text-xs font-semibold"
                                @click="removeTransferQueueItem(item.id)">
                                {{ t('servers.removeTransferItem') }}
                            </button>
                        </div>
                    </div>

                    <div class="mt-2 h-2 overflow-hidden rounded-full bg-(--app-muted-surface)">
                        <div class="h-full rounded-full bg-(--app-accent) transition-all duration-200"
                            :style="{ width: `${item.progress}%` }" />
                    </div>

                    <p v-if="item.error" class="mt-2 text-xs text-(--status-deleted-text)">{{ item.error }}</p>
                </li>
            </ul>
            <p v-else class="mt-3 text-sm text-(--app-muted)">{{ t('servers.noTransferQueue') }}</p>

            <h3 class="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-(--app-text)">{{
                t('servers.transferLog') }}</h3>
            <ul v-if="transferLog.length > 0"
                class="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-(--app-border) bg-(--app-surface) p-2">
                <li v-for="logItem in transferLog" :key="logItem.id" class="rounded-md px-2 py-1.5 text-xs"
                    :class="getTransferLogLevelClass(logItem.level)">
                    <span class="font-semibold">{{ formatTransferTime(logItem.timestamp) }}</span>
                    <span class="mx-1">·</span>
                    <span>{{ logItem.message }}</span>
                </li>
            </ul>
            <p v-else class="mt-3 text-sm text-(--app-muted)">{{ t('servers.noTransferLog') }}</p>
        </section>

        <!-- Conflict Modal -->
        <div v-if="conflictModalVisible"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                class="w-full max-w-lg rounded-lg border border-(--app-border) bg-(--app-surface) p-6 shadow-(--app-shadow)">
                <h2 class="text-lg font-semibold text-(--app-text)">{{ t('servers.conflictModalTitle') }}</h2>
                <p class="mt-2 text-sm text-(--app-muted)">{{ t('servers.conflictModalDescription') }}</p>

                <div
                    class="mt-4 rounded-lg border border-(--app-border) bg-(--app-muted-surface) p-3 text-xs text-(--app-muted)">
                    <p><span class="font-semibold text-(--app-text)">{{ t('servers.conflictSource') }}:</span> {{
                        conflictModalSourceEntry?.name }}</p>
                    <p class="mt-1"><span class="font-semibold text-(--app-text)">{{ t('servers.conflictTarget')
                            }}:</span> {{ conflictModalTargetEntry?.name }}</p>
                    <p class="mt-1"><span class="font-semibold text-(--app-text)">{{ t('servers.conflictDestination')
                            }}:</span> {{ conflictModalDestinationPath }}</p>
                </div>

                <div class="mt-4 grid gap-2 sm:grid-cols-2">
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold text-left"
                        @click="confirmConflictModal('overwrite')">
                        {{ t('servers.conflictOverwrite') }}
                    </button>
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold text-left"
                        @click="confirmConflictModal('skip')">
                        {{ t('servers.conflictSkip') }}
                    </button>
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold text-left"
                        @click="confirmConflictModal('rename-auto')">
                        {{ t('servers.conflictRenameAuto') }}
                    </button>
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold text-left"
                        @click="confirmConflictModal('overwrite-if-newer')">
                        {{ t('servers.conflictOverwriteIfNewer') }}
                    </button>
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-3 py-2 text-sm font-semibold text-left sm:col-span-2"
                        @click="confirmConflictModal('overwrite-if-size-different')">
                        {{ t('servers.conflictOverwriteIfSizeDifferent') }}
                    </button>
                </div>

                <label class="mt-4 flex items-center gap-2 text-sm text-(--app-text)">
                    <input v-model="conflictModalApplyToAll" type="checkbox"
                        class="h-4 w-4 rounded border border-(--app-border) bg-(--app-input)" />
                    <span>{{ t('servers.conflictApplyToAll') }}</span>
                </label>

                <div class="mt-5 flex justify-end">
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-4 py-2 text-sm font-semibold"
                        @click="confirmConflictModal('skip')">
                        {{ t('common.cancel') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Input Modal -->
        <div v-if="inputModalVisible"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                class="w-full max-w-md rounded-lg border border-(--app-border) bg-(--app-surface) p-6 shadow-(--app-shadow)">
                <h2 class="text-lg font-semibold text-(--app-text)">{{ inputModalTitle }}</h2>
                <input v-model="confirmText" type="text"
                    class="mt-4 w-full rounded-lg border border-(--app-border) bg-(--app-input) px-3 py-2.5 text-sm outline-none ring-(--app-accent) transition focus:ring-1"
                    :placeholder="inputModalPlaceholder" @keyup.enter="confirmInputModal"
                    @keyup.escape="closeInputModal" />
                <div class="mt-6 flex justify-end gap-2">
                    <button type="button"
                        class="rounded-lg border border-(--app-border) bg-(--app-elevated) px-4 py-2 text-sm font-semibold hover:bg-(--app-muted-surface)"
                        @click="closeInputModal">
                        {{ t('common.cancel') }}
                    </button>
                    <button type="button"
                        class="rounded-lg bg-(--app-accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--app-accent)/90"
                        @click="confirmInputModal">
                        {{ t('common.confirm') }}
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { listServers, localFilesService, remoteFilesService, type GetAllServersResponseDto } from '../services/api';

type ExplorerEntry = {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number | null;
    modifiedAt?: string | null;
};

type ContextMenuScope = 'local' | 'remote';

type ContextMenuState = {
    visible: boolean;
    x: number;
    y: number;
    scope: ContextMenuScope;
    entry: ExplorerEntry | null;
};

type RemoteEditSession = {
    serverId: number;
    remotePath: string;
    localPath: string;
    lastUploadedBase64: string;
    uploadInFlight: boolean;
    pollTimerId: number;
    credentialOverride?: { username?: string; password?: string };
};

type TransferDirection = 'local-to-local' | 'local-to-remote' | 'remote-to-local' | 'remote-to-remote';

type TransferStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

type TransferQueueItem = {
    id: string;
    label: string;
    direction: TransferDirection;
    status: TransferStatus;
    progress: number;
    startedAt: string;
    finishedAt?: string;
    error?: string;
    cancelRequested: boolean;
};

type TransferLogLevel = 'info' | 'success' | 'warn' | 'error';

type TransferLogEntry = {
    id: string;
    operationId?: string;
    timestamp: string;
    message: string;
    level: TransferLogLevel;
};

type ConflictRule = 'ask' | 'overwrite' | 'skip' | 'rename-auto' | 'overwrite-if-newer' | 'overwrite-if-size-different';

type ConflictAction = 'overwrite' | 'skip' | 'rename-auto' | 'ask';

type ConflictContext = 'local' | 'remote';

type ConflictSelection = {
    rule: ConflictRule;
    applyToAll: boolean;
};

const { t } = useI18n({ useScope: 'global' });

const servers = ref<GetAllServersResponseDto>([]);
const selectedServerId = ref<number | null>(null);
const localPath = ref('');
const remotePath = ref('/');
const localEntries = ref<ExplorerEntry[]>([]);
const remoteEntries = ref<ExplorerEntry[]>([]);
const selectedLocalPath = ref<string | null>(null);
const selectedLocalPaths = ref<string[]>([]);
const localSelectionAnchorPath = ref<string | null>(null);
const localClipboard = ref<{ mode: 'copy' | 'cut'; entries: ExplorerEntry[] } | null>(null);
const selectedRemotePath = ref<string | null>(null);
const selectedRemotePaths = ref<string[]>([]);
const remoteSelectionAnchorPath = ref<string | null>(null);
const remoteClipboard = ref<{ mode: 'copy' | 'cut'; entries: ExplorerEntry[]; serverId: number } | null>(null);
const isLocalLoading = ref(false);
const isRemoteLoading = ref(false);
const isRemoteDropActive = ref(false);
const localErrorMessage = ref('');
const remoteErrorMessage = ref('');
const needsPassword = ref(false);
const temporaryUsername = ref('');
const temporaryPassword = ref('');
const contextMenu = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    scope: 'local',
    entry: null,
});

const confirmText = ref('');
const inputModalVisible = ref(false);
const inputModalTitle = ref('');
const inputModalPlaceholder = ref('');
const inputModalDefaultValue = ref('');
const inputModalCallback = ref<((value: string) => void | Promise<void>) | null>(null);
const remoteEditSessions = new Map<string, RemoteEditSession>();
const activeRemoteEditSessionCount = ref(0);
const activeExplorerPane = ref<ContextMenuScope>('local');
const transferQueue = ref<TransferQueueItem[]>([]);
const transferLog = ref<TransferLogEntry[]>([]);
const conflictRule = ref<ConflictRule>('ask');
const conflictModalVisible = ref(false);

// Sort + filter state
type SortKey = 'name' | 'size' | 'date';
type SortDir = 'asc' | 'desc';
const localSortKey = ref<SortKey>('name');
const localSortDir = ref<SortDir>('asc');
const remoteSortKey = ref<SortKey>('name');
const remoteSortDir = ref<SortDir>('asc');
const localFilter = ref('');
const remoteFilter = ref('');
const conflictModalApplyToAll = ref(false);
const conflictModalSourceEntry = ref<ExplorerEntry | null>(null);
const conflictModalTargetEntry = ref<ExplorerEntry | null>(null);
const conflictModalDestinationPath = ref('');
const conflictModalResolver = ref<((selection: ConflictSelection) => void) | null>(null);

const TRANSFER_CANCELLED_CODE = '__TRANSFER_CANCELLED__';
const MAX_TRANSFER_QUEUE_ITEMS = 40;
const MAX_TRANSFER_LOG_ITEMS = 200;

const selectedLocalEntries = computed(() => {
    const selectedPaths = new Set(selectedLocalPaths.value.length > 0 ? selectedLocalPaths.value : selectedLocalPath.value ? [selectedLocalPath.value] : []);

    return localEntries.value.filter((entry) => selectedPaths.has(entry.path));
});
const selectedLocalEntry = computed(() => selectedLocalEntries.value[0] ?? null);
const selectedLocalFile = computed(() => selectedLocalEntries.value.length === 1 && !selectedLocalEntries.value[0].isDirectory ? selectedLocalEntries.value[0] : null);
const selectedRemoteEntries = computed(() => {
    const selectedPaths = new Set(selectedRemotePaths.value.length > 0 ? selectedRemotePaths.value : selectedRemotePath.value ? [selectedRemotePath.value] : []);

    return remoteEntries.value.filter((entry) => selectedPaths.has(entry.path));
});
const selectedRemoteEntry = computed(() => selectedRemoteEntries.value[0] ?? null);
const selectedRemoteFile = computed(() => selectedRemoteEntries.value.length === 1 && !selectedRemoteEntries.value[0].isDirectory ? selectedRemoteEntries.value[0] : null);
const selectedLocalFileLabel = computed(() => {
    if (selectedLocalEntries.value.length === 0) {
        return t('servers.noLocalFileSelected');
    }

    if (selectedLocalEntries.value.length > 1) {
        return t('servers.selectedCount', { count: selectedLocalEntries.value.length });
    }

    return selectedLocalEntries.value[0].path;
});
const selectedRemoteFileLabel = computed(() => {
    if (selectedRemoteEntries.value.length === 0) {
        return t('servers.noRemoteFileSelected');
    }

    if (selectedRemoteEntries.value.length > 1) {
        return t('servers.selectedCount', { count: selectedRemoteEntries.value.length });
    }

    return selectedRemoteEntries.value[0].path;
});
const canUploadSelectedLocalFile = computed(() => Boolean(selectedLocalFile.value));
const canUploadSelectedRemoteFile = computed(() => Boolean(selectedRemoteFile.value));
const canGoLocalParent = computed(() => Boolean(localPath.value && getLocalParentPath(localPath.value) !== localPath.value));
const canGoRemoteParent = computed(() => remotePath.value !== '/');

function sortAndFilter(entries: ExplorerEntry[], filter: string, sortKey: SortKey, sortDir: SortDir): ExplorerEntry[] {
    const query = filter.trim().toLowerCase();
    const filtered = query ? entries.filter(e => e.name.toLowerCase().includes(query)) : entries;
    const dirs = filtered.filter(e => e.isDirectory);
    const files = filtered.filter(e => !e.isDirectory);

    function compare(a: ExplorerEntry, b: ExplorerEntry): number {
        let cmp = 0;
        if (sortKey === 'name') {
            cmp = a.name.localeCompare(b.name);
        } else if (sortKey === 'size') {
            cmp = (a.size ?? 0) - (b.size ?? 0);
        } else if (sortKey === 'date') {
            const at = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
            const bt = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
            cmp = at - bt;
        }
        return sortDir === 'asc' ? cmp : -cmp;
    }

    return [...dirs.sort(compare), ...files.sort(compare)];
}

const displayedLocalEntries = computed(() =>
    sortAndFilter(localEntries.value, localFilter.value, localSortKey.value, localSortDir.value));
const displayedRemoteEntries = computed(() =>
    sortAndFilter(remoteEntries.value, remoteFilter.value, remoteSortKey.value, remoteSortDir.value));

function toggleLocalSort(key: SortKey) {
    if (localSortKey.value === key) {
        localSortDir.value = localSortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        localSortKey.value = key;
        localSortDir.value = 'asc';
    }
}

function toggleRemoteSort(key: SortKey) {
    if (remoteSortKey.value === key) {
        remoteSortDir.value = remoteSortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        remoteSortKey.value = key;
        remoteSortDir.value = 'asc';
    }
}

function createTransferId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampProgress(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function trimTransferQueue(): void {
    if (transferQueue.value.length <= MAX_TRANSFER_QUEUE_ITEMS) {
        return;
    }

    transferQueue.value = transferQueue.value.slice(0, MAX_TRANSFER_QUEUE_ITEMS);
}

function trimTransferLog(): void {
    if (transferLog.value.length <= MAX_TRANSFER_LOG_ITEMS) {
        return;
    }

    transferLog.value = transferLog.value.slice(0, MAX_TRANSFER_LOG_ITEMS);
}

function pushTransferLog(message: string, level: TransferLogLevel = 'info', operationId?: string): void {
    transferLog.value.unshift({
        id: createTransferId(),
        operationId,
        timestamp: new Date().toISOString(),
        message,
        level,
    });
    trimTransferLog();
}

function createTransferQueueItem(label: string, direction: TransferDirection): string {
    const id = createTransferId();
    transferQueue.value.unshift({
        id,
        label,
        direction,
        status: 'queued',
        progress: 0,
        startedAt: new Date().toISOString(),
        cancelRequested: false,
    });
    trimTransferQueue();
    return id;
}

function findTransferQueueItem(operationId: string): TransferQueueItem | undefined {
    return transferQueue.value.find((item) => item.id === operationId);
}

function updateTransferQueueItem(operationId: string, patch: Partial<TransferQueueItem>): void {
    const item = findTransferQueueItem(operationId);

    if (!item) {
        return;
    }

    if (typeof patch.progress === 'number') {
        item.progress = clampProgress(patch.progress);
    }

    if (patch.status) {
        item.status = patch.status;
    }

    if (patch.finishedAt !== undefined) {
        item.finishedAt = patch.finishedAt;
    }

    if (patch.error !== undefined) {
        item.error = patch.error;
    }

    if (patch.cancelRequested !== undefined) {
        item.cancelRequested = patch.cancelRequested;
    }
}

function requestTransferCancellation(operationId: string): void {
    const item = findTransferQueueItem(operationId);

    if (!item || item.status !== 'running') {
        return;
    }

    item.cancelRequested = true;
    pushTransferLog(`${item.label}: ${t('servers.cancelRequested')}`, 'warn', operationId);
}

function removeTransferQueueItem(operationId: string): void {
    transferQueue.value = transferQueue.value.filter((item) => item.id !== operationId);
}

function clearTransferLog(): void {
    transferLog.value = [];
}

function throwIfTransferCancelled(operationId: string): void {
    const item = findTransferQueueItem(operationId);

    if (item?.cancelRequested) {
        throw new Error(TRANSFER_CANCELLED_CODE);
    }
}

function isTransferCancelledError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes(TRANSFER_CANCELLED_CODE);
}

function formatTransferDirection(direction: TransferDirection): string {
    if (direction === 'local-to-local') {
        return t('servers.transferDirectionLocalToLocal');
    }

    if (direction === 'local-to-remote') {
        return t('servers.transferDirectionLocalToRemote');
    }

    if (direction === 'remote-to-local') {
        return t('servers.transferDirectionRemoteToLocal');
    }

    return t('servers.transferDirectionRemoteToRemote');
}

function formatTransferStatus(status: TransferStatus): string {
    if (status === 'queued') {
        return t('servers.transferStatusQueued');
    }

    if (status === 'running') {
        return t('servers.transferStatusRunning');
    }

    if (status === 'completed') {
        return t('servers.transferStatusCompleted');
    }

    if (status === 'cancelled') {
        return t('servers.transferStatusCancelled');
    }

    return t('servers.transferStatusFailed');
}

function formatTransferTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
}

function formatConflictRule(rule: ConflictRule): string {
    if (rule === 'overwrite') {
        return t('servers.conflictOverwrite');
    }

    if (rule === 'skip') {
        return t('servers.conflictSkip');
    }

    if (rule === 'rename-auto') {
        return t('servers.conflictRenameAuto');
    }

    if (rule === 'overwrite-if-newer') {
        return t('servers.conflictOverwriteIfNewer');
    }

    if (rule === 'overwrite-if-size-different') {
        return t('servers.conflictOverwriteIfSizeDifferent');
    }

    return t('servers.conflictAskEachTime');
}

function getTransferLogLevelClass(level: TransferLogLevel): string {
    if (level === 'success') {
        return 'text-(--status-added-text)';
    }

    if (level === 'warn') {
        return 'text-(--status-modified-text)';
    }

    if (level === 'error') {
        return 'text-(--status-deleted-text)';
    }

    return 'text-(--app-muted)';
}

type TransferRunnerContext = {
    operationId: string;
    setProgress: (value: number) => void;
    throwIfCancelled: () => void;
};

async function runTransferOperation<T>(
    label: string,
    direction: TransferDirection,
    runner: (context: TransferRunnerContext) => Promise<T>,
): Promise<T> {
    const operationId = createTransferQueueItem(label, direction);

    updateTransferQueueItem(operationId, { status: 'running', progress: 1 });
    pushTransferLog(`${label}: ${t('servers.transferStarted')}`, 'info', operationId);

    try {
        const result = await runner({
            operationId,
            setProgress: (value: number) => {
                updateTransferQueueItem(operationId, { progress: value });
            },
            throwIfCancelled: () => {
                throwIfTransferCancelled(operationId);
            },
        });

        updateTransferQueueItem(operationId, {
            status: 'completed',
            progress: 100,
            finishedAt: new Date().toISOString(),
        });
        pushTransferLog(`${label}: ${t('servers.transferCompleted')}`, 'success', operationId);
        return result;
    } catch (error) {
        if (isTransferCancelledError(error)) {
            updateTransferQueueItem(operationId, {
                status: 'cancelled',
                finishedAt: new Date().toISOString(),
            });
            pushTransferLog(`${label}: ${t('servers.transferCancelled')}`, 'warn', operationId);
            throw error;
        }

        const normalizedError = filterGenericError(error);
        updateTransferQueueItem(operationId, {
            status: 'failed',
            finishedAt: new Date().toISOString(),
            error: normalizedError,
        });
        pushTransferLog(`${label}: ${normalizedError}`, 'error', operationId);
        throw error;
    }
}

function clearClipboardState(): void {
    localClipboard.value = null;
    remoteClipboard.value = null;
}

function resetConflictRule(): void {
    conflictRule.value = 'ask';
}

function getBaseName(path: string): string {
    const normalized = path.replace(/[\\/]+$/, '');
    const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    return index === -1 ? normalized : normalized.slice(index + 1);
}

function splitNameAndExtension(name: string): { stem: string; extension: string } {
    const index = name.lastIndexOf('.');

    if (index <= 0 || index === name.length - 1) {
        return { stem: name, extension: '' };
    }

    return {
        stem: name.slice(0, index),
        extension: name.slice(index),
    };
}

async function findLocalEntryByPath(path: string): Promise<ExplorerEntry | null> {
    const parentPath = getLocalParentPath(path);
    const name = getBaseName(path);

    try {
        const entries = await localFilesService.listFiles(parentPath);
        return entries.find((entry) => entry.name.toLowerCase() === name.toLowerCase()) ?? null;
    } catch {
        return null;
    }
}

async function findRemoteEntryByPath(serverId: number, path: string): Promise<ExplorerEntry | null> {
    const parentPath = getRemoteParentPath(path);
    const name = getBaseName(path);

    try {
        const entries = await remoteFilesService.listRemoteFiles(serverId, parentPath, getCredentialOverride());
        return entries.find((entry) => entry.name === name) ?? null;
    } catch {
        return null;
    }
}

function parseModifiedAt(value?: string | null): number | null {
    if (!value) {
        return null;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function evaluateConflictRule(rule: ConflictRule, source: ExplorerEntry, target: ExplorerEntry): ConflictAction {
    if (rule === 'overwrite' || rule === 'skip' || rule === 'rename-auto') {
        return rule;
    }

    if (rule === 'overwrite-if-newer') {
        if (source.isDirectory || target.isDirectory) {
            return 'ask';
        }

        const sourceTime = parseModifiedAt(source.modifiedAt);
        const targetTime = parseModifiedAt(target.modifiedAt);

        if (sourceTime === null || targetTime === null) {
            return 'ask';
        }

        return sourceTime > targetTime ? 'overwrite' : 'skip';
    }

    if (rule === 'overwrite-if-size-different') {
        if (source.isDirectory || target.isDirectory) {
            return 'ask';
        }

        if (typeof source.size !== 'number' || typeof target.size !== 'number') {
            return 'ask';
        }

        return source.size !== target.size ? 'overwrite' : 'skip';
    }

    return 'ask';
}

function openConflictModal(source: ExplorerEntry, target: ExplorerEntry, destinationPath: string): Promise<ConflictSelection> {
    conflictModalSourceEntry.value = source;
    conflictModalTargetEntry.value = target;
    conflictModalDestinationPath.value = destinationPath;
    conflictModalApplyToAll.value = false;
    conflictModalVisible.value = true;

    return new Promise<ConflictSelection>((resolve) => {
        conflictModalResolver.value = resolve;
    });
}

function closeConflictModal(): void {
    conflictModalVisible.value = false;
    conflictModalApplyToAll.value = false;
    conflictModalSourceEntry.value = null;
    conflictModalTargetEntry.value = null;
    conflictModalDestinationPath.value = '';
    conflictModalResolver.value = null;
}

function confirmConflictModal(selectedRule: ConflictRule): void {
    const resolver = conflictModalResolver.value;

    if (!resolver) {
        closeConflictModal();
        return;
    }

    const selection: ConflictSelection = {
        rule: selectedRule,
        applyToAll: conflictModalApplyToAll.value,
    };

    closeConflictModal();
    resolver(selection);
}

async function buildUniqueLocalPath(destinationPath: string): Promise<string> {
    const parentPath = getLocalParentPath(destinationPath);
    const { stem, extension } = splitNameAndExtension(getBaseName(destinationPath));

    for (let index = 1; index < 1000; index += 1) {
        const candidateName = `${stem} (${index})${extension}`;
        const candidatePath = joinLocalPath(parentPath, candidateName);
        const existing = await findLocalEntryByPath(candidatePath);

        if (!existing) {
            return candidatePath;
        }
    }

    return joinLocalPath(parentPath, `${stem}-${Date.now()}${extension}`);
}

async function buildUniqueRemotePath(serverId: number, destinationPath: string): Promise<string> {
    const parentPath = getRemoteParentPath(destinationPath);
    const { stem, extension } = splitNameAndExtension(getBaseName(destinationPath));

    for (let index = 1; index < 1000; index += 1) {
        const candidateName = `${stem} (${index})${extension}`;
        const candidatePath = joinRemotePath(parentPath, candidateName);
        const existing = await findRemoteEntryByPath(serverId, candidatePath);

        if (!existing) {
            return candidatePath;
        }
    }

    return joinRemotePath(parentPath, `${stem}-${Date.now()}${extension}`);
}

async function resolveConflictAction(
    source: ExplorerEntry,
    target: ExplorerEntry,
    destinationPath: string,
): Promise<ConflictAction> {
    while (true) {
        const evaluated = evaluateConflictRule(conflictRule.value, source, target);

        if (evaluated !== 'ask') {
            return evaluated;
        }

        const selection = await openConflictModal(source, target, destinationPath);

        if (selection.applyToAll) {
            conflictRule.value = selection.rule;
        }

        const direct = evaluateConflictRule(selection.rule, source, target);

        if (direct !== 'ask') {
            return direct;
        }

        conflictRule.value = 'ask';
    }
}

async function resolveLocalDestinationPath(source: ExplorerEntry, destinationPath: string): Promise<string | null> {
    const target = await findLocalEntryByPath(destinationPath);

    if (!target) {
        return destinationPath;
    }

    const action = await resolveConflictAction(source, target, destinationPath);

    if (action === 'skip') {
        return null;
    }

    if (action === 'rename-auto') {
        return buildUniqueLocalPath(destinationPath);
    }

    if (target.isDirectory !== source.isDirectory) {
        await localFilesService.deletePath(target.path);
    }

    return destinationPath;
}

async function resolveRemoteDestinationPath(serverId: number, source: ExplorerEntry, destinationPath: string): Promise<string | null> {
    const target = await findRemoteEntryByPath(serverId, destinationPath);

    if (!target) {
        return destinationPath;
    }

    const action = await resolveConflictAction(source, target, destinationPath);

    if (action === 'skip') {
        return null;
    }

    if (action === 'rename-auto') {
        return buildUniqueRemotePath(serverId, destinationPath);
    }

    if (target.isDirectory !== source.isDirectory) {
        await remoteFilesService.deleteRemoteFile(serverId, target.path, getCredentialOverride());
    }

    return destinationPath;
}

function getRemoteEditSessionKey(serverId: number, remotePath: string): string {
    return `${serverId}:${remotePath}`;
}

function setActiveExplorerPane(scope: ContextMenuScope): void {
    activeExplorerPane.value = scope;
}

function getCredentialOverride(): { username?: string; password?: string } | undefined {
    if (!needsPassword.value) {
        return undefined;
    }

    return {
        username: temporaryUsername.value.trim() || undefined,
        password: temporaryPassword.value.trim() || undefined,
    };
}

async function getCurrentLocalDownloadDirectory(): Promise<string> {
    return localPath.value.trim() || await localFilesService.getDefaultRoot();
}

async function downloadRemoteFileIntoLocalPath(
    serverId: number,
    sourceEntry: ExplorerEntry,
    destinationPath: string,
    operationId?: string,
): Promise<string | null> {
    if (operationId) {
        throwIfTransferCancelled(operationId);
    }

    const resolvedDestinationPath = await resolveLocalDestinationPath(sourceEntry, destinationPath);

    if (!resolvedDestinationPath) {
        return null;
    }

    const tempLocalPath = await remoteFilesService.downloadRemoteFile(serverId, sourceEntry.path, getCredentialOverride());

    if (operationId) {
        throwIfTransferCancelled(operationId);
    }

    const contentBase64 = await localFilesService.readFile(tempLocalPath);
    await localFilesService.writeFile(resolvedDestinationPath, contentBase64);
    return resolvedDestinationPath;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}

function isLocalEntrySelected(path: string): boolean {
    return selectedLocalPaths.value.includes(path) || selectedLocalPath.value === path;
}

function isRemoteEntrySelected(path: string): boolean {
    return selectedRemotePaths.value.includes(path) || selectedRemotePath.value === path;
}

function setLocalSelection(paths: string[], anchorPath: string | null = null): void {
    const uniquePaths = [...new Set(paths)];
    selectedLocalPaths.value = uniquePaths;
    selectedLocalPath.value = uniquePaths[0] ?? null;
    localSelectionAnchorPath.value = anchorPath ?? uniquePaths[0] ?? null;
}

function clearLocalSelection(): void {
    selectedLocalPaths.value = [];
    selectedLocalPath.value = null;
    localSelectionAnchorPath.value = null;
}

function toggleLocalSelection(entry: ExplorerEntry): void {
    const nextPaths = new Set(selectedLocalPaths.value.length > 0 ? selectedLocalPaths.value : selectedLocalPath.value ? [selectedLocalPath.value] : []);

    if (nextPaths.has(entry.path)) {
        nextPaths.delete(entry.path);
    } else {
        nextPaths.add(entry.path);
    }

    setLocalSelection([...nextPaths], entry.path);
}

function selectLocalRange(entry: ExplorerEntry): void {
    const anchorPath = localSelectionAnchorPath.value ?? selectedLocalPath.value;

    if (!anchorPath) {
        setLocalSelection([entry.path], entry.path);
        return;
    }

    const anchorIndex = localEntries.value.findIndex((item) => item.path === anchorPath);
    const currentIndex = localEntries.value.findIndex((item) => item.path === entry.path);

    if (anchorIndex === -1 || currentIndex === -1) {
        setLocalSelection([entry.path], entry.path);
        return;
    }

    const [startIndex, endIndex] = anchorIndex < currentIndex ? [anchorIndex, currentIndex] : [currentIndex, anchorIndex];
    const rangeEntries = localEntries.value.slice(startIndex, endIndex + 1).map((item) => item.path);
    setLocalSelection(rangeEntries, anchorPath);
}

function setSingleLocalSelection(entry: ExplorerEntry): void {
    setLocalSelection([entry.path], entry.path);
}

function setSingleRemoteSelection(entry: ExplorerEntry): void {
    selectedRemotePaths.value = [entry.path];
    selectedRemotePath.value = entry.path;
    remoteSelectionAnchorPath.value = entry.path;
}

function handleLocalContextMenu(event: MouseEvent, entry: ExplorerEntry): void {
    if (!isLocalEntrySelected(entry.path)) {
        setSingleLocalSelection(entry);
    }

    setActiveExplorerPane('local');
    openContextMenu(event, 'local', entry);
}

function handleRemoteContextMenu(event: MouseEvent, entry: ExplorerEntry): void {
    if (!isRemoteEntrySelected(entry.path)) {
        setSingleRemoteSelection(entry);
    }

    setActiveExplorerPane('remote');
    openContextMenu(event, 'remote', entry);
}

function copySelectedLocalEntries(mode: 'copy' | 'cut'): void {
    const entries = selectedLocalEntries.value;

    if (entries.length === 0) {
        return;
    }

    localClipboard.value = {
        mode,
        entries: entries.map((entry) => ({ ...entry })),
    };
}

function copySelectedRemoteEntries(mode: 'copy' | 'cut'): void {
    const entries = selectedRemoteEntries.value;

    if (entries.length === 0 || !selectedServerId.value) {
        return;
    }

    remoteClipboard.value = {
        mode,
        serverId: selectedServerId.value,
        entries: entries.map((entry) => ({ ...entry })),
    };
}

async function copyLocalEntryRecursive(sourceEntry: ExplorerEntry, destinationPath: string, operationId?: string): Promise<void> {
    if (operationId) {
        throwIfTransferCancelled(operationId);
    }

    const resolvedDestinationPath = await resolveLocalDestinationPath(sourceEntry, destinationPath);

    if (!resolvedDestinationPath) {
        return;
    }

    if (sourceEntry.isDirectory) {
        const existingDestination = await findLocalEntryByPath(resolvedDestinationPath);

        if (!existingDestination) {
            await localFilesService.createDirectory(resolvedDestinationPath);
        }

        const childEntries = await localFilesService.listFiles(sourceEntry.path);

        for (const childEntry of childEntries) {
            await copyLocalEntryRecursive(childEntry, joinLocalPath(resolvedDestinationPath, childEntry.name), operationId);
        }

        return;
    }

    const contentBase64 = await localFilesService.readFile(sourceEntry.path);
    await localFilesService.writeFile(resolvedDestinationPath, contentBase64);
}

async function pasteLocalClipboard(): Promise<void> {
    if (!localClipboard.value) {
        return;
    }

    const destinationDirectory = localPath.value.trim();

    if (!destinationDirectory) {
        return;
    }

    const nextSelectedPaths: string[] = [];

    const operationLabel = `${t('servers.pasteHere')}: ${destinationDirectory}`;

    try {
        await runTransferOperation(operationLabel, 'local-to-local', async ({ operationId, setProgress, throwIfCancelled }) => {
            const totalEntries = localClipboard.value?.entries.length ?? 0;
            let completedEntries = 0;

            if (localClipboard.value?.mode === 'cut') {
                for (const entry of localClipboard.value.entries) {
                    throwIfCancelled();

                    const targetPath = joinLocalPath(destinationDirectory, entry.name);
                    const resolvedPath = await resolveLocalDestinationPath(entry, targetPath);

                    if (!resolvedPath) {
                        completedEntries += 1;
                        setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                        continue;
                    }

                    if (entry.path === resolvedPath) {
                        nextSelectedPaths.push(resolvedPath);
                        completedEntries += 1;
                        setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                        continue;
                    }

                    const existingTarget = await findLocalEntryByPath(resolvedPath);

                    if (existingTarget && existingTarget.path.toLowerCase() !== entry.path.toLowerCase()) {
                        await localFilesService.deletePath(existingTarget.path);
                    }

                    await localFilesService.renamePath(entry.path, resolvedPath);
                    nextSelectedPaths.push(resolvedPath);
                    completedEntries += 1;
                    setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                }

                localClipboard.value = null;
                return;
            }

            for (const entry of localClipboard.value?.entries ?? []) {
                throwIfCancelled();
                const targetPath = joinLocalPath(destinationDirectory, entry.name);
                await copyLocalEntryRecursive(entry, targetPath, operationId);
                nextSelectedPaths.push(targetPath);
                completedEntries += 1;
                setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
            }
        });

        await loadLocalFiles();
        setLocalSelection(nextSelectedPaths, nextSelectedPaths[0] ?? null);
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        localErrorMessage.value = filterGenericError(error);
    }
}

async function pasteRemoteEntryToLocalRecursive(
    serverId: number,
    sourceEntry: ExplorerEntry,
    localDestinationPath: string,
    operationId?: string,
    skipRootResolution = false,
): Promise<void> {
    if (operationId) {
        throwIfTransferCancelled(operationId);
    }

    const resolvedDestinationPath = skipRootResolution
        ? localDestinationPath
        : await resolveLocalDestinationPath(sourceEntry, localDestinationPath);

    if (!resolvedDestinationPath) {
        return;
    }

    if (sourceEntry.isDirectory) {
        const existingDestination = await findLocalEntryByPath(resolvedDestinationPath);

        if (!existingDestination) {
            await localFilesService.createDirectory(resolvedDestinationPath);
        }

        const childEntries = await remoteFilesService.listRemoteFiles(serverId, sourceEntry.path, getCredentialOverride());

        for (const childEntry of childEntries) {
            await pasteRemoteEntryToLocalRecursive(serverId, childEntry, joinLocalPath(resolvedDestinationPath, childEntry.name), operationId);
        }

        return;
    }

    const tempLocalPath = await remoteFilesService.downloadRemoteFile(serverId, sourceEntry.path, getCredentialOverride());
    const contentBase64 = await localFilesService.readFile(tempLocalPath);
    await localFilesService.writeFile(resolvedDestinationPath, contentBase64);
}

async function pasteRemoteClipboardToLocal(): Promise<void> {
    if (!remoteClipboard.value) {
        return;
    }

    if (!selectedServerId.value || selectedServerId.value !== remoteClipboard.value.serverId) {
        remoteErrorMessage.value = t('servers.selectSourceServerToPaste');
        return;
    }

    const destinationDirectory = localPath.value.trim();

    if (!destinationDirectory) {
        return;
    }

    const nextSelectedPaths: string[] = [];

    const operationLabel = `${t('servers.download')}: ${destinationDirectory}`;

    try {
        await runTransferOperation(operationLabel, 'remote-to-local', async ({ operationId, setProgress, throwIfCancelled }) => {
            const totalEntries = remoteClipboard.value?.entries.length ?? 0;
            let completedEntries = 0;

            for (const entry of remoteClipboard.value?.entries ?? []) {
                throwIfCancelled();
                const targetPath = joinLocalPath(destinationDirectory, entry.name);
                const resolvedPath = await resolveLocalDestinationPath(entry, targetPath);

                if (!resolvedPath) {
                    completedEntries += 1;
                    setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                    continue;
                }

                await pasteRemoteEntryToLocalRecursive(remoteClipboard.value!.serverId, entry, resolvedPath, operationId, true);
                nextSelectedPaths.push(resolvedPath);

                if (remoteClipboard.value?.mode === 'cut') {
                    throwIfCancelled();
                    await remoteFilesService.deleteRemoteFile(remoteClipboard.value.serverId, entry.path, getCredentialOverride());
                }

                completedEntries += 1;
                setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
            }
        });

        if (remoteClipboard.value?.mode === 'cut') {
            remoteClipboard.value = null;
            selectedRemotePaths.value = [];
            selectedRemotePath.value = null;
            remoteSelectionAnchorPath.value = null;
            await loadRemoteFiles();
        }

        await loadLocalFiles();
        setLocalSelection(nextSelectedPaths, nextSelectedPaths[0] ?? null);
        setActiveExplorerPane('local');
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        localErrorMessage.value = filterGenericError(error);
    }
}

async function deleteSelectedLocalEntries(): Promise<void> {
    const entries = selectedLocalEntries.value;

    if (entries.length === 0) {
        return;
    }

    const accepted = window.confirm(t('servers.deleteConfirm'));

    if (!accepted) {
        return;
    }

    try {
        for (const entry of entries) {
            await localFilesService.deletePath(entry.path);
        }

        clearLocalSelection();
        await loadLocalFiles();
    } catch (error) {
        localErrorMessage.value = filterGenericError(error);
    }
}

function handleGlobalKeydown(event: KeyboardEvent): void {
    if (inputModalVisible.value || conflictModalVisible.value || isTextEditingTarget(event.target)) {
        return;
    }

    // F5 or Ctrl+R → refresh active pane
    const isRefresh = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
    if (isRefresh) {
        event.preventDefault();
        if (activeExplorerPane.value === 'local') {
            void loadLocalFiles();
        } else {
            void loadRemoteFiles();
        }
        return;
    }

    const key = event.key.toLowerCase();
    const isClipboardShortcut = event.ctrlKey || event.metaKey;

    if (activeExplorerPane.value === 'local') {
        if (isClipboardShortcut && key === 'c') {
            if (selectedLocalEntries.value.length > 0) {
                event.preventDefault();
                copySelectedLocalEntries('copy');
            }
            return;
        }

        if (isClipboardShortcut && key === 'x') {
            if (selectedLocalEntries.value.length > 0) {
                event.preventDefault();
                copySelectedLocalEntries('cut');
            }
            return;
        }

        if (isClipboardShortcut && key === 'v') {
            if (localClipboard.value || remoteClipboard.value) {
                event.preventDefault();
                void pasteCurrentClipboard();
            }
            return;
        }

        if (key === 'delete') {
            if (selectedLocalEntries.value.length > 0) {
                event.preventDefault();
                void deleteSelectedLocalEntries();
            }
        }
        return;
    }

    if (activeExplorerPane.value === 'remote') {
        if (isClipboardShortcut && key === 'c') {
            if (selectedRemoteEntries.value.length > 0) {
                event.preventDefault();
                copySelectedRemoteEntries('copy');
            }
            return;
        }

        if (isClipboardShortcut && key === 'x') {
            if (selectedRemoteEntries.value.length > 0) {
                event.preventDefault();
                copySelectedRemoteEntries('cut');
            }
            return;
        }

        if (isClipboardShortcut && key === 'v') {
            if (remoteClipboard.value || localClipboard.value) {
                event.preventDefault();
                void pasteCurrentClipboard();
            }
            return;
        }

        if (key === 'delete') {
            if (selectedRemoteEntries.value.length > 0) {
                event.preventDefault();
                void deleteSelectedRemoteEntries();
            }
        }
    }
}

async function pasteLocalEntryToRemoteRecursive(
    sourceEntry: ExplorerEntry,
    remoteDestinationPath: string,
    operationId?: string,
    skipRootResolution = false,
): Promise<void> {
    if (!selectedServerId.value) {
        return;
    }

    if (operationId) {
        throwIfTransferCancelled(operationId);
    }

    const resolvedDestinationPath = skipRootResolution
        ? remoteDestinationPath
        : await resolveRemoteDestinationPath(selectedServerId.value, sourceEntry, remoteDestinationPath);

    if (!resolvedDestinationPath) {
        return;
    }

    if (sourceEntry.isDirectory) {
        const existingDestination = await findRemoteEntryByPath(selectedServerId.value, resolvedDestinationPath);

        if (!existingDestination) {
            await remoteFilesService.createRemoteDirectory(selectedServerId.value, resolvedDestinationPath, getCredentialOverride());
        }

        const childEntries = await localFilesService.listFiles(sourceEntry.path);

        for (const childEntry of childEntries) {
            await pasteLocalEntryToRemoteRecursive(childEntry, joinRemotePath(resolvedDestinationPath, childEntry.name), operationId);
        }

        return;
    }

    const contentBase64 = await localFilesService.readFile(sourceEntry.path);
    await remoteFilesService.uploadRemoteFile(selectedServerId.value, resolvedDestinationPath, contentBase64, getCredentialOverride());
}

async function pasteLocalClipboardToRemote(): Promise<void> {
    if (!localClipboard.value || !selectedServerId.value) {
        return;
    }

    const destinationDirectory = remotePath.value || '/';
    const nextSelectedPaths: string[] = [];

    const operationLabel = `${t('servers.uploadSelected')}: ${destinationDirectory}`;

    try {
        await runTransferOperation(operationLabel, 'local-to-remote', async ({ operationId, setProgress, throwIfCancelled }) => {
            const totalEntries = localClipboard.value?.entries.length ?? 0;
            let completedEntries = 0;

            for (const entry of localClipboard.value?.entries ?? []) {
                throwIfCancelled();
                const targetPath = joinRemotePath(destinationDirectory, entry.name);
                const resolvedPath = await resolveRemoteDestinationPath(selectedServerId.value!, entry, targetPath);

                if (!resolvedPath) {
                    completedEntries += 1;
                    setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                    continue;
                }

                await pasteLocalEntryToRemoteRecursive(entry, resolvedPath, operationId, true);
                nextSelectedPaths.push(resolvedPath);

                if (localClipboard.value?.mode === 'cut') {
                    throwIfCancelled();
                    await localFilesService.deletePath(entry.path);
                }

                completedEntries += 1;
                setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
            }
        });

        if (localClipboard.value?.mode === 'cut') {
            localClipboard.value = null;
            clearLocalSelection();
            await loadLocalFiles();
        }

        await loadRemoteFiles();
        setActiveExplorerPane('remote');
        selectedRemotePaths.value = nextSelectedPaths;
        selectedRemotePath.value = nextSelectedPaths[0] ?? null;
        remoteSelectionAnchorPath.value = nextSelectedPaths[0] ?? null;
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        remoteErrorMessage.value = filterGenericError(error);
    }
}

async function copyRemoteEntryRecursive(sourceEntry: ExplorerEntry, remoteDestinationPath: string, operationId?: string): Promise<void> {
    if (!selectedServerId.value) {
        return;
    }

    if (operationId) {
        throwIfTransferCancelled(operationId);
    }

    const resolvedDestinationPath = await resolveRemoteDestinationPath(selectedServerId.value, sourceEntry, remoteDestinationPath);

    if (!resolvedDestinationPath) {
        return;
    }

    if (sourceEntry.isDirectory) {
        const existingDestination = await findRemoteEntryByPath(selectedServerId.value, resolvedDestinationPath);

        if (!existingDestination) {
            await remoteFilesService.createRemoteDirectory(selectedServerId.value, resolvedDestinationPath, getCredentialOverride());
        }

        const childEntries = await remoteFilesService.listRemoteFiles(selectedServerId.value, sourceEntry.path, getCredentialOverride());

        for (const childEntry of childEntries) {
            await copyRemoteEntryRecursive(childEntry, joinRemotePath(resolvedDestinationPath, childEntry.name), operationId);
        }

        return;
    }

    const tempLocalPath = await remoteFilesService.downloadRemoteFile(selectedServerId.value, sourceEntry.path, getCredentialOverride());
    const contentBase64 = await localFilesService.readFile(tempLocalPath);
    await remoteFilesService.uploadRemoteFile(selectedServerId.value, resolvedDestinationPath, contentBase64, getCredentialOverride());
}

async function pasteRemoteClipboard(): Promise<void> {
    if (!remoteClipboard.value || !selectedServerId.value || remoteClipboard.value.serverId !== selectedServerId.value) {
        return;
    }

    const destinationDirectory = remotePath.value || '/';
    const nextSelectedPaths: string[] = [];

    const operationLabel = `${t('servers.pasteHere')}: ${destinationDirectory}`;

    try {
        await runTransferOperation(operationLabel, 'remote-to-remote', async ({ operationId, setProgress, throwIfCancelled }) => {
            const totalEntries = remoteClipboard.value?.entries.length ?? 0;
            let completedEntries = 0;

            if (remoteClipboard.value?.mode === 'cut') {
                for (const entry of remoteClipboard.value.entries) {
                    throwIfCancelled();
                    const targetPath = joinRemotePath(destinationDirectory, entry.name);
                    const resolvedPath = await resolveRemoteDestinationPath(selectedServerId.value!, entry, targetPath);

                    if (!resolvedPath) {
                        completedEntries += 1;
                        setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                        continue;
                    }

                    if (entry.path !== resolvedPath) {
                        const existingTarget = await findRemoteEntryByPath(selectedServerId.value!, resolvedPath);

                        if (existingTarget && existingTarget.path !== entry.path) {
                            await remoteFilesService.deleteRemoteFile(selectedServerId.value!, existingTarget.path, getCredentialOverride());
                        }

                        await remoteFilesService.renameRemotePath(selectedServerId.value!, entry.path, resolvedPath, getCredentialOverride());
                    }

                    nextSelectedPaths.push(resolvedPath);
                    completedEntries += 1;
                    setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
                }

                remoteClipboard.value = null;
                return;
            }

            for (const entry of remoteClipboard.value?.entries ?? []) {
                throwIfCancelled();
                const targetPath = joinRemotePath(destinationDirectory, entry.name);
                await copyRemoteEntryRecursive(entry, targetPath, operationId);
                nextSelectedPaths.push(targetPath);
                completedEntries += 1;
                setProgress((completedEntries / Math.max(totalEntries, 1)) * 100);
            }
        });

        await loadRemoteFiles();
        selectedRemotePaths.value = nextSelectedPaths;
        selectedRemotePath.value = nextSelectedPaths[0] ?? null;
        remoteSelectionAnchorPath.value = nextSelectedPaths[0] ?? null;
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        remoteErrorMessage.value = filterGenericError(error);
    }
}

async function pasteCurrentClipboard(): Promise<void> {
    if (activeExplorerPane.value === 'remote') {
        if (remoteClipboard.value) {
            await pasteRemoteClipboard();
            return;
        }

        if (localClipboard.value) {
            await pasteLocalClipboardToRemote();
            return;
        }

        return;
    }

    if (localClipboard.value) {
        await pasteLocalClipboard();
        return;
    }

    if (remoteClipboard.value) {
        await pasteRemoteClipboardToLocal();
    }
}

async function deleteSelectedRemoteEntries(): Promise<void> {
    const entries = selectedRemoteEntries.value;

    if (entries.length === 0 || !selectedServerId.value) {
        return;
    }

    const accepted = window.confirm(t('servers.deleteConfirm'));

    if (!accepted) {
        return;
    }

    try {
        for (const entry of entries) {
            await remoteFilesService.deleteRemoteFile(selectedServerId.value, entry.path, getCredentialOverride());
        }

        selectedRemotePaths.value = [];
        selectedRemotePath.value = null;
        remoteSelectionAnchorPath.value = null;
        await loadRemoteFiles();
    } catch (error) {
        remoteErrorMessage.value = filterGenericError(error);
    }
}

function updateActiveRemoteEditSessionCount(): void {
    activeRemoteEditSessionCount.value = remoteEditSessions.size;
}

function filterGenericError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (/530|login incorrect/i.test(message)) {
        return t('servers.ftpAuthFailed');
    }

    if (/timed out/i.test(message)) {
        return t('servers.remoteTimeout');
    }

    if (/permission denied|access denied|not permitted/i.test(message)) {
        return t('servers.permissionDenied');
    }

    if (/no such file|not found|cannot find/i.test(message)) {
        return t('servers.pathNotFound');
    }

    if (/already exists/i.test(message)) {
        return t('servers.alreadyExists');
    }

    if (/FTP only supports password authentication/i.test(message)) {
        return t('servers.ftpPasswordOnly');
    }

    if (/credential not found/i.test(message)) {
        return t('servers.credentialMissing');
    }

    return t('servers.operationFailed');
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatRelativeDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return '';
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const d = new Date(ms);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
}

function formatEntryMeta(entry: ExplorerEntry): string {
    if (entry.isDirectory) return '';
    const size = typeof entry.size === 'number' && Number.isFinite(entry.size)
        ? formatFileSize(entry.size) : '';
    const date = formatRelativeDate(entry.modifiedAt);
    if (size && date) return `${size} · ${date}`;
    return size || date;
}

function normalizeTrailingSeparators(value: string): string {
    return value.replace(/[\\/]+$/, '');
}

function joinLocalPath(basePath: string, name: string): string {
    const cleanName = name.replace(/^[\\/]+/, '').trim();

    if (!cleanName) {
        return basePath;
    }

    const normalizedBase = normalizeTrailingSeparators(basePath);
    const separator = normalizedBase.includes('\\') ? '\\' : '/';

    if (!normalizedBase) {
        return cleanName;
    }

    return `${normalizedBase}${separator}${cleanName}`;
}

function joinRemotePath(basePath: string, name: string): string {
    const cleanName = name.replace(/^\/+/, '').trim();

    if (!cleanName) {
        return basePath;
    }

    const normalizedBase = basePath.replace(/\/+$/, '') || '/';
    return `${normalizedBase}/${cleanName}`.replace(/\/+/g, '/');
}

function getLocalParentPath(currentPath: string): string {
    const normalized = normalizeTrailingSeparators(currentPath);

    if (!normalized) {
        return currentPath;
    }

    if (/^[A-Za-z]:$/.test(normalized)) {
        return `${normalized}\\`;
    }

    const lastBackslash = normalized.lastIndexOf('\\');
    const lastSlash = normalized.lastIndexOf('/');
    const index = Math.max(lastBackslash, lastSlash);

    if (index <= 2 && /^[A-Za-z]:/.test(normalized)) {
        return `${normalized.slice(0, 2)}\\`;
    }

    if (index <= 0) {
        return normalized || '/';
    }

    return normalized.slice(0, index);
}

function getRemoteParentPath(currentPath: string): string {
    const normalized = currentPath.replace(/\/+$/, '') || '/';

    if (normalized === '/') {
        return '/';
    }

    const index = normalized.lastIndexOf('/');
    return index <= 0 ? '/' : normalized.slice(0, index);
}

async function loadServers(): Promise<void> {
    try {
        servers.value = await listServers();

        if (servers.value.length > 0 && selectedServerId.value === null) {
            selectServer(servers.value[0].id);
        }
    } catch {
        remoteErrorMessage.value = '';
    }
}

async function loadLocalRoot(): Promise<void> {
    try {
        const savedPath = localStorage.getItem('karga-last-local-path');
        if (savedPath) {
            localPath.value = savedPath;
        } else {
            localPath.value = await localFilesService.getDefaultRoot();
        }
        await loadLocalFiles();
    } catch {
        localErrorMessage.value = '';
    }
}

function selectServer(serverId: number | null): void {
    selectedServerId.value = serverId;
    remotePath.value = '/';
    selectedRemotePath.value = null;
    selectedRemotePaths.value = [];
    remoteSelectionAnchorPath.value = null;
    needsPassword.value = false;
    temporaryUsername.value = servers.value.find((server) => server.id === serverId)?.username ?? '';
    temporaryPassword.value = '';

    if (serverId !== null) {
        void loadRemoteFiles();
    }
}

function selectLocalEntry(entry: ExplorerEntry): void {
    selectedLocalPath.value = entry.path;
}

function selectRemoteEntry(entry: ExplorerEntry): void {
    selectedRemotePath.value = entry.path;
}

function handleLocalEntryClick(entry: ExplorerEntry, event?: MouseEvent): void {
    if (event?.shiftKey) {
        selectLocalRange(entry);
        return;
    }

    if (event?.ctrlKey || event?.metaKey) {
        toggleLocalSelection(entry);
        return;
    }

    setSingleLocalSelection(entry);
}

async function handleLocalEntryDoubleClick(entry: ExplorerEntry): Promise<void> {
    if (entry.isDirectory) {
        await openLocalEntry(entry);
        return;
    }

    selectLocalEntry(entry);
    await remoteFilesService.openRemoteFileExternal(entry.path);
}

function handleRemoteEntryClick(entry: ExplorerEntry, event?: MouseEvent): void {
    if (event?.shiftKey) {
        const anchorPath = remoteSelectionAnchorPath.value ?? selectedRemotePath.value;

        if (!anchorPath) {
            setSingleRemoteSelection(entry);
            return;
        }

        const anchorIndex = remoteEntries.value.findIndex((item) => item.path === anchorPath);
        const currentIndex = remoteEntries.value.findIndex((item) => item.path === entry.path);

        if (anchorIndex === -1 || currentIndex === -1) {
            setSingleRemoteSelection(entry);
            return;
        }

        const [startIndex, endIndex] = anchorIndex < currentIndex ? [anchorIndex, currentIndex] : [currentIndex, anchorIndex];
        const rangeEntries = remoteEntries.value.slice(startIndex, endIndex + 1).map((item) => item.path);
        selectedRemotePaths.value = [...new Set(rangeEntries)];
        selectedRemotePath.value = selectedRemotePaths.value[0] ?? null;
        remoteSelectionAnchorPath.value = anchorPath;
        return;
    }

    if (event?.ctrlKey || event?.metaKey) {
        const nextPaths = new Set(selectedRemotePaths.value.length > 0 ? selectedRemotePaths.value : selectedRemotePath.value ? [selectedRemotePath.value] : []);

        if (nextPaths.has(entry.path)) {
            nextPaths.delete(entry.path);
        } else {
            nextPaths.add(entry.path);
        }

        selectedRemotePaths.value = [...nextPaths];
        selectedRemotePath.value = selectedRemotePaths.value[0] ?? null;
        remoteSelectionAnchorPath.value = entry.path;
        return;
    }

    setSingleRemoteSelection(entry);
}

async function handleRemoteEntryDoubleClick(entry: ExplorerEntry): Promise<void> {
    if (entry.isDirectory) {
        await openRemoteEntry(entry);
        return;
    }

    await openRemoteFileWithPrompt(entry);
}

function handleLocalDragStart(entry: ExplorerEntry, event: DragEvent): void {
    if (entry.isDirectory || !event.dataTransfer) {
        return;
    }

    selectedLocalPath.value = entry.path;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-karga-local-file', entry.path);
    event.dataTransfer.setData('text/plain', entry.path);
}

function handleLocalDragEnd(): void {
    isRemoteDropActive.value = false;
}

function handleRemoteDragOver(): void {
    if (!selectedServerId.value) {
        return;
    }

    isRemoteDropActive.value = true;
}

function handleRemoteDragLeave(): void {
    isRemoteDropActive.value = false;
}

async function handleRemoteDrop(event: DragEvent): Promise<void> {
    isRemoteDropActive.value = false;

    if (!selectedServerId.value) {
        return;
    }

    const sourcePath = event.dataTransfer?.getData('application/x-karga-local-file') || event.dataTransfer?.getData('text/plain');

    if (!sourcePath) {
        return;
    }

    const droppedEntry = localEntries.value.find((entry) => entry.path === sourcePath);

    if (!droppedEntry || droppedEntry.isDirectory) {
        return;
    }

    selectedLocalPath.value = droppedEntry.path;
    await uploadSelectedLocalFile();
}

function closeContextMenu(): void {
    contextMenu.value.visible = false;
    contextMenu.value.entry = null;
}

function openContextMenu(event: MouseEvent, scope: ContextMenuScope, entry: ExplorerEntry | null = null): void {
    const MENU_WIDTH = 224;
    const MENU_HEIGHT_ESTIMATE = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(4, Math.min(event.clientX, vw - MENU_WIDTH - 4));
    const y = Math.max(4, Math.min(event.clientY, vh - MENU_HEIGHT_ESTIMATE - 4));

    contextMenu.value = {
        visible: true,
        x,
        y,
        scope,
        entry,
    };
}

async function runMenuAction(action: () => void | Promise<void>): Promise<void> {
    try {
        await action();
    } finally {
        closeContextMenu();
    }
}

function openInputModal(title: string, placeholder: string, defaultValue: string = '', onConfirm?: (value: string) => void | Promise<void>): void {
    inputModalTitle.value = title;
    inputModalPlaceholder.value = placeholder;
    inputModalDefaultValue.value = defaultValue;
    confirmText.value = defaultValue;
    inputModalCallback.value = onConfirm ?? null;
    inputModalVisible.value = true;
}

function closeInputModal(): void {
    inputModalVisible.value = false;
    confirmText.value = '';
    inputModalCallback.value = null;
}

async function confirmInputModal(): Promise<void> {
    const value = confirmText.value.trim();

    if (!value || !inputModalCallback.value) {
        closeInputModal();
        return;
    }

    try {
        await inputModalCallback.value(value);
    } finally {
        closeInputModal();
    }
}

async function chooseLocalRoot(): Promise<void> {
    const chosen = await localFilesService.chooseRoot();

    if (!chosen) {
        return;
    }

    localPath.value = chosen;
    localStorage.setItem('karga-last-local-path', chosen);
    await loadLocalFiles();
}

async function loadLocalFiles(): Promise<void> {
    if (!localPath.value.trim()) {
        return;
    }

    isLocalLoading.value = true;
    localErrorMessage.value = '';

    try {
        localEntries.value = await localFilesService.listFiles(localPath.value.trim());
        localStorage.setItem('karga-last-local-path', localPath.value.trim());

        const currentSelectedPaths = selectedLocalPaths.value.length > 0 ? selectedLocalPaths.value : selectedLocalPath.value ? [selectedLocalPath.value] : [];
        const nextSelectedPaths = currentSelectedPaths.filter((path) => localEntries.value.some((entry) => entry.path === path));

        if (nextSelectedPaths.length > 0) {
            setLocalSelection(nextSelectedPaths, nextSelectedPaths[0]);
        } else {
            clearLocalSelection();
        }
    } catch (error) {
        localEntries.value = [];
        localErrorMessage.value = filterGenericError(error);
    } finally {
        isLocalLoading.value = false;
    }
}

async function loadRemoteFiles(): Promise<void> {
    if (!selectedServerId.value) {
        return;
    }

    isRemoteLoading.value = true;
    remoteErrorMessage.value = '';
    needsPassword.value = false;

    try {
        remoteEntries.value = await remoteFilesService.listRemoteFiles(selectedServerId.value, remotePath.value || '/');

        const currentSelectedPaths = selectedRemotePaths.value.length > 0 ? selectedRemotePaths.value : selectedRemotePath.value ? [selectedRemotePath.value] : [];
        const nextSelectedPaths = currentSelectedPaths.filter((path) => remoteEntries.value.some((entry) => entry.path === path));

        if (nextSelectedPaths.length > 0) {
            selectedRemotePaths.value = nextSelectedPaths;
            selectedRemotePath.value = nextSelectedPaths[0] ?? null;
        } else {
            selectedRemotePaths.value = [];
            selectedRemotePath.value = null;
            remoteSelectionAnchorPath.value = null;
        }
    } catch (error) {
        remoteEntries.value = [];
        remoteErrorMessage.value = filterGenericError(error);

        if (/530|login incorrect/i.test(error instanceof Error ? error.message : String(error ?? ''))) {
            needsPassword.value = true;
        }
    } finally {
        isRemoteLoading.value = false;
    }
}

async function retryWithPassword(): Promise<void> {
    if (!selectedServerId.value || (!temporaryUsername.value.trim() && !temporaryPassword.value.trim())) {
        return;
    }

    isRemoteLoading.value = true;
    remoteErrorMessage.value = '';

    try {
        remoteEntries.value = await remoteFilesService.listRemoteFiles(selectedServerId.value, remotePath.value || '/', {
            username: temporaryUsername.value.trim() || undefined,
            password: temporaryPassword.value.trim() || undefined,
        });
        needsPassword.value = false;
    } catch (error) {
        remoteEntries.value = [];
        remoteErrorMessage.value = filterGenericError(error);
    } finally {
        isRemoteLoading.value = false;
    }
}

function cancelReconnect(): void {
    needsPassword.value = false;
    temporaryUsername.value = '';
    temporaryPassword.value = '';
    remoteErrorMessage.value = '';
}

async function goLocalParent(): Promise<void> {
    localPath.value = getLocalParentPath(localPath.value);
    await loadLocalFiles();
}

async function goRemoteParent(): Promise<void> {
    remotePath.value = getRemoteParentPath(remotePath.value);
    await loadRemoteFiles();
}

async function openLocalEntry(entry: ExplorerEntry): Promise<void> {
    setSingleLocalSelection(entry);

    if (!entry.isDirectory) {
        return;
    }

    localPath.value = entry.path;
    await loadLocalFiles();
}

async function openRemoteEntry(entry: ExplorerEntry): Promise<void> {
    setSingleRemoteSelection(entry);

    if (!entry.isDirectory) {
        return;
    }

    remotePath.value = entry.path;
    await loadRemoteFiles();
}

async function openRemoteFileWithPrompt(entry: ExplorerEntry): Promise<void> {
    if (!selectedServerId.value) {
        return;
    }

    const accepted = window.confirm(`${t('servers.openRemoteFileConfirm')}\n\n${entry.name}`);

    if (!accepted) {
        return;
    }

    const operationLabel = `${t('servers.view')}: ${entry.name}`;

    try {
        await runTransferOperation(operationLabel, 'remote-to-local', async ({ operationId, setProgress, throwIfCancelled }) => {
            throwIfCancelled();
            setProgress(15);

            const localDownloadDirectory = await getCurrentLocalDownloadDirectory();
            const localDestinationPath = joinLocalPath(localDownloadDirectory, entry.name);
            setProgress(30);
            throwIfCancelled();

            const localPathFromDownload = await downloadRemoteFileIntoLocalPath(
                selectedServerId.value!,
                entry,
                localDestinationPath,
                operationId,
            );

            if (!localPathFromDownload) {
                setProgress(100);
                return;
            }

            setProgress(90);
            throwIfCancelled();
            await remoteFilesService.openRemoteFileExternal(localPathFromDownload);
            setProgress(100);
        });
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        remoteErrorMessage.value = filterGenericError(error);
    }
}

async function openRemoteFileForEdit(entry: ExplorerEntry): Promise<void> {
    if (!selectedServerId.value || entry.isDirectory) {
        return;
    }

    const operationLabel = `${t('servers.editFile')}: ${entry.name}`;

    try {
        await runTransferOperation(operationLabel, 'remote-to-local', async ({ operationId, setProgress, throwIfCancelled }) => {
            throwIfCancelled();

            const credentialOverride = getCredentialOverride();
            const localDownloadDirectory = await getCurrentLocalDownloadDirectory();
            const localDestinationPath = joinLocalPath(localDownloadDirectory, entry.name);
            setProgress(25);

            const localPathFromDownload = await downloadRemoteFileIntoLocalPath(
                selectedServerId.value!,
                entry,
                localDestinationPath,
                operationId,
            );

            if (!localPathFromDownload) {
                setProgress(100);
                return;
            }

            setProgress(70);
            throwIfCancelled();

            const initialContentBase64 = await localFilesService.readFile(localPathFromDownload);
            await remoteFilesService.openRemoteFileExternal(localPathFromDownload);

            const sessionKey = getRemoteEditSessionKey(selectedServerId.value!, entry.path);
            const existingSession = remoteEditSessions.get(sessionKey);

            if (existingSession) {
                window.clearInterval(existingSession.pollTimerId);
                remoteEditSessions.delete(sessionKey);
                updateActiveRemoteEditSessionCount();
            }

            const session: RemoteEditSession = {
                serverId: selectedServerId.value!,
                remotePath: entry.path,
                localPath: localPathFromDownload,
                lastUploadedBase64: initialContentBase64,
                uploadInFlight: false,
                pollTimerId: 0,
                credentialOverride,
            };

            session.pollTimerId = window.setInterval(() => {
                void syncRemoteEditSession(session);
            }, 2000);

            remoteEditSessions.set(sessionKey, session);
            updateActiveRemoteEditSessionCount();
            setProgress(100);
        });
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        remoteErrorMessage.value = filterGenericError(error);
    }
}

async function syncRemoteEditSession(session: RemoteEditSession): Promise<void> {
    if (session.uploadInFlight) {
        return;
    }

    try {
        const currentContentBase64 = await localFilesService.readFile(session.localPath);

        if (currentContentBase64 === session.lastUploadedBase64) {
            return;
        }

        session.uploadInFlight = true;
        const fileName = getBaseName(session.remotePath);
        pushTransferLog(`${t('servers.autoSyncUploading')}: ${fileName}`, 'info');

        await remoteFilesService.uploadRemoteFile(
            session.serverId,
            session.remotePath,
            currentContentBase64,
            session.credentialOverride,
        );

        session.lastUploadedBase64 = currentContentBase64;
        pushTransferLog(`✓ ${t('servers.autoSyncSaved')}: ${fileName}`, 'success');

        if (!isRemoteLoading.value && selectedServerId.value === session.serverId) {
            await loadRemoteFiles();
        }
    } catch (error) {
        const fileName = getBaseName(session.remotePath);
        pushTransferLog(`${t('servers.autoSyncFailed')}: ${fileName} — ${filterGenericError(error)}`, 'error');
    } finally {
        session.uploadInFlight = false;
    }
}

async function downloadRemoteEntry(entry: ExplorerEntry): Promise<void> {
    if (!selectedServerId.value || entry.isDirectory) {
        return;
    }

    const operationLabel = `${t('servers.download')}: ${entry.name}`;

    try {
        await runTransferOperation(operationLabel, 'remote-to-local', async ({ operationId, setProgress, throwIfCancelled }) => {
            throwIfCancelled();
            const localDownloadDirectory = await getCurrentLocalDownloadDirectory();
            const localDestinationPath = joinLocalPath(localDownloadDirectory, entry.name);
            setProgress(20);
            throwIfCancelled();

            const downloadedPath = await downloadRemoteFileIntoLocalPath(
                selectedServerId.value!,
                entry,
                localDestinationPath,
                operationId,
            );

            if (!downloadedPath) {
                setProgress(100);
                return;
            }

            setProgress(90);

            if (localPath.value.trim() === localDownloadDirectory.trim()) {
                await loadLocalFiles();
            }

            setProgress(100);
        });
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        remoteErrorMessage.value = filterGenericError(error);
    }
}

async function uploadSelectedLocalFile(): Promise<void> {
    if (!selectedServerId.value || !selectedLocalFile.value) {
        return;
    }

    const initialRemoteTarget = joinRemotePath(remotePath.value || '/', selectedLocalFile.value.name);
    const sourceFile = selectedLocalFile.value;
    const operationLabel = `${t('servers.uploadSelected')}: ${sourceFile.name}`;

    try {
        await runTransferOperation(operationLabel, 'local-to-remote', async ({ setProgress, throwIfCancelled }) => {
            throwIfCancelled();
            setProgress(20);

            const resolvedRemotePath = await resolveRemoteDestinationPath(selectedServerId.value!, sourceFile, initialRemoteTarget);

            if (!resolvedRemotePath) {
                setProgress(100);
                return;
            }

            const contentBase64 = await localFilesService.readFile(sourceFile.path);
            setProgress(45);
            throwIfCancelled();

            await remoteFilesService.uploadRemoteFile(
                selectedServerId.value!,
                resolvedRemotePath,
                contentBase64,
                needsPassword.value ? {
                    username: temporaryUsername.value.trim() || undefined,
                    password: temporaryPassword.value.trim() || undefined,
                } : undefined,
            );

            setProgress(90);
            await loadRemoteFiles();
            setProgress(100);
        });
    } catch (error) {
        if (isTransferCancelledError(error)) {
            return;
        }
        remoteErrorMessage.value = filterGenericError(error);
    }
}

async function uploadSpecificLocalFile(entry: ExplorerEntry): Promise<void> {
    if (entry.isDirectory) {
        return;
    }

    selectedLocalPath.value = entry.path;
    await uploadSelectedLocalFile();
}

function createLocalFolder(): void {
    openInputModal(t('servers.newFolderPrompt'), t('servers.newFolderPrompt'), '', async (folderName: string) => {
        try {
            await localFilesService.createDirectory(joinLocalPath(localPath.value || '', folderName));
            await loadLocalFiles();
        } catch (error) {
            localErrorMessage.value = filterGenericError(error);
        }
    });
}

function createLocalFile(): void {
    openInputModal(t('servers.newFilePrompt'), t('servers.newFilePrompt'), '', async (fileName: string) => {
        try {
            await localFilesService.createFile(joinLocalPath(localPath.value || '', fileName));
            await loadLocalFiles();
        } catch (error) {
            localErrorMessage.value = filterGenericError(error);
        }
    });
}

function renameLocalEntry(entry: ExplorerEntry): void {
    openInputModal(t('servers.renamePrompt'), t('servers.renamePrompt'), entry.name, async (nextName: string) => {
        if (nextName === entry.name) {
            return;
        }

        const parentPath = getLocalParentPath(entry.path);

        try {
            await localFilesService.renamePath(entry.path, joinLocalPath(parentPath, nextName));
            await loadLocalFiles();
        } catch (error) {
            localErrorMessage.value = filterGenericError(error);
        }
    });
}

async function deleteLocalEntry(entry: ExplorerEntry): Promise<void> {
    const accepted = window.confirm(t('servers.deleteConfirm'));

    if (!accepted) {
        return;
    }

    try {
        await localFilesService.deletePath(entry.path);
        await loadLocalFiles();
    } catch (error) {
        localErrorMessage.value = filterGenericError(error);
    }
}

function createRemoteFolder(): void {
    if (!selectedServerId.value) {
        return;
    }

    openInputModal(t('servers.newFolderPrompt'), t('servers.newFolderPrompt'), '', async (folderName: string) => {
        try {
            const targetPath = joinRemotePath(remotePath.value || '/', folderName);
            await remoteFilesService.createRemoteDirectory(
                selectedServerId.value!,
                targetPath,
                needsPassword.value ? {
                    username: temporaryUsername.value.trim() || undefined,
                    password: temporaryPassword.value.trim() || undefined,
                } : undefined,
            );
            await loadRemoteFiles();
        } catch (error) {
            remoteErrorMessage.value = filterGenericError(error);
        }
    });
}

function createRemoteFile(): void {
    if (!selectedServerId.value) {
        return;
    }

    openInputModal(t('servers.newFilePrompt'), t('servers.newFilePrompt'), '', async (fileName: string) => {
        try {
            const targetPath = joinRemotePath(remotePath.value || '/', fileName);
            await remoteFilesService.createRemoteFile(
                selectedServerId.value!,
                targetPath,
                needsPassword.value ? {
                    username: temporaryUsername.value.trim() || undefined,
                    password: temporaryPassword.value.trim() || undefined,
                } : undefined,
            );
            await loadRemoteFiles();
        } catch (error) {
            remoteErrorMessage.value = filterGenericError(error);
        }
    });
}

function renameRemoteEntry(entry: ExplorerEntry): void {
    if (!selectedServerId.value) {
        return;
    }

    openInputModal(t('servers.renamePrompt'), t('servers.renamePrompt'), entry.name, async (nextName: string) => {
        if (nextName === entry.name) {
            return;
        }

        const parentPath = getRemoteParentPath(entry.path);

        try {
            await remoteFilesService.renameRemotePath(
                selectedServerId.value!,
                entry.path,
                joinRemotePath(parentPath, nextName),
                needsPassword.value ? {
                    username: temporaryUsername.value.trim() || undefined,
                    password: temporaryPassword.value.trim() || undefined,
                } : undefined,
            );
            await loadRemoteFiles();
        } catch (error) {
            remoteErrorMessage.value = filterGenericError(error);
        }
    });
}

async function deleteRemoteEntry(entry: ExplorerEntry): Promise<void> {
    if (!selectedServerId.value) {
        return;
    }

    const accepted = window.confirm(t('servers.deleteConfirm'));

    if (!accepted) {
        return;
    }

    try {
        await remoteFilesService.deleteRemoteFile(
            selectedServerId.value,
            entry.path,
            needsPassword.value ? {
                username: temporaryUsername.value.trim() || undefined,
                password: temporaryPassword.value.trim() || undefined,
            } : undefined,
        );
        await loadRemoteFiles();
    } catch (error) {
        remoteErrorMessage.value = filterGenericError(error);
    }
}

onMounted(async () => {
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('blur', closeContextMenu);
    window.addEventListener('keydown', handleGlobalKeydown);
    await loadServers();
    await loadLocalRoot();
});

onBeforeUnmount(() => {
    for (const session of remoteEditSessions.values()) {
        window.clearInterval(session.pollTimerId);
    }
    remoteEditSessions.clear();
    updateActiveRemoteEditSessionCount();
    closeConflictModal();

    window.removeEventListener('click', closeContextMenu);
    window.removeEventListener('blur', closeContextMenu);
    window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>
