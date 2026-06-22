/// <reference types="vite/client" />

import type { RendererApi } from './shared/ipc/contracts';

declare module '*.vue' {
    import type { DefineComponent } from 'vue';

    const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
    export default component;
}

declare module '*.sql?raw' {
    const sql: string;
    export default sql;
}

declare module '*.md?raw' {
    const markdown: string;
    export default markdown;
}

declare module 'node:sqlite' {
    export interface DatabaseSyncOptions {
        enableForeignKeyConstraints?: boolean;
    }

    export interface SqliteRunResult {
        changes: number | bigint;
        lastInsertRowid: number | bigint;
    }

    export interface StatementSync {
        run: (...args: unknown[]) => SqliteRunResult;
        get: (...args: unknown[]) => unknown;
        all: (...args: unknown[]) => unknown[];
        setAllowBareNamedParameters?: (enabled: boolean) => void;
    }

    export class DatabaseSync {
        constructor(path: string, options?: DatabaseSyncOptions);
        prepare(sql: string): StatementSync;
        exec(sql: string): void;
        close(): void;
    }
}

declare global {
    interface Window {
        api: RendererApi;
        platform: string;
    }
}

export { };