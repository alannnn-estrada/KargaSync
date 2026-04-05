import MarkdownIt from 'markdown-it';
import changelogV010 from '../../../changelog/v0.1.0.md?raw';
import changelogV020 from '../../../changelog/v0.2.0.md?raw';

export interface ChangelogEntry {
    version: string;
    markdown: string;
    html: string;
    path: string;
    isLatest: boolean;
}

const markdown = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
});

const changelogFiles: Record<string, string> = {
    '/changelog/v0.1.0.md': changelogV010,
    '/changelog/v0.2.0.md': changelogV020,
};

function toVersionKey(version: string): number[] {
    return version
        .replace(/^v/i, '')
        .split('.')
        .map((part) => Number.parseInt(part, 10))
        .map((part) => (Number.isNaN(part) ? 0 : part));
}

function compareVersionsDesc(left: string, right: string): number {
    const leftKey = toVersionKey(left);
    const rightKey = toVersionKey(right);
    const maxLength = Math.max(leftKey.length, rightKey.length);

    for (let index = 0; index < maxLength; index += 1) {
        const leftValue = leftKey[index] ?? 0;
        const rightValue = rightKey[index] ?? 0;

        if (leftValue !== rightValue) {
            return rightValue - leftValue;
        }
    }

    return 0;
}

function extractVersion(path: string): string {
    const fileName = path.split('/').pop() ?? '';
    return fileName.replace(/\.md$/i, '');
}

export function loadChangelogEntries(): ChangelogEntry[] {
    const entries = Object.entries(changelogFiles)
        .map(([path, markdownContent]) => {
            const version = extractVersion(path);

            return {
                version,
                markdown: markdownContent,
                html: markdown.render(markdownContent),
                path,
                isLatest: false,
            } satisfies ChangelogEntry;
        })
        .sort((left, right) => compareVersionsDesc(left.version, right.version));

    return entries.map((entry, index) => ({
        ...entry,
        isLatest: index === 0,
    }));
}
