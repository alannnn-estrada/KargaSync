#!/usr/bin/env node
/**
 * Quick Reference: Environment Comparison Without Hardcoding
 * 
 * This file demonstrates practical scenarios for comparing environments.
 * NO environment types are hardcoded - works with ANY runtime environments!
 */

import { createSnapshotRepository } from '../domain/snapshots';
import { createCompareEnvironmentsUseCase } from '../application/use-cases/compare-environments';

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1: Local vs Production
// ─────────────────────────────────────────────────────────────────────────────

async function scenarioLocalVsProd(db: any, projectId: number) {
    console.log('\n📊 SCENARIO: Local vs Production');
    console.log('─'.repeat(60));

    const repo = createSnapshotRepository(db);
    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository: repo });

    try {
        const result = await useCase.compareEnvironments({
            projectId,
            sourceEnvironmentName: 'local',
            targetEnvironmentName: 'prod',
        });

        console.log(`From: ${result.summary.sourceSnapshot.environmentName} (${result.summary.sourceSnapshot.fileCount} files)`);
        console.log(`To:   ${result.summary.targetSnapshot.environmentName} (${result.summary.targetSnapshot.fileCount} files)`);
        console.log('\nChanges detected:');
        console.log(`  ➕ Added:    ${result.summary.comparisonStats.added}`);
        console.log(`  ➖ Deleted:  ${result.summary.comparisonStats.deleted}`);
        console.log(`  🔄 Modified: ${result.summary.comparisonStats.modified}`);
        console.log('\nData impact:');
        console.log(`  +${formatBytes(result.summary.bytesChanged.added)} added`);
        console.log(`  -${formatBytes(result.summary.bytesChanged.deleted)} deleted`);
        console.log(`  ±${formatBytes(result.summary.bytesChanged.modified)} changed`);

        return result;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2: Production Drift Detection
// ─────────────────────────────────────────────────────────────────────────────

async function scenarioProductionDriftDetection(db: any, projectId: number) {
    console.log('\n🔍 SCENARIO: Production Drift Detection');
    console.log('─'.repeat(60));

    const repo = createSnapshotRepository(db);
    
    // Get all snapshots for the 'prod' environment
    const allSnapshots = await repo.getSnapshotsByProjectId(projectId);
    const prodSnapshots = allSnapshots.filter(s => s.environmentName === 'prod').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (prodSnapshots.length < 2) {
        console.log('⚠️  Need at least 2 prod snapshots for drift detection');
        return;
    }

    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository: repo });
    const latestSnapshot = prodSnapshots[0];
    const previousSnapshot = prodSnapshots[1];

    try {
        const result = await useCase.compareSnapshots({
            sourceSnapshotId: previousSnapshot.id,
            targetSnapshotId: latestSnapshot.id,
        });

        // Get unexpected drift
        const unexpectedChanges = result.files.filter(f => f.status !== 'unchanged');

        if (unexpectedChanges.length === 0) {
            console.log('✅ No drift detected - production is stable');
        } else {
            console.log(`⚠️  DRIFT DETECTED: ${unexpectedChanges.length} files changed unexpectedly`);
            
            const modified = unexpectedChanges.filter(f => f.status === 'modified');
            const deleted = unexpectedChanges.filter(f => f.status === 'deleted');
            const added = unexpectedChanges.filter(f => f.status === 'added');

            if (modified.length > 0) {
                console.log(`\n🔄 Modified files (${modified.length}):`);
                modified.slice(0, 3).forEach(f => console.log(`   ${f.relativePath}`));
                if (modified.length > 3) console.log(`   ... and ${modified.length - 3} more`);
            }

            if (deleted.length > 0) {
                console.log(`\n❌ Deleted files (${deleted.length}):`);
                deleted.slice(0, 3).forEach(f => console.log(`   ${f.relativePath}`));
                if (deleted.length > 3) console.log(`   ... and ${deleted.length - 3} more`);
            }

            if (added.length > 0) {
                console.log(`\n✨ Unexpected additions (${added.length}):`);
                added.slice(0, 3).forEach(f => console.log(`   ${f.relativePath}`));
                if (added.length > 3) console.log(`   ... and ${added.length - 3} more`);
            }
        }

        return result;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3: Multi-Environment Comparison
// ─────────────────────────────────────────────────────────────────────────────

async function scenarioMultiEnvironmentComparison(db: any, projectId: number) {
    console.log('\n🌍 SCENARIO: Compare All Environments');
    console.log('─'.repeat(60));

    const repo = createSnapshotRepository(db);
    const allSnapshots = await repo.getSnapshotsByProjectId(projectId);

    // Group by environment name
    const envMap = new Map<string, any>();
    for (const snapshot of allSnapshots) {
        if (!envMap.has(snapshot.environmentName)) {
            envMap.set(snapshot.environmentName, snapshot);
        }
    }

    const environments = Array.from(envMap.entries());
    console.log(`\nAvailable environments: ${environments.map(([name]) => name).join(', ')}`);

    if (environments.length < 2) {
        console.log('⚠️  Need at least 2 environments to compare');
        return;
    }

    // Create comparison matrix
    console.log('\n📋 Comparison Matrix:\n');
    console.log('       ' + environments.map(([name]) => name.padEnd(12)).join(''));
    console.log('─'.repeat(60));

    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository: repo });

    for (let i = 0; i < environments.length; i++) {
        const [sourceName] = environments[i];
        process.stdout.write(sourceName.padEnd(6));

        for (let j = 0; j < environments.length; j++) {
            const [targetName] = environments[j];

            if (i === j) {
                process.stdout.write('  —  '.padEnd(12));
            } else {
                try {
                    const result = await useCase.compareEnvironments({
                        projectId,
                        sourceEnvironmentName: sourceName,
                        targetEnvironmentName: targetName,
                    });

                    const changes = result.summary.comparisonStats.added +
                        result.summary.comparisonStats.deleted +
                        result.summary.comparisonStats.modified;

                    process.stdout.write(`${changes.toString().padEnd(12)}`);
                } catch {
                    process.stdout.write(' n/a '.padEnd(12));
                }
            }
        }
        console.log();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 4: Change Analysis Report
// ─────────────────────────────────────────────────────────────────────────────

async function scenarioChangeAnalysisReport(db: any, projectId: number, source: string, target: string) {
    console.log('\n📈 SCENARIO: Detailed Change Analysis');
    console.log('─'.repeat(60));

    const repo = createSnapshotRepository(db);
    const useCase = createCompareEnvironmentsUseCase({ snapshotRepository: repo });

    try {
        const result = await useCase.compareEnvironments({
            projectId,
            sourceEnvironmentName: source,
            targetEnvironmentName: target,
        });

        // Organize by file type
        const byExtension = new Map<string, typeof result.files>();
        for (const file of result.files) {
            const ext = file.relativePath.split('.').pop() || 'no-ext';
            if (!byExtension.has(ext)) {
                byExtension.set(ext, []);
            }
            byExtension.get(ext)!.push(file);
        }

        console.log(`\n✏️  Changes by File Type:\n`);
        const sortedExts = Array.from(byExtension.entries())
            .sort(([, a], [, b]) => b.length - a.length);

        for (const [ext, files] of sortedExts) {
            const added = files.filter(f => f.status === 'added').length;
            const deleted = files.filter(f => f.status === 'deleted').length;
            const modified = files.filter(f => f.status === 'modified').length;

            console.log(`${ext.padEnd(12)} (+${added.toString().padEnd(3)} -${deleted.toString().padEnd(3)} ~${modified.toString().padEnd(3)}) ${files.length} total`);
        }

        // Top changed directories
        const byDir = new Map<string, number>();
        for (const file of result.files.filter(f => f.status !== 'unchanged')) {
            const dir = file.relativePath.split('/').slice(0, -1).join('/') || '/';
            byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
        }

        console.log(`\n📁 Most Changed Directories:\n`);
        const sortedDirs = Array.from(byDir.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        for (const [dir, count] of sortedDirs) {
            console.log(`${(dir || '(root)').padEnd(40)} ${count} changes`);
        }

        return result;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: Run all scenarios
// ─────────────────────────────────────────────────────────────────────────────

export async function runAllScenarios(db: any, projectId: number) {
    console.log('\n' + '═'.repeat(60));
    console.log('🎯 ENVIRONMENT COMPARISON - NO HARDCODING DEMO');
    console.log('═'.repeat(60));

    await scenarioLocalVsProd(db, projectId);
    await scenarioProductionDriftDetection(db, projectId);
    await scenarioMultiEnvironmentComparison(db, projectId);
    await scenarioChangeAnalysisReport(db, projectId, 'local', 'prod');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All scenarios completed!');
    console.log('═'.repeat(60) + '\n');
}
