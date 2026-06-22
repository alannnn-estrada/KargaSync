import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        rollupOptions: {
            external: [
                'node:sqlite',
                'ssh2',
                'ssh2-sftp-client',
                // Prevent Rollup from trying to parse native .node binaries
                (id: string) => id.endsWith('.node'),
            ],
        },
    },
});
