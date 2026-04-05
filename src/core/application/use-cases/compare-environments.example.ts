/**
 * Example: Comparing ANY two environments using snapshots
 * This demonstrates the flexible, non-hardcoded approach to environment comparison
 * Works with ANY environments - local vs prod, prod vs test, staging vs canary, etc.
 */

import { createSnapshotRepository } from '../domain/snapshots';
import { createCompareEnvironmentsUseCase } from '../application/use-cases/compare-environments';
import type { SqliteDatabase } from '../db/sqlite';

/**
 * Example 1: Compare by environment names (most user-friendly)
 * Works with ANY environment names - not hardcoded!
 */
export async function compareEnvironmentsByName(
    db: SqliteDatabase,
    projectId: number,
    sourceEnvironmentName: string,
    targetEnvironmentName: string,
) {
    const snapshotRepository = createSnapshotRepository(db);
    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository });

    const result = await useCase.compareEnvironments({
        projectId,
        sourceEnvironmentName,
        targetEnvironmentName,
    });

    console.log('Comparison Result:');
    console.log(`From: ${result.summary.sourceSnapshot.environmentName}`);
    console.log(`  To: ${result.summary.targetSnapshot.environmentName}`);
    console.log(`\nStatistics:`);
    console.log(`  Added:     ${result.summary.comparisonStats.added} files`);
    console.log(`  Deleted:   ${result.summary.comparisonStats.deleted} files`);
    console.log(`  Modified:  ${result.summary.comparisonStats.modified} files`);
    console.log(`  Unchanged: ${result.summary.comparisonStats.unchanged} files`);
    console.log(`\nBytes Changed:`);
    console.log(`  Added:     ${result.summary.bytesChanged.added} bytes`);
    console.log(`  Deleted:   ${result.summary.bytesChanged.deleted} bytes`);
    console.log(`  Modified:  ${result.summary.bytesChanged.modified} bytes`);

    return result;
}

/**
 * Example 2: Compare by environment IDs (programmatic access)
 */
export async function compareEnvironmentsById(
    db: SqliteDatabase,
    projectId: number,
    sourceEnvironmentId: number,
    targetEnvironmentId: number,
) {
    const snapshotRepository = createSnapshotRepository(db);
    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository });

    const result = await useCase.compareEnvironments({
        projectId,
        sourceEnvironmentId,
        targetEnvironmentId,
    });

    return result;
}

/**
 * Example 3: Compare specific snapshots (for historical analysis)
 */
export async function compareSpecificSnapshots(
    db: SqliteDatabase,
    sourceSnapshotId: number,
    targetSnapshotId: number,
) {
    const snapshotRepository = createSnapshotRepository(db);
    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository });

    const result = await useCase.compareSnapshots({
        sourceSnapshotId,
        targetSnapshotId,
    });

    return result;
}

/**
 * Example 4: Real-world usage - comparing different environment types
 * These could be ANY environments at runtime (not hardcoded!)
 */
export async function demonstrateFlexibleComparison(
    db: SqliteDatabase,
    projectId: number,
) {
    const snapshotRepository = createSnapshotRepository(db);
    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository });

    // Get all snapshots to see available environments
    const allSnapshots = await snapshotRepository.getSnapshotsByProjectId(projectId);

    if (allSnapshots.length < 2) {
        console.log('Not enough snapshots to compare');
        return;
    }

    // Get unique environments
    const uniqueEnvironments = Array.from(
        new Map(allSnapshots.map((s) => [s.environmentId, s.environmentName])).entries(),
    );

    console.log(`Available environments in project ${projectId}:`);
    for (const [envId, envName] of uniqueEnvironments) {
        const snapshots = allSnapshots.filter((s) => s.environmentId === envId);
        console.log(`  - ${envName} (${snapshots.length} snapshot(s))`);
    }

    // Example: Compare first two environments dynamically
    if (uniqueEnvironments.length >= 2) {
        const [sourceId, sourceName] = uniqueEnvironments[0];
        const [targetId, targetName] = uniqueEnvironments[1];

        console.log(`\nComparing: ${sourceName} vs ${targetName}`);

        const result = await useCase.compareEnvironments({
            projectId,
            sourceEnvironmentId: sourceId,
            targetEnvironmentId: targetId,
        });

        console.log(`Found ${result.files.length} differences`);

        // Show added files
        const addedFiles = result.files.filter((f) => f.status === 'added');
        if (addedFiles.length > 0) {
            console.log(`\nAdded files (${addedFiles.length}):`);
            addedFiles.slice(0, 5).forEach((f) => {
                console.log(`  + ${f.relativePath}`);
            });
            if (addedFiles.length > 5) {
                console.log(`  ... and ${addedFiles.length - 5} more`);
            }
        }

        // Show deleted files
        const deletedFiles = result.files.filter((f) => f.status === 'deleted');
        if (deletedFiles.length > 0) {
            console.log(`\nDeleted files (${deletedFiles.length}):`);
            deletedFiles.slice(0, 5).forEach((f) => {
                console.log(`  - ${f.relativePath}`);
            });
            if (deletedFiles.length > 5) {
                console.log(`  ... and ${deletedFiles.length - 5} more`);
            }
        }

        // Show modified files
        const modifiedFiles = result.files.filter((f) => f.status === 'modified');
        if (modifiedFiles.length > 0) {
            console.log(`\nModified files (${modifiedFiles.length}):`);
            modifiedFiles.slice(0, 5).forEach((f) => {
                console.log(`  ~ ${f.relativePath}`);
            });
            if (modifiedFiles.length > 5) {
                console.log(`  ... and ${modifiedFiles.length - 5} more`);
            }
        }
    }
}
