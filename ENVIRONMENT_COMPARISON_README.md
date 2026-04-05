# Environment Comparison Feature

## Overview

This feature enables comparing **ANY two environments** using their snapshots without hardcoding environment types. Compare any environments at runtime: `local` vs `prod`, `prod` vs `test`, `staging` vs `canary`, etc.

## Key Features

✅ **No Hardcoded Environment Types** - Works with any environment names  
✅ **Flexible Input** - Compare by environment names, IDs, or snapshot IDs  
✅ **Detailed Analysis** - File-level comparison with added/deleted/modified tracking  
✅ **Statistics** - Summary of changes with byte calculations  
✅ **Historical Comparisons** - Compare specific snapshots across time  

## Architecture

### Core Components

#### 1. **Domain Types** (`src/core/domain/snapshots/types.ts`)

Defines the data structures for environment comparison:

```typescript
// Represents a file from a snapshot
interface SnapshotFileEntry {
    relativePath: string;
    contentHash: string;
    sizeBytes: number;
}

// Complete environment snapshot with all files
interface EnvironmentSnapshot {
    id: number;
    environmentId: number;
    environmentName: string;  // ANY environment name
    label: string | null;
    createdAt: string;
    files: SnapshotFileEntry[];
}

// Individual file comparison result
interface SnapshotFileComparison {
    relativePath: string;
    status: 'added' | 'deleted' | 'modified' | 'unchanged';
    source?: FileInfo;
    target?: FileInfo;
}

// Complete comparison result
interface EnvironmentComparisonResult {
    summary: EnvironmentComparisonSummary;
    files: SnapshotFileComparison[];
}
```

#### 2. **Repository** (`src/core/domain/snapshots/repository.ts`)

Provides data access for snapshots with multiple query patterns:

```typescript
interface SnapshotRepository {
    // By ID
    getSnapshotById(snapshotId: number): Promise<EnvironmentSnapshot | null>;
    
    // By environment (latest snapshot)
    getLatestSnapshotByEnvironmentId(environmentId: number): Promise<EnvironmentSnapshot | null>;
    getLatestSnapshotByEnvironmentName(projectId: number, name: string): Promise<EnvironmentSnapshot | null>;
    
    // Bulk operations
    getSnapshotsByEnvironmentId(environmentId: number): Promise<EnvironmentSnapshot[]>;
    getSnapshotsByProjectId(projectId: number): Promise<EnvironmentSnapshot[]>;
}
```

#### 3. **Comparator** (`src/core/domain/snapshots/comparator.ts`)

Implements the actual comparison logic using the `DiffEngine`:

```typescript
function createEnvironmentComparator({ sourceSnapshot, targetSnapshot }) {
    // Uses DiffEngine to compare files by relativePath
    // Calculates: added, deleted, modified, unchanged
    // Returns complete comparison result with statistics
}
```

#### 4. **Use Case** (`src/core/application/use-cases/compare-environments.ts`)

Orchestrates the comparison with flexible input parameters:

```typescript
interface CompareEnvironmentsInput {
    projectId: number;
    
    // Source - choose ONE:
    sourceEnvironmentId?: number;      // By ID
    sourceEnvironmentName?: string;    // By name (ANY!)
    sourceSnapshotId?: number;         // By snapshot
    
    // Target - choose ONE:
    targetEnvironmentId?: number;      // By ID
    targetEnvironmentName?: string;    // By name (ANY!)
    targetSnapshotId?: number;         // By snapshot
}
```

## Usage Examples

### Example 1: Compare by Environment Names (Most Flexible)

```typescript
import { createSnapshotRepository, createCompareEnvironmentsUseCase } from './src/core/domain/snapshots';

const repository = createSnapshotRepository(database);
const useCase = createCompareEnvironmentsUseCase({ snapshotRepository: repository });

// Compare ANY environments - not hardcoded!
const result = await useCase.compareEnvironments({
    projectId: 1,
    sourceEnvironmentName: 'local',     // Any environment name
    targetEnvironmentName: 'prod',      // Any environment name
});

console.log(`Added: ${result.summary.comparisonStats.added} files`);
console.log(`Deleted: ${result.summary.comparisonStats.deleted} files`);
console.log(`Modified: ${result.summary.comparisonStats.modified} files`);
```

### Example 2: Compare by Environment IDs

