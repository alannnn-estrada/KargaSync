/**
 * Minimal glob-pattern matcher for snapshot ignore rules.
 *
 * Supported patterns:
 *   node_modules        — matches the segment "node_modules" anywhere in the path
 *   node_modules/**     — same, plus all contents beneath it
 *   *.log               — matches any file ending in .log at any depth
 *   **\/*.min.js        — matches .min.js files at any depth
 *   .git                — matches the segment ".git" anywhere
 *
 * No external dependencies. Works with posix-style relative paths.
 */

function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Convert a glob pattern to a RegExp.
 * Rules:
 *  - `**` matches zero or more path segments (including none)
 *  - `*`  matches any characters except `/`
 *  - `?`  matches a single character except `/`
 *  - All other regex special characters are escaped
 */
function globToRegExp(pattern: string): RegExp {
    const normalized = normalizePath(pattern);

    // Escape regex special chars except * and ?
    let regexStr = '';
    let i = 0;

    while (i < normalized.length) {
        const ch = normalized[i];

        if (ch === '*' && normalized[i + 1] === '*') {
            // ** — matches anything including slashes
            // If surrounded by slashes or at boundaries, consume the slashes too
            if (normalized[i + 2] === '/') {
                // **/foo  → match "foo" or "bar/foo"
                regexStr += '(?:.+/)?';
                i += 3;
            } else {
                regexStr += '.*';
                i += 2;
            }
        } else if (ch === '*') {
            regexStr += '[^/]*';
            i += 1;
        } else if (ch === '?') {
            regexStr += '[^/]';
            i += 1;
        } else if ('.+^${}()|[]\\'.indexOf(ch) !== -1) {
            regexStr += '\\' + ch;
            i += 1;
        } else {
            regexStr += ch;
            i += 1;
        }
    }

    return new RegExp('^' + regexStr + '$');
}

/**
 * Returns true if relativePath should be excluded.
 *
 * A pattern with no `/` (and no `**`) is treated as a "bare segment" pattern —
 * it matches any path component with that name (e.g. `node_modules` matches
 * `node_modules`, `a/node_modules/b`, etc.).
 *
 * A pattern containing `/` or `**` is matched against the full relative path.
 */
export function shouldIgnore(relativePath: string, patterns: string[]): boolean {
    if (!patterns || patterns.length === 0) {
        return false;
    }

    const normalizedPath = normalizePath(relativePath);
    const segments = normalizedPath.split('/');

    for (const raw of patterns) {
        const pattern = raw.trim();

        if (!pattern || pattern.charAt(0) === '#') {
            continue;
        }

        const normalizedPattern = normalizePath(pattern);

        const isBareSegment =
            normalizedPattern.indexOf('/') === -1 &&
            normalizedPattern.indexOf('**') === -1 &&
            normalizedPattern.indexOf('*') === -1 &&
            normalizedPattern.indexOf('?') === -1;

        if (isBareSegment) {
            // Match any path segment
            if (segments.indexOf(normalizedPattern) !== -1) {
                return true;
            }
            continue;
        }

        // Patterns with wildcards or slashes — build a regex and test the full path
        // Also handle bare wildcard-only patterns like "*.log" — test each segment
        const hasSlash = normalizedPattern.indexOf('/') !== -1;
        const hasDoubleGlob = normalizedPattern.indexOf('**') !== -1;

        if (!hasSlash && !hasDoubleGlob) {
            // e.g. "*.log" — match against each path segment
            const segRe = globToRegExp(normalizedPattern);

            for (const segment of segments) {
                if (segRe.test(segment)) {
                    return true;
                }
            }
            continue;
        }

        // Full-path pattern
        const fullRe = globToRegExp(normalizedPattern);
        if (fullRe.test(normalizedPath)) {
            return true;
        }
    }

    return false;
}
