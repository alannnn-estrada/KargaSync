import crypto from 'node:crypto';

function readUint32(buf: Buffer, offset: number): [number, number] {
    return [buf.readUInt32BE(offset), offset + 4];
}

function readBytes(buf: Buffer, offset: number): [Buffer, number] {
    const [len, next] = readUint32(buf, offset);
    return [buf.subarray(next, next + len), next + len];
}

function readMpint(buf: Buffer, offset: number): [bigint, number] {
    const [bytes, next] = readBytes(buf, offset);
    if (bytes.length === 0) return [0n, next];
    return [BigInt('0x' + bytes.toString('hex')), next];
}

function bigintToBase64url(n: bigint, minBytes?: number): string {
    let hex = n.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    let buf = Buffer.from(hex, 'hex');
    if (minBytes && buf.length < minBytes) {
        buf = Buffer.concat([Buffer.alloc(minBytes - buf.length), buf]);
    }
    return buf.toString('base64url');
}

function parsePpkSections(content: string): {
    keyType: string;
    encryption: string;
    publicBlob: Buffer;
    privateBlob: Buffer;
} {
    const lines = content.split(/\r?\n/);
    let i = 0;

    const headerLine = lines[i++] ?? '';
    let keyType = '';
    if (headerLine.startsWith('PuTTY-User-Key-File-2:') || headerLine.startsWith('PuTTY-User-Key-File-3:')) {
        keyType = headerLine.split(':')[1]?.trim() ?? '';
    } else {
        throw new Error('Not a PPK file');
    }

    const encLine = lines[i++] ?? '';
    const encryption = encLine.split(':')[1]?.trim() ?? '';
    if (encryption !== 'none') {
        throw new Error('Encrypted PPK files (with passphrase) are not supported yet');
    }

    // Skip comment line
    i++;

    const readBlock = (expectedPrefix: string): Buffer => {
        const countLine = lines[i++] ?? '';
        if (!countLine.startsWith(expectedPrefix)) {
            throw new Error(`PPK parse error: expected "${expectedPrefix}", got "${countLine}"`);
        }
        const count = parseInt(countLine.split(':')[1]?.trim() ?? '0', 10);
        let b64 = '';
        for (let j = 0; j < count; j++) b64 += lines[i++] ?? '';
        return Buffer.from(b64, 'base64');
    };

    const publicBlob = readBlock('Public-Lines');

    // PPK v3 may have extra lines before Private-Lines
    while (i < lines.length && !lines[i].startsWith('Private-Lines')) i++;
    const privateBlob = readBlock('Private-Lines');

    return { keyType, encryption, publicBlob, privateBlob };
}

export function isPpkContent(content: string): boolean {
    return content.trimStart().startsWith('PuTTY-User-Key-File-');
}

export function convertPpkToPrivateKey(ppkContent: string): string {
    const { keyType, publicBlob, privateBlob } = parsePpkSections(ppkContent);

    if (keyType === 'ssh-rsa') {
        // Public blob: [len]["ssh-rsa"][mpint:e][mpint:n]
        const [, o1] = readBytes(publicBlob, 0);
        const [e, o2] = readMpint(publicBlob, o1);
        const [n] = readMpint(publicBlob, o2);

        // Private blob: [mpint:d][mpint:p][mpint:q][mpint:iqmp]
        const [d, po2] = readMpint(privateBlob, 0);
        const [p, po3] = readMpint(privateBlob, po2);
        const [q, po4] = readMpint(privateBlob, po3);
        const [iqmp] = readMpint(privateBlob, po4);

        const dp = d % (p - 1n);
        const dq = d % (q - 1n);

        const privateKey = crypto.createPrivateKey({
            key: { kty: 'RSA', n: bigintToBase64url(n), e: bigintToBase64url(e), d: bigintToBase64url(d), p: bigintToBase64url(p), q: bigintToBase64url(q), dp: bigintToBase64url(dp), dq: bigintToBase64url(dq), qi: bigintToBase64url(iqmp) },
            format: 'jwk',
        });
        return privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
    }

    if (keyType === 'ssh-ed25519') {
        // Public blob: [len]["ssh-ed25519"][uint32:32][32 bytes]
        const [, o1] = readBytes(publicBlob, 0);
        const [pubBytes] = readBytes(publicBlob, o1);

        // Private blob: [uint32:64][seed(32)+pub(32)]
        const [privBytes] = readBytes(privateBlob, 0);
        const seed = privBytes.subarray(0, 32);

        const privateKey = crypto.createPrivateKey({
            key: { kty: 'OKP', crv: 'Ed25519', x: pubBytes.toString('base64url'), d: seed.toString('base64url') },
            format: 'jwk',
        });
        return privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    }

    if (keyType === 'ecdsa-sha2-nistp256' || keyType === 'ecdsa-sha2-nistp384' || keyType === 'ecdsa-sha2-nistp521') {
        const curveMap: Record<string, string> = {
            'ecdsa-sha2-nistp256': 'P-256',
            'ecdsa-sha2-nistp384': 'P-384',
            'ecdsa-sha2-nistp521': 'P-521',
        };
        const crv = curveMap[keyType];

        // Public blob: [len]["ecdsa-sha2-nistpNNN"][len][curve_name][len][uncompressed_point]
        const [, o1] = readBytes(publicBlob, 0);
        const [, o2] = readBytes(publicBlob, o1);
        const [pointBytes] = readBytes(publicBlob, o2);
        const keyLen = (pointBytes.length - 1) / 2;
        const x = pointBytes.subarray(1, 1 + keyLen);
        const y = pointBytes.subarray(1 + keyLen);

        const [scalar] = readMpint(privateBlob, 0);

        const privateKey = crypto.createPrivateKey({
            key: { kty: 'EC', crv, x: x.toString('base64url'), y: y.toString('base64url'), d: bigintToBase64url(scalar, keyLen) },
            format: 'jwk',
        });
        return privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    }

    throw new Error(`PPK key type "${keyType}" is not supported. Supported types: ssh-rsa, ssh-ed25519, ecdsa-sha2-nistp256/384/521`);
}