```typescript
const result = await useCase.compareEnvironments({
    projectId: 1,
    sourceEnvironmentId: 10,    // Environment ID
    targetEnvironmentId: 42,    // Environment ID
});
```

### Example 3: Compare Specific Snapshots

```typescript
const result = await useCase.compareSnapshots({
    sourceSnapshotId: 100,  // Historical snapshot
    targetSnapshotId: 105,  // Latest snapshot
});
```

### Example 4: Dynamic Environment Discovery

```typescript
// Get all environments in a project
const snapshots = await repository.getSnapshotsByProjectId(projectId);

// Extract unique environments
const environments = Array.from(
    new Map(snapshots.map(s => [s.environmentId, s.environmentName])).entries()
);

// Compare any two dynamically discovered environments
const [sourceId, sourceName] = environments[0];
const [targetId, targetName] = environments[1];

const result = await useCase.compareEnvironments({
    projectId,
    sourceEnvironmentId: sourceId,
    targetEnvironmentId: targetId,
});
```

## Understanding the Output

### Comparison Result Structure

```typescript
result.summary {
    sourceSnapshot: {
        environmentId: number;
        environmentName: string;    // Original environment name
        label: string | null;
        fileCount: number;
        totalBytes: number;
    },
    targetSnapshot: { ... },
    comparisonStats: {
        added: number;              // Files in target but not source
        deleted: number;            // Files in source but not target
        modified: number;           // Files with different content/size
        unchanged: number;          // Files identical in both
        total: number;
    },
    bytesChanged: {
        added: number;              // Total bytes of added files
        deleted: number;            // Total bytes of deleted files
        modified: number;           // Byte differences in modified files
        total: number;
    }
}

result.files[] {
    relativePath: string;
    status: 'added' | 'deleted' | 'modified' | 'unchanged';
    source?: {
        contentHash: string;
        sizeBytes: number;
    };
    target?: {
        contentHash: string;
        sizeBytes: number;
    };
}
```

## Why No Hardcoding?

The feature is designed to handle **any environment types** at runtime:

### ❌ Hardcoded Approach (OLD)
```typescript
type EnvironmentKind = 'local' | 'test' | 'prod';  // Limited!
// Only works with these three types
```

### ✅ Dynamic Approach (NEW)
```typescript
// Works with ANY environment names:
// - 'local', 'prod', 'test'
// - 'staging', 'canary', 'preview'
// - 'dev', 'qa', 'uat', 'live'
// - 'alpha', 'beta', 'release'
// - Custom: 'client-site-1', 'client-site-2', etc.
```

Environment names are now just strings stored in the database, completely flexible and extensible.

## Integration Steps

1. **Create Repository**
   ```typescript
   const repository = createSnapshotRepository(db);
   ```

2. **Create Use Case**
   ```typescript
   const useCase = createCompareEnvironmentsUseCase({ snapshotRepository: repository });
   ```

3. **Call Comparison**
   ```typescript
   const result = await useCase.compareEnvironments({ projectId, sourceEnvironmentName, targetEnvironmentName });
   ```

4. **Process Results**
   ```typescript
   for (const file of result.files) {
       if (file.status === 'modified') {
           console.log(`Changed: ${file.relativePath}`);
       }
   }
   ```

## Error Handling

The use case provides clear error messages:

```typescript
try {
    const result = await useCase.compareEnvironments({
        projectId: 1,
        sourceEnvironmentName: 'nonexistent',
        targetEnvironmentName: 'prod',
    });
} catch (error) {
    console.error(error.message);
    // "No snapshot found for source environment: nonexistent in project 1"
}
```

## Performance Considerations

- **Repository queries**: Optimized with proper SQL joins and indexes
- **File comparison**: Uses `DiffEngine` for efficient O(n+m) complexity
- **Memory**: Files are loaded into memory for comparison
  - For large snapshots (100k+ files), consider pagination or streaming
  - Current implementation suitable for typical project sizes

## Future Enhancements

- [ ] Paginated file results for large comparisons
- [ ] Streaming comparison for memory efficiency
- [ ] Change filtering (e.g., only show .ts files)
- [ ] Report generation (HTML, JSON, PDF)
- [ ] Historical trend analysis across multiple snapshots
- [ ] Environment synchronization suggestions

## Testing

See `compare-environments.example.ts` for comprehensive usage examples covering:
- Named environment comparison
- ID-based comparison  
- Snapshot-based comparison
- Dynamic environment discovery
- Result analysis and visualization
