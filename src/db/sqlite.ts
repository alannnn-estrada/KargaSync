import { DatabaseSync } from 'node:sqlite';

export interface SqliteRunResult {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
}

export interface SqliteStatement {
    run: (...args: unknown[]) => SqliteRunResult;
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
}

export interface SqliteDatabase {
    prepare: (sql: string) => SqliteStatement;
    exec: (sql: string) => void;
    pragma: (statement: string) => void;
    transaction: <TArgs extends unknown[]>(callback: (...args: TArgs) => void) => (...args: TArgs) => void;
    close: () => void;
}

class NodeSqliteDatabase implements SqliteDatabase {
    constructor(private readonly database: DatabaseSync) { }

    prepare(sql: string): SqliteStatement {
        const statement = this.database.prepare(sql) as SqliteStatement & {
            setAllowBareNamedParameters?: (enabled: boolean) => void;
        };

        statement.setAllowBareNamedParameters?.(true);

        return statement;
    }

    exec(sql: string): void {
        this.database.exec(sql);
    }

    pragma(statement: string): void {
        this.database.exec(`PRAGMA ${statement}`);
    }

    transaction<TArgs extends unknown[]>(callback: (...args: TArgs) => void): (...args: TArgs) => void {
        return (...args: TArgs) => {
            this.database.exec('BEGIN IMMEDIATE');

            try {
                callback(...args);
                this.database.exec('COMMIT');
            } catch (error) {
                try {
                    this.database.exec('ROLLBACK');
                } catch {
                    // Ignore rollback failures and rethrow the original error.
                }

                throw error;
            }
        };
    }

    close(): void {
        this.database.close();
    }
}

export const openSqliteDatabase = (filePath: string): SqliteDatabase =>
    new NodeSqliteDatabase(new DatabaseSync(filePath));