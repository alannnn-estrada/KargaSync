import path from 'node:path';

export const toPosixPath = (input: string): string => input.split(path.sep).join('/');

export const joinProviderPath = (basePath: string, filePath: string): string => {
    const normalizedBasePath = basePath.replace(/[\\/]+$/, '');
    const normalizedFilePath = filePath.replace(/^[\\/]+/, '');

    return path.join(normalizedBasePath, normalizedFilePath);
};

export const relativePosixPath = (rootPath: string, absolutePath: string): string => {
    const relativePath = path.relative(rootPath, absolutePath);

    return relativePath === '' ? path.basename(absolutePath) : toPosixPath(relativePath);
};