import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        rollupOptions: {
            external: [
                'node:sqlite',
                // Prevent Rollup from trying to parse native .node binaries
                // ssh2 catches the load failure and falls back to pure-JS crypto
                (id: string) => id.endsWith('.node'),
            ],
        },
    },
});
