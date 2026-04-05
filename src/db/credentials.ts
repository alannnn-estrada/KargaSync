import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { ConnectionCredentialInput, ConnectionId, CredentialManager } from './types';

const SERVICE_NAME = 'karga-sync';

const DEFAULT_FALLBACK_STORE_NAME = 'credential-store.json';
const DEFAULT_FALLBACK_KEY_NAME = 'credential-store.key';

interface EncryptedCredentialRecord {
    iv: string;
    authTag: string;
    ciphertext: string;
}

interface FallbackStore {
    version: 1;
    credentials: Record<string, EncryptedCredentialRecord>;
}

export interface CredentialManagerOptions {
    serviceName?: string;
    fallbackFilePath?: string;
    fallbackKeyFilePath?: string;
}

const ensureParentDirectory = (filePath: string) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const normalizeConnectionId = (connectionId: ConnectionId): string => String(connectionId).trim();

export const toConnectionCredentialRef = (connectionId: ConnectionId): string => {
    const normalizedId = normalizeConnectionId(connectionId);

    if (!normalizedId) {
        throw new Error('Connection ID is required to resolve a credential reference.');
    }

    return `connection:${normalizedId}`;
};

const resolveSecret = (credential: string | ConnectionCredentialInput): string => {
    if (typeof credential === 'string') {
        return credential;
    }

    const secret = credential.secret ?? credential.password ?? credential.privateKey ?? '';
    return secret;
};

const assertSecret = (secret: string): string => {
    if (!secret) {
        throw new Error('Credential secret is required.');
    }

    return secret;
};

const loadStore = (storePath: string): FallbackStore => {
    if (!fs.existsSync(storePath)) {
        return { version: 1, credentials: {} };
    }

    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FallbackStore>;

    return {
        version: 1,
        credentials: parsed.credentials ?? {},
    };
};

const saveStore = (storePath: string, store: FallbackStore) => {
    ensureParentDirectory(storePath);
    fs.writeFileSync(storePath, JSON.stringify(store), 'utf8');
};

const resolveMasterSecret = (keyPath: string): Buffer => {
    const envSecret = process.env.KARGA_CREDENTIALS_MASTER_KEY;

    if (envSecret) {
        return Buffer.from(envSecret, 'utf8');
    }

    ensureParentDirectory(keyPath);

    if (!fs.existsSync(keyPath)) {
        const generated = randomBytes(32).toString('hex');
        fs.writeFileSync(keyPath, generated, { encoding: 'utf8', mode: 0o600 });
    }

    return Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'utf8');
};

const deriveAesKey = (serviceName: string, keyPath: string): Buffer => {
    const masterSecret = resolveMasterSecret(keyPath);
    return scryptSync(masterSecret, `${serviceName}:credentials`, 32);
};

const encryptWithAes = (plainText: string, key: Buffer): EncryptedCredentialRecord => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
    };
};

const decryptWithAes = (record: EncryptedCredentialRecord, key: Buffer): string => {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(record.authTag, 'base64'));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(record.ciphertext, 'base64')),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
};

const createAesFallbackVault = (
    serviceName: string,
    fallbackPath: string,
    fallbackKeyPath: string,
) => {
    const key = deriveAesKey(serviceName, fallbackKeyPath);

    return {
        async save(credentialRef: string, secret: string) {
            const store = loadStore(fallbackPath);
            store.credentials[credentialRef] = encryptWithAes(secret, key);
            saveStore(fallbackPath, store);
        },
        async read(credentialRef: string) {
            const store = loadStore(fallbackPath);
            const record = store.credentials[credentialRef];

            if (!record) {
                return null;
            }

            return decryptWithAes(record, key);
        },
        async delete(credentialRef: string) {
            const store = loadStore(fallbackPath);

            if (!(credentialRef in store.credentials)) {
                return false;
            }

            delete store.credentials[credentialRef];
            saveStore(fallbackPath, store);

            return true;
        },
    };
};

export function createCredentialManager(options: CredentialManagerOptions = {}): CredentialManager {
    const serviceName = options.serviceName ?? SERVICE_NAME;
    const fallbackFilePath = options.fallbackFilePath ?? path.join(process.cwd(), DEFAULT_FALLBACK_STORE_NAME);
    const fallbackKeyFilePath = options.fallbackKeyFilePath ?? path.join(process.cwd(), DEFAULT_FALLBACK_KEY_NAME);
    const fallbackVault = createAesFallbackVault(serviceName, fallbackFilePath, fallbackKeyFilePath);

    const save = async (credentialRef: string, secret: string) => {
        await fallbackVault.save(credentialRef, secret);
    };

    const read = async (credentialRef: string) => {
        return fallbackVault.read(credentialRef);
    };

    const remove = async (credentialRef: string) => {
        return fallbackVault.delete(credentialRef);
    };

    return {
        async save(credentialRef: string, secret: string) {
            await save(credentialRef, assertSecret(secret));
        },
        async read(credentialRef: string) {
            return read(credentialRef);
        },
        async delete(credentialRef: string) {
            return remove(credentialRef);
        },
        async saveCredential(connectionId: ConnectionId, credential: string | ConnectionCredentialInput) {
            const credentialRef = toConnectionCredentialRef(connectionId);
            const secret = assertSecret(resolveSecret(credential));
            await save(credentialRef, secret);
        },
        async getCredential(connectionId: ConnectionId) {
            const credentialRef = toConnectionCredentialRef(connectionId);
            return read(credentialRef);
        },
        async deleteCredential(connectionId: ConnectionId) {
            const credentialRef = toConnectionCredentialRef(connectionId);
            return remove(credentialRef);
        },
    };
}

export function createKeytarCredentialVault(serviceName = SERVICE_NAME): CredentialManager {
    return createCredentialManager({ serviceName });
}
