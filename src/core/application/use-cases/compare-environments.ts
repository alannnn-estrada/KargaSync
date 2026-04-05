/**
 * Use case for comparing ANY two environments
 * Orchestrates snapshot retrieval and comparison without hardcoding environment types
 */

import type {
    CompareEnvironmentsInput,
    CompareSnapshotsInput,
    EnvironmentComparisonResult,
} from '../../domain/snapshots/types';
import { createEnvironmentComparator } from '../../domain/snapshots/comparator';
import type { SnapshotRepository } from '../../domain/snapshots/repository';

export interface CompareEnvironmentsUseCaseDependencies {
    snapshotRepository: SnapshotRepository;
}

export interface CompareEnvironmentsUseCase {
    /**
     * Compare two environments by their IDs or names
     * Works with ANY environments - no hardcoded environment types
     */
    compareEnvironments(input: CompareEnvironmentsInput): Promise<EnvironmentComparisonResult>;

    /**
     * Compare two snapshots directly by their IDs
     */
    compareSnapshots(input: CompareSnapshotsInput): Promise<EnvironmentComparisonResult>;
}

export function createCompareEnvironmentsUseCase(
    { snapshotRepository }: CompareEnvironmentsUseCaseDependencies,
): CompareEnvironmentsUseCase {
    async function compareEnvironments(input: CompareEnvironmentsInput): Promise<EnvironmentComparisonResult> {
        const { projectId, sourceEnvironmentId, sourceEnvironmentName, sourceSnapshotId, targetEnvironmentId, targetEnvironmentName, targetSnapshotId } = input;

        // Resolve source snapshot
        let sourceSnapshot = null;

        if (sourceSnapshotId) {
            sourceSnapshot = await snapshotRepository.getSnapshotById(sourceSnapshotId);
            if (!sourceSnapshot) {
                throw new Error(`Source snapshot not found: ${sourceSnapshotId}`);
            }
        } else if (sourceEnvironmentId) {
            sourceSnapshot = await snapshotRepository.getLatestSnapshotByEnvironmentId(sourceEnvironmentId);
            if (!sourceSnapshot) {
                throw new Error(`No snapshot found for source environment ID: ${sourceEnvironmentId}`);
            }
        } else if (sourceEnvironmentName) {
            sourceSnapshot = await snapshotRepository.getLatestSnapshotByEnvironmentName(
                projectId,
                sourceEnvironmentName,
            );
            if (!sourceSnapshot) {
                throw new Error(
                    `No snapshot found for source environment: ${sourceEnvironmentName} in project ${projectId}`,
                );
            }
        } else {
            throw new Error('Source environment must be specified by ID, name, or snapshot ID');
        }

        // Resolve target snapshot
        let targetSnapshot = null;

        if (targetSnapshotId) {
            targetSnapshot = await snapshotRepository.getSnapshotById(targetSnapshotId);
            if (!targetSnapshot) {
                throw new Error(`Target snapshot not found: ${targetSnapshotId}`);
            }
        } else if (targetEnvironmentId) {
            targetSnapshot = await snapshotRepository.getLatestSnapshotByEnvironmentId(targetEnvironmentId);
            if (!targetSnapshot) {
                throw new Error(`No snapshot found for target environment ID: ${targetEnvironmentId}`);
            }
        } else if (targetEnvironmentName) {
            targetSnapshot = await snapshotRepository.getLatestSnapshotByEnvironmentName(
                projectId,
                targetEnvironmentName,
            );
            if (!targetSnapshot) {
                throw new Error(
                    `No snapshot found for target environment: ${targetEnvironmentName} in project ${projectId}`,
                );
            }
        } else {
            throw new Error('Target environment must be specified by ID, name, or snapshot ID');
        }

        // Perform comparison
        const comparator = createEnvironmentComparator({
            sourceSnapshot,
            targetSnapshot,
        });

        return await comparator.compare();
    }

    async function compareSnapshots(input: CompareSnapshotsInput): Promise<EnvironmentComparisonResult> {
        const { sourceSnapshotId, targetSnapshotId } = input;

        const sourceSnapshot = await snapshotRepository.getSnapshotById(sourceSnapshotId);
        if (!sourceSnapshot) {
            throw new Error(`Source snapshot not found: ${sourceSnapshotId}`);
        }

        const targetSnapshot = await snapshotRepository.getSnapshotById(targetSnapshotId);
        if (!targetSnapshot) {
            throw new Error(`Target snapshot not found: ${targetSnapshotId}`);
        }

        const comparator = createEnvironmentComparator({
            sourceSnapshot,
            targetSnapshot,
        });

        return await comparator.compare();
    }

    return {
        compareEnvironments,
        compareSnapshots,
    };
}
