# Phase 2.1: Refactoring process.chdir() to Absolute Paths

## Analysis Summary

### Current Issues (Identified)

**Files using `process.chdir()`:**
1. `src/cli/commands/react-command.ts` - Line 56
2. `src/cli/commands/vue-command.ts` - Line 56
3. `src/cli/commands/nextjs-command.ts` - Line 56

**Files using `process.cwd()` as projectRoot:**
1. `src/cli/commands/base-framework-command.ts` - Line 364
2. `src/cli/commands/check.ts` - Line 27 (join with process.cwd())
3. `src/cli/commands/remove.ts` - Line 12
4. `src/cli/commands/installed.ts` - Line 11

### Security/Reliability Problems

1. **Global State Mutation**: `process.chdir()` modifies global process state
2. **Rollback Failure**: If error occurs after chdir, directory remains changed
3. **Relative Path Assumptions**: Code written with assumption about cwd() being correct
4. **Concurrency Issues**: Multiple promises could interfere with each other's cwd
5. **Test Mocking Required**: Tests must mock process.chdir (see test files)

### Solution Architecture

**Principle**: Pass `projectRoot` as explicit parameter, never use process.chdir()

#### Phase 1: Framework Command Refactoring

**react-command.ts, vue-command.ts, nextjs-command.ts**

Before:
```typescript
const newProjectPath = await metadata.createProject(...)
process.chdir(newProjectPath)  // ❌ Global state mutation
projectRoot = newProjectPath
```

After:
```typescript
const newProjectPath = await metadata.createProject(...)
// ✅ Return both old and new project roots, caller decides what to do
// No process.chdir() call - pass projectRoot down the chain
```

The key insight: `getOrCreateContext()` should **always return the actual projectRoot to use**, not modify global state.

**Impact**:
- Execute() method in base-framework-command.ts needs to:
  1. Call getOrCreateContext(projectRoot, language)
  2. Use returned context.projectRoot (or extract from context)
  3. Pass this through to installer.install()

#### Phase 2: Context and Installer Updates

**ProjectContext Type**:
- Already has `projectRoot` field ✓
- Pass this through entire flow

**Installer.install() method**:
- Already receives `ctx: ProjectContext` ✓
- Use `ctx.projectRoot` instead of any process.cwd() assumptions
- All filesystem operations use `ctx.projectRoot`

**Pattern**: Use `path.resolve(ctx.projectRoot, relativePath)` for all file operations

#### Phase 3: Detector Updates

**detector.ts**:
- `detectContext(projectRoot)` - already takes projectRoot parameter ✓
- Ensure all file reads use absolute paths

#### Phase 4: Filesystem Operations Audit

**Key Files to Review**:
1. `src/utils/fs-helpers.ts`
2. `src/utils/fs-adapter.ts`
3. `src/core/config-writer.ts`
4. `src/core/backup-manager.ts`
5. All plugin config files

**For each filesystem operation**:
- Replace relative path assumptions with absolute paths
- Use `path.resolve(projectRoot, ...)` pattern
- Ensure no implicit process.cwd() dependencies

#### Phase 5: Snapshot/Rollback System

**New Utility: `src/core/project-context-snapshot.ts`**

```typescript
interface ProjectSnapshot {
  projectRoot: string
  timestamp: number
  fsState: Map<string, string> // filename -> content
}

class ProjectContextSnapshot {
  static async createSnapshot(
    projectRoot: string,
    fsAdapter: IFileSystemAdapter
  ): Promise<ProjectSnapshot>
  
  static async restoreSnapshot(
    snapshot: ProjectSnapshot,
    fsAdapter: IFileSystemAdapter
  ): Promise<void>
}
```

**Usage in Installer**:
```typescript
const snapshot = await ProjectContextSnapshot.createSnapshot(
  ctx.projectRoot,
  ctx.fsAdapter
)
try {
  // Installation...
} catch (error) {
  await ProjectContextSnapshot.restoreSnapshot(snapshot, ctx.fsAdapter)
  throw error
}
```

## Implementation Steps

### Step 1: Fix react-command.ts, vue-command.ts, nextjs-command.ts
- Remove process.chdir() calls
- Ensure getOrCreateContext() returns correct projectRoot
- Add assertion/type to ensure ProjectContext has projectRoot

### Step 2: Update base-framework-command.ts
- Keep using process.cwd() as initial projectRoot (fine for CLI entry point)
- Pass through entire flow without modification
- Ensure performInstallation() receives correct projectRoot via ctx

### Step 3: Audit and update all installer operations
- Use ctx.projectRoot consistently
- Update all path.resolve() calls
- Update all file operation calls

### Step 4: Update detector.ts
- Verify all operations use absolute paths
- No implicit process.cwd() assumptions

### Step 5: Add snapshot system
- Create project-context-snapshot.ts
- Integrate into installer.ts for rollback safety

### Step 6: Update tests
- Remove process.chdir() mocks
- Add tests verifying absolute paths used
- Add rollback scenario tests

## Test Strategy

**Existing Tests to Update**:
- `tests/unit/cli/commands/install-nextjs.test.ts` - Remove chdir mock
- `tests/unit/cli/commands/install-vue.test.ts` - Remove chdir mock
- `tests/unit/cli/commands/framework-commands.test.ts` - Remove chdir mock

**New Tests to Add**:
- Verify no process.chdir() called
- Verify absolute paths used
- Verify projectRoot parameter flows through
- Verify rollback restores state

## Timeline

- **Step 1 (Commands)**: 1h
- **Step 2 (Execute Flow)**: 0.5h
- **Step 3 (Installer Audit)**: 1.5h
- **Step 4 (Detector)**: 0.5h
- **Step 5 (Snapshot System)**: 1h
- **Step 6 (Tests)**: 0.5h

**Total: 5 hours** (vs 4h estimated, but includes snapshot system)

## Success Criteria

- [ ] Zero `process.chdir()` calls in src/
- [ ] Zero `process.cwd()` calls except at CLI entry point
- [ ] All filesystem operations use absolute paths
- [ ] Snapshot system functional for rollback
- [ ] All tests passing (no regressions)
- [ ] No mocks of process.chdir() in tests
- [ ] Type system enforces projectRoot usage

## Rollback Capability

After Phase 2.1 + Phase 2.2 (atomic installation):
- Can create full project snapshot before installation
- Can restore all files if installation fails
- No global state changes cause issues
- Process can be re-invoked multiple times safely
