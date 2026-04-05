# Quick Start Checklist: Environment Comparison

## 📋 Integration Checklist

### Phase 1: Verify Database Schema
- [ ] Verify `snapshots` table exists with columns:
  - `id`, `project_id`, `environment_id`, `label`, `created_at`, `file_count`, `total_bytes`
- [ ] Verify `snapshot_files` table exists with columns:
  - `snapshot_id`, `relative_path`, `content_hash`, `size_bytes`
- [ ] Verify `environments` table exists with columns:
  - `id`, `project_id`, `name`, `created_at`, `updated_at`

### Phase 2: Integrate Code
```bash
# Files already created in your workspace:
src/core/domain/snapshots/
  ├── types.ts           ✅ Created
  ├── repository.ts      ✅ Created
  ├── comparator.ts      ✅ Created
  └── index.ts           ✅ Created

src/core/application/use-cases/
  ├── compare-environments.ts           ✅ Created
  ├── compare-environments.example.ts   ✅ Created
  └── compare-environments.scenarios.ts ✅ Created

Documentation:
  ├── ENVIRONMENT_COMPARISON_README.md  ✅ Created
  ├── IMPLEMENTATION_SUMMARY.md         ✅ Created
  └── QUICK_START.md (this file)        ✅ Created
```

### Phase 3: Basic Usage (Copy & Paste)

```typescript
import { createSnapshotRepository } from './core/domain/snapshots';
import { createCompareEnvironmentsUseCase } from './core/application/use-cases/compare-environments';

// In your module initialization:
const repository = createSnapshotRepository(database);
const compareUseCase = createCompareEnvironmentsUseCase({ 
    snapshotRepository: repository 
});

// Where `database` is your SqliteDatabase instance
```

### Phase 4: First Comparison

**Scenario A: Compare by environment name**
```typescript
const result = await compareUseCase.compareEnvironments({
    projectId: 1,                      // Your project ID
    sourceEnvironmentName: 'local',    // First environment
    targetEnvironmentName: 'prod',     // Second environment
});

console.log(`Changes: +${result.summary.comparisonStats.added} -${result.summary.comparisonStats.deleted}`);
```

**Scenario B: Compare by environment ID**
```typescript
const result = await compareUseCase.compareEnvironments({
    projectId: 1,
    sourceEnvironmentId: 10,           // Environment ID
    targetEnvironmentId: 20,           // Environment ID
});
```

**Scenario C: Compare specific snapshots**
```typescript
const result = await compareUseCase.compareSnapshots({
    sourceSnapshotId: 100,
    targetSnapshotId: 105,
});
```

### Phase 5: Process Results

```typescript
// Access summary statistics
const stats = result.summary.comparisonStats;
console.log(`Files added:    ${stats.added}`);
console.log(`Files deleted:  ${stats.deleted}`);
console.log(`Files modified: ${stats.modified}`);

// Access byte changes
const bytes = result.summary.bytesChanged;
console.log(`+${bytes.added} bytes, -${bytes.deleted} bytes, ±${bytes.modified} bytes`);

// Iterate through file changes
for (const file of result.files) {
    if (file.status === 'modified') {
        console.log(`Changed: ${file.relativePath}`);
        console.log(`  From: ${file.source?.contentHash}`);
        console.log(`  To:   ${file.target?.contentHash}`);
    }
}
```

## 🎯 Key Concepts to Remember

| Concept | Details |
|---------|---------|
| **No Hardcoding** | Environment names are flexible strings, not enums |
| **Multiple Inputs** | Compare by name, ID, or snapshot ID |
| **Flexible Environments** | Works with ANY environment names at runtime |
| **File-Level Comparison** | Each file is compared by path, hash, and size |
| **Statistics** | Added, deleted, modified, unchanged counts + byte impact |

## ❓ Common Questions

### Q: How do I get a list of available environments?
```typescript
const snapshots = await repository.getSnapshotsByProjectId(projectId);
const environments = new Map(
    snapshots.map(s => [s.environmentId, s.environmentName])
);
console.log('Available environments:', Array.from(environments.values()));
```

### Q: What if the environment doesn't exist?
The use case will throw an error with a clear message:
```
"No snapshot found for source environment: [name] in project [id]"
```

### Q: Can I compare environments from different projects?
Currently no - comparisons are within a project. To compare across projects:
```typescript
// Get snapshots from both projects
const snap1 = await repo.getSnapshotsByProjectId(projectId1);
const snap2 = await repo.getSnapshotsByProjectId(projectId2);
// Then manually compare using the comparator if needed
```

### Q: How do I handle large environment snapshots?
Current implementation loads all files into memory. For very large environments (100k+ files):
- Consider paginating results
- Implement streaming comparison
- Filter by file type before comparison

### Q: What if two environments have the same name in different projects?
Not a problem - queries always require `projectId`, so names are scoped to projects.

## 🚀 Example Flows

### Flow 1: Pre-Deployment Validation
```typescript
// 1. Get current prod snapshot
const prodSnapshot = await repo.getLatestSnapshotByEnvironmentName(projectId, 'prod');

// 2. Get staging snapshot
const stagingSnapshot = await repo.getLatestSnapshotByEnvironmentName(projectId, 'staging');

// 3. Compare to validate changes
const result = await compareUseCase.compareSnapshots({
    sourceSnapshotId: prodSnapshot.id,
    targetSnapshotId: stagingSnapshot.id,
});

// 4. Validate changes are expected
if (result.summary.comparisonStats.added > 100) {
    console.warn('⚠️  Large number of additions, proceed carefully');
}

// 5. If OK, deploy
console.log('✅ Pre-deployment validation passed');
```

### Flow 2: Drift Detection
```typescript
// 1. Get two recent prod snapshots
const snapshots = await repo.getSnapshotsByEnvironmentId(prodEnvironmentId);
const [latest, previous] = snapshots.slice(0, 2);

// 2. Compare them
const result = await compareUseCase.compareSnapshots({
    sourceSnapshotId: previous.id,
    targetSnapshotId: latest.id,
});

// 3. Check for unexpected changes
const driftFiles = result.files.filter(f => f.status !== 'unchanged');
if (driftFiles.length > 0) {
    console.warn(`⚠️  DRIFT DETECTED: ${driftFiles.length} files changed`);
    driftFiles.forEach(f => console.log(`  ${f.status}: ${f.relativePath}`));
}
```

### Flow 3: Multi-Environment Audit
```typescript
// Get all environments in a project
const snapshots = await repo.getSnapshotsByProjectId(projectId);
const environments = Array.from(
    new Map(snapshots.map(s => [s.environmentId, s.environmentName])).entries()
);

// Compare each pair
for (let i = 0; i < environments.length; i++) {
    for (let j = i + 1; j < environments.length; j++) {
        const [env1] = environments[i];
        const [env2] = environments[j];
        
        const result = await compareUseCase.compareEnvironments({
            projectId,
            sourceEnvironmentId: env1,
            targetEnvironmentId: env2,
        });
        
        console.log(`${env1} vs ${env2}: ${result.files.length} differences`);
    }
}
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No snapshot found" | Verify environment exists and has at least one snapshot |
| Empty comparison results | Verify snapshot files are populated in database |
| Slow queries | Check database indexes on `snapshots`, `snapshot_files` tables |
| Memory issues with large environments | Implement pagination for file results |
| Type errors | Ensure TypeScript version supports async/await |

## 📚 Learn More

- **Full documentation**: `ENVIRONMENT_COMPARISON_README.md`
- **Implementation details**: `IMPLEMENTATION_SUMMARY.md`
- **Usage examples**: `src/core/application/use-cases/compare-environments.example.ts`
- **Real scenarios**: `src/core/application/use-cases/compare-environments.scenarios.ts`

## ✅ You're Ready!

You now have a complete, flexible, non-hardcoded environment comparison system that works with ANY environments at runtime. 

**Key reminders:**
- Environment names are just strings - completely flexible
- Use multiple comparison methods (name, ID, or snapshot ID)
- Always check for errors when environments don't exist
- Process results to find added, deleted, or modified files

Happy comparing! 🎉
