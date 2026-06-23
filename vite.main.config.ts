import { defineConfig } from 'vite';

// Stub out .node native binaries at build time so they never produce broken
// runtime requires. ssh2/cpu-features gracefully degrade to pure-JS fallbacks
// when their native bindings return {}.
const nativeNodePlugin = {
    name: 'native-node',
    enforce: 'pre' as const,
    resolveId(id: string) {
        if (id.endsWith('.node')) {
            return '\0native-node-stub';
        }
    },
    load(id: string) {
        if (id === '\0native-node-stub') {
            return 'module.exports = {};';
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
