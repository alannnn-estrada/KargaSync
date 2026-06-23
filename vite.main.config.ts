import { defineConfig } from 'vite';

// Intercept .node binary requires BEFORE @rollup/plugin-commonjs tries to parse them.
// ssh2 wraps sshcrypto.node in try/catch and falls back to pure-JS crypto when not found.
const nativeNodePlugin = {
    name: 'native-node',
    enforce: 'pre' as const,
    resolveId(id: string) {
        if (id.endsWith('.node')) {
            return { id, external: true };
        }
    },
};

// https://vitejs.dev/config
export default defineConfig({
    plugins: [nativeNodePlugin],
    build: {
        rollupOptions: {
            external: ['node:sqlite'],
        },
    },
});
