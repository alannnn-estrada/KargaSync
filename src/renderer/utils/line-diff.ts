import type { FileDiffLine } from '../../shared/ipc/contracts';

function lcs(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    return dp;
}

interface RawOp {
    type: 'equal' | 'insert' | 'delete';
    leftIdx: number | null;
    rightIdx: number | null;
    text: string;
}

function backtrack(dp: number[][], a: string[], b: string[], i: number, j: number, out: RawOp[]): void {
    if (i === 0 && j === 0) return;

    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        backtrack(dp, a, b, i - 1, j - 1, out);
        out.push({ type: 'equal', leftIdx: i - 1, rightIdx: j - 1, text: a[i - 1] });
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        backtrack(dp, a, b, i, j - 1, out);
        out.push({ type: 'insert', leftIdx: null, rightIdx: j - 1, text: b[j - 1] });
    } else {
        backtrack(dp, a, b, i - 1, j, out);
        out.push({ type: 'delete', leftIdx: i - 1, rightIdx: null, text: a[i - 1] });
    }
}

export function computeLineDiff(leftText: string, rightText: string): FileDiffLine[] {
    const leftLines = leftText.split('\n');
    const rightLines = rightText.split('\n');

    const dp = lcs(leftLines, rightLines);
    const raw: RawOp[] = [];
    backtrack(dp, leftLines, rightLines, leftLines.length, rightLines.length, raw);

    const result: FileDiffLine[] = [];
    let i = 0;

    while (i < raw.length) {
        const op = raw[i];

        if (op.type === 'equal') {
            result.push({
                type: 'equal',
                leftLineNo: op.leftIdx! + 1,
                rightLineNo: op.rightIdx! + 1,
                leftText: op.text,
                rightText: op.text,
            });
            i++;
            continue;
        }

        // Pair consecutive delete+insert as replace
        if (op.type === 'delete' && i + 1 < raw.length && raw[i + 1].type === 'insert') {
            result.push({
                type: 'replace',
                leftLineNo: op.leftIdx! + 1,
                rightLineNo: raw[i + 1].rightIdx! + 1,
                leftText: op.text,
                rightText: raw[i + 1].text,
            });
            i += 2;
            continue;
        }

        if (op.type === 'delete') {
            result.push({
                type: 'delete',
                leftLineNo: op.leftIdx! + 1,
                rightLineNo: null,
                leftText: op.text,
                rightText: '',
            });
        } else {
            result.push({
                type: 'insert',
                leftLineNo: null,
                rightLineNo: op.rightIdx! + 1,
                leftText: '',
                rightText: op.text,
            });
        }

        i++;
    }

    return result;
}
