# Sync

ClipGenius uses a three-layer storage model: **in-memory React state** → **IndexedDB (local)** → **Firestore (cloud)**.

## Write Path

Every state change follows this path:

```
User action (add/update/delete)
    ↓
React state update (immediate — UI never waits for network)
    ↓
IndexedDB write (via src/lib/db.ts — synchronous in the async call)
    ↓
syncEngine.writeWithSync() fires (fire-and-forget)
    ↓
Firestore write with retry logic
```

The `syncEngine` singleton (`src/lib/syncEngine.ts`) manages the full sync lifecycle.

## Read Path

On app load:

```
getPastes() from IndexedDB
    ↓
Set React state
```

Firestore `onSnapshot` (via `useFirestoreSync`) fires on two occasions:
1. Remote changes from another device (cloud → local)
2. Acknowledgement of a local write (local → cloud confirmed)

## Conflict Resolution: "Cloud Wins"

The `syncEngine` tracks a `syncRev` (monotonically increasing integer) on every write. Both client (`syncRev + 1`) and Firestore (`increment(1)` server-side) increment it.

When `onSnapshot` fires with a remote change:

| Local state | Cloud syncRev | Outcome |
|---|---|---|
| `pending` (write in progress) | < pendingRev | Cloud rejected — local write continues |
| `pending` | = pendingRev | Cloud acknowledged — marked `synced` |
| `pending` | > pendingRev | Cloud wins — local write abandoned |
| `synced` or unknown | > localRev | Cloud wins — local updated |
| `synced` or unknown | <= localRev | Cloud rejected — local kept |

This is a last-write-wins model appropriate for a clipboard manager where data loss is annoying but never catastrophic.

## Retry Logic

Failed Firestore writes are retried up to 2 times with exponential delays (1s, 3s). Only `RESOURCE_EXHAUSTED`, `ABORTED`, and network errors are retried. After max retries, the item is marked `conflict`.

## Soft Delete

Items are never hard-deleted. Instead:

```typescript
{ isDeleted: true, deletedAt: new Date(), syncRev: syncRev + 1 }
```

Soft-deleted items are filtered out of the UI (`items.filter(p => !p.isDeleted)`) but remain in both IndexedDB and Firestore. This ensures the sync engine can properly reconcile deletions across devices without needing Firestore recursive delete permissions.

## Stale Pending Cleanup

On app startup, any `pending` state older than 60 seconds is marked `conflict`. This handles crashes or force-closes during a sync.

## Post-Login Migration

When a guest logs in, `syncEngine.migrateLocalItems()` pushes all locally-created items (those with `syncRev === 0` and matching `userId`) to Firestore. Video items (`type === "video"`) are skipped from migration due to their large size.

## Cross-Tab Sync

See [Cross-Tab Sync](../architecture/cross-tab-sync.md) for details on how changes are broadcast across browser tabs via `BroadcastChannel` and `localStorage` fallback.
