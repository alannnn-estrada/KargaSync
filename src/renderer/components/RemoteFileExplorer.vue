<template>
    <div class="p-4">
        <h3 class="text-lg font-semibold mb-2">Remote File Explorer</h3>

        <div class="mb-3 flex gap-2 items-center">
            <select v-model="selectedServerId" class="border rounded px-2 py-1">
                <option :value="null">{{ $t('project.selectServerPlaceholder') }}</option>
                <option v-for="s in servers" :key="s.id" :value="s.id">{{ s.host }}:{{ s.port }} ({{ s.username }})
                </option>
            </select>
            <input v-model="path" placeholder="/remote/path" class="border rounded px-2 py-1 flex-1" />
            <button @click="refresh" class="btn">Refresh</button>
        </div>

        <div v-if="entries.length === 0" class="text-sm text-gray-500">No files</div>

        <ul>
            <li v-for="e in entries" :key="e.path" class="flex items-center gap-3 py-1">
                <span>{{ e.isDirectory ? '📁' : '📄' }}</span>
                <div class="flex-1">{{ e.name }}</div>
                <div class="flex gap-2">
                    <button v-if="!e.isDirectory" @click="download(e)" class="btn">Download</button>
                    <button @click="enter(e)" class="btn">Open</button>
                    <button @click="remove(e)" class="btn text-red-600">Delete</button>
                </div>
            </li>
        </ul>

        <div class="mt-3">
            <label class="block mb-1">Upload file</label>
            <input type="file" @change="onFileInput" />
        </div>
    </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { listServers } from '../services/api';
import { remoteFilesService } from '../services/api';

export default {
    name: 'RemoteFileExplorer',
    setup() {
        const servers = ref<any[]>([]);
        const selectedServerId = ref<number | null>(null);
        const path = ref<string>('/');
        const entries = ref<any[]>([]);

        const loadServers = async () => {
            servers.value = await listServers();
        };

        const refresh = async () => {
            if (!selectedServerId.value) return;
            entries.value = await remoteFilesService.listRemoteFiles(selectedServerId.value, path.value || '/');
        };

        const download = async (entry: any) => {
            if (!selectedServerId.value) return;
            const localPath = await remoteFilesService.downloadRemoteFile(selectedServerId.value, entry.path);
            // open with external app
            await remoteFilesService.openRemoteFileExternal(localPath);
        };

        const enter = async (entry: any) => {
            if (entry.isDirectory) {
                path.value = entry.path;
                await refresh();
            } else {
                await download(entry);
            }
        };

        const remove = async (entry: any) => {
            if (!selectedServerId.value) return;
            await remoteFilesService.deleteRemoteFile(selectedServerId.value, entry.path);
            await refresh();
        };

        const onFileInput = async (ev: Event) => {
            const input = ev.target as HTMLInputElement;
            if (!input.files || input.files.length === 0 || !selectedServerId.value) return;
            const file = input.files[0];
            const buffer = await file.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const remoteTarget = path.value.endsWith('/') ? path.value + file.name : path.value + '/' + file.name;
            await remoteFilesService.uploadRemoteFile(selectedServerId.value, remoteTarget, base64);
            await refresh();
            input.value = '';
        };

        onMounted(loadServers);

        return { servers, selectedServerId, path, entries, refresh, download, enter, remove, onFileInput };
    },
};
</script>

<style scoped>
.btn {
    background: #eef2ff;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #dbe4ff;
}
</style>
