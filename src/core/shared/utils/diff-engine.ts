export type IterableLike<T> = Iterable<T> | AsyncIterable<T>;

export interface DiffLabels {
    source: string;
    target: string;
}

export interface DiffEngineConfig<TSource, TTarget = TSource> {
    sourceKey: (item: TSource) => string;
    targetKey?: (item: TTarget) => string;
    areEqual?: (source: TSource, target: TTarget) => boolean;
}

export interface DiffAddition<TTarget> {
    key: string;
    targetLabel: string;
    target: TTarget;
}

export interface DiffModification<TSource, TTarget> {
    key: string;
    sourceLabel: string;
    targetLabel: string;
    source: TSource;
    target: TTarget;
}

export interface DiffDeletion<TSource> {
    key: string;
    sourceLabel: string;
    source: TSource;
}

export interface DiffResult<TSource, TTarget> {
    labels: DiffLabels;
    added: Array<DiffAddition<TTarget>>;
    modified: Array<DiffModification<TSource, TTarget>>;
    deleted: Array<DiffDeletion<TSource>>;
}

interface SourceEntry<TSource> {
    item: TSource;
}

export class DiffEngine<TSource, TTarget = TSource> {
    private readonly targetKey: (item: TTarget) => string;

    constructor(private readonly config: DiffEngineConfig<TSource, TTarget>) {
        this.targetKey = config.targetKey ?? ((item: TTarget) => config.sourceKey(item as unknown as TSource));
    }

    async compare(
        sourceItems: IterableLike<TSource>,
        targetItems: IterableLike<TTarget>,
        labels: DiffLabels = { source: 'source', target: 'target' },
    ): Promise<DiffResult<TSource, TTarget>> {
        const sourceByKey = new Map<string, SourceEntry<TSource>>();
        const added: Array<DiffAddition<TTarget>> = [];
        const modified: Array<DiffModification<TSource, TTarget>> = [];
        const deleted: Array<DiffDeletion<TSource>> = [];

        for await (const sourceItem of sourceItems) {
            sourceByKey.set(this.config.sourceKey(sourceItem), { item: sourceItem });
        }

        for await (const targetItem of targetItems) {
            const key = this.targetKey(targetItem);
            const sourceEntry = sourceByKey.get(key);

            if (!sourceEntry) {
                added.push({
                    key,
                    targetLabel: labels.target,
                    target: targetItem,
                });
                continue;
            }

            sourceByKey.delete(key);

            if (this.config.areEqual?.(sourceEntry.item, targetItem) ?? Object.is(sourceEntry.item, targetItem)) {
                continue;
            }

            modified.push({
                key,
                sourceLabel: labels.source,
                targetLabel: labels.target,
                source: sourceEntry.item,
                target: targetItem,
            });
        }

        for (const [key, sourceEntry] of sourceByKey) {
            deleted.push({
                key,
                sourceLabel: labels.source,
                source: sourceEntry.item,
            });
        }

        return {
            labels,
            added,
            modified,
            deleted,
        };
    }
}

export const createDiffEngine = <TSource, TTarget = TSource>(
    config: DiffEngineConfig<TSource, TTarget>,
): DiffEngine<TSource, TTarget> => new DiffEngine(config);