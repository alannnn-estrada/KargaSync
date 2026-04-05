# Architecture Diagram: Environment Comparison

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USE CASE LAYER                                   │
│         createCompareEnvironmentsUseCase()                              │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  compareEnvironments(input: CompareEnvironmentsInput)            │   │
│  │  - Resolves source environment (name/ID/snapshot)               │   │
│  │  - Resolves target environment (name/ID/snapshot)               │   │
│  │  - Calls comparator.compare()                                   │   │
│  │  - Returns EnvironmentComparisonResult                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────┬─────────────────────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                                         │
│                                                                           │
│  ┌─────────────────────────────────────┬──────────────────────────────┐ │
│  │  Repository                         │  Comparator                  │ │
│  │  ────────────────────────────────   │  ──────────────────────────  │ │
│  │  • getSnapshotById()                │  • compare()                 │ │
│  │  • getLatestSnapshotBy...()         │    - Uses DiffEngine         │ │
│  │  • getSnapshotsByEnvironmentId()    │    - Compares files          │ │
│  │  • getSnapshotsByProjectId()        │    - Calculates stats        │ │
│  │  • getSnapshotsByEnvironmentName()  │    - Returns typed results   │ │
│  │                                     │                              │ │
│  └─────────────────────────────────────┴──────────────────────────────┘ │
│                                                                           │
│  Types:                                                                  │
│  • EnvironmentSnapshot                                                  │
│  • SnapshotFileEntry                                                    │
│  • SnapshotFileComparison                                               │
│  • EnvironmentComparisonResult                                          │
│  • EnvironmentComparisonSummary                                         │
└──────────────────────┬─────────────────────────────────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL LAYER                                         │
│                                                                           │
│  ┌──────────────────────┐        ┌──────────────────────────────────┐   │
│  │   DiffEngine         │        │   SqliteDatabase                 │   │
│  │   (Shared Utils)     │        │   (DB Connection)                │   │
│  │                      │        │                                  │   │
│  │ • compare()          │        │ • prepare()                      │   │
│  │ • sourceKey()        │        │ • run()                          │   │
│  │ • targetKey()        │        │ • get()                          │   │
│  │ • areEqual()         │        │ • all()                          │   │
│  └──────────────────────┘        └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Comparing Two Environments

```
User Request
     │
     │ compareEnvironments({
     │     projectId: 1,
     │     sourceEnvironmentName: 'local',
     │     targetEnvironmentName: 'prod'
     │ })
     ▼
┌─────────────────────────────────────┐
│  Use Case - Resolve Environments    │
│  ─────────────────────────────────  │
│  1. Get source snapshot by name     │───┐
│  2. Get target snapshot by name     │   │
│  3. Pass to comparator              │   │
└─────────────────────────────────────┘   │
                                         │
                                         ▼
                        ┌────────────────────────────────┐
                        │  Repository Queries            │
                        │  ────────────────────────────  │
                        │  SELECT s.*, e.name            │
                        │  FROM snapshots s              │
                        │  JOIN environments e           │
                        │  WHERE e.name = ?              │
                        │  ORDER BY s.created_at DESC    │
                        │  LIMIT 1                       │
                        └────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Comparator - Compare Snapshots                             │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  1. Create DiffEngine with config:                          │
│     • sourceKey: (file) => file.relativePath               │
│     • targetKey: (file) => file.relativePath               │
│     • areEqual: (s, t) => hash & size match                 │
│                                                              │
│  2. Call diffEngine.compare()                               │
│     • Build sourceByKey Map                                 │
│     • Iterate target files                                  │
│     • Classify: added/deleted/modified/unchanged           │
│                                                              │
│  3. Post-process results:                                   │
│     • Calculate byte changes                                │
│     • Build summary statistics                              │
│     • Format output                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                ┌──────────────────────────────┐
                │  EnvironmentComparisonResult │
                │  ────────────────────────────│
                │  summary: {                  │
                │    sourceSnapshot: {...}     │
                │    targetSnapshot: {...}     │
                │    comparisonStats: {...}    │
                │    bytesChanged: {...}       │
                │  }                           │
                │  files: [{                   │
                │    relativePath: ...,        │
                │    status: 'added|...' ,    │
                │    source?: {...}            │
                │    target?: {...}            │
                │  }, ...]                     │
                └──────────────────────────────┘
```

## File Comparison States

```
Scenario: Comparing 'local' vs 'prod'

Local Files              Prod Files
     │                        │
     ├─ src/main.ts          ├─ src/main.ts
     ├─ src/util.ts    ──────┼─ src/util.ts
     ├─ config.json    ──────┼─ config.json (different hash)
     ├─ old-file.ts          │
     │                        ├─ new-file.ts
     │                        └─ another.ts
     
Results:
  status: 'unchanged' → src/main.ts (same hash & size)
  status: 'modified'  → config.json (different hash)
  status: 'deleted'   → old-file.ts (only in source)
  status: 'added'     → new-file.ts, another.ts (only in target)
```

## Query Patterns Supported

```
┌────────────────────────────────────────────────────────────────┐
│ QUERY PATTERN 1: By Environment Name (Most User-Friendly)     │
│                                                                │
│ Input: projectId, sourceEnvironmentName, targetEnvironmentName│
│ Query: SELECT ... WHERE project_id = ? AND name = ?          │
│ Benefit: Works with ANY environment names at runtime          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ QUERY PATTERN 2: By Environment ID (Programmatic)              │
│                                                                │
│ Input: projectId, sourceEnvironmentId, targetEnvironmentId    │
│ Query: SELECT ... WHERE environment_id = ?                    │
│ Benefit: Direct reference to environment                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ QUERY PATTERN 3: By Snapshot ID (Historical Analysis)          │
│                                                                │
│ Input: sourceSnapshotId, targetSnapshotId                     │
│ Query: SELECT ... WHERE snapshot_id = ?                       │
│ Benefit: Compare specific points in time                       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ QUERY PATTERN 4: Discover All Snapshots (Audit)                │
│                                                                │
│ Input: projectId                                              │
│ Query: SELECT ... WHERE project_id = ? ORDER BY ...          │
│ Benefit: Find all environments and snapshots                   │
└────────────────────────────────────────────────────────────────┘
```

## No Hardcoding - Flexibility Design

```
❌ OLD APPROACH (Hardcoded)
─────────────────────────────
enum EnvironmentKind {
  LOCAL = 'local',
  TEST = 'test',
  PROD = 'prod',
}

Limited to 3 types
Must update code to add new environments
Type-safe but inflexible


✅ NEW APPROACH (Flexible)
─────────────────────────────
type EnvironmentName = string;

Environment names stored as strings in database:
  - 'local'
  - 'prod'
  - 'test'
  - 'staging'
  - 'canary'
  - 'client-site-1'
  - 'client-site-2'
  - ... ANY custom names!

No code changes needed
Complete runtime flexibility
Type-safe through interfaces, not enums
```

## Component Dependencies

```
Use Case
    ├── Repository (data access)
    │   └── SqliteDatabase (query execution)
    │
    └── Comparator (comparison logic)
        └── DiffEngine (file comparison)


Use Case → Repository → SqliteDatabase
    ↓           ↓
    └─── Comparator ─── DiffEngine
```

## Type Safety Flow

```
Input (Runtime)
    ↓
CompareEnvironmentsInput (Interface)
    ↓
Validation in Use Case
    ├── Resolve environments
    ├── Check for null/not found
    └── Throw clear errors
    ↓
EnvironmentSnapshot (Type-safe)
    ├── SnapshotFileEntry[]
    └── EnvironmentSnapshot metadata
    ↓
Comparator (Type-safe comparison)
    ├── DiffEngine<SnapshotFileEntry>
    └── Returns SnapshotFileComparison[]
    ↓
EnvironmentComparisonResult (Output)
    ├── EnvironmentComparisonSummary
    └── SnapshotFileComparison[]
```

## Success Path Example

```
compareEnvironments({
    projectId: 1,
    sourceEnvironmentName: 'local',
    targetEnvironmentName: 'prod'
})
    │
    ├─ Repository.getLatestSnapshotByEnvironmentName(1, 'local')
    │  └─ Query: SELECT ... WHERE project_id=1 AND name='local'
    │     └─ Return: EnvironmentSnapshot { id: 10, files: [...] }
    │
    ├─ Repository.getLatestSnapshotByEnvironmentName(1, 'prod')
    │  └─ Query: SELECT ... WHERE project_id=1 AND name='prod'
    │     └─ Return: EnvironmentSnapshot { id: 20, files: [...] }
    │
    ├─ Comparator.compare()
    │  └─ DiffEngine compares file lists
    │     └─ Returns: added=67, deleted=12, modified=5, unchanged=233
    │
    └─ Return: EnvironmentComparisonResult {
        summary: { ... stats ... },
        files: [ ... file comparisons ... ]
       }
```

## Error Path Example

```
compareEnvironments({
    projectId: 1,
    sourceEnvironmentName: 'nonexistent',  ← Not found!
    targetEnvironmentName: 'prod'
})
    │
    ├─ Repository.getLatestSnapshotByEnvironmentName(1, 'nonexistent')
    │  └─ Query returns: null
    │
    └─ Use Case catches error
       └─ Throw: "No snapshot found for source environment: 
              nonexistent in project 1"
```
