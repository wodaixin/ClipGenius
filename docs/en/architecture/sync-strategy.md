# Sync Strategy

## Three Storage Layers

| Layer | Storage | Scope | Persistence |
|---|---|---|---|
| React state | `AppContext.items` | Current session | Lost on refresh |
| IndexedDB | `idb` database | Browser | Permanent until cleared |
| Firestore | Firebase cloud | All user devices | Permanent |

## SyncEngine Singleton

All sync decisions go through the `syncEngine` singleton in `src/lib/syncEngine.ts`.

### State Machine Per Item

Each item has a `SyncState` tracked in `localStorage["ClipGenius:sync"]`:

```
[unknown] ──local write──► [pending] ──Firestore ack──► [synced]
                              │
                              │ (cloud newer)
                              ▼
                          [conflict]
```

### Write Path

```typescript
async writeWithSync(item: PasteItem, uid: string, options?) {
  const nextRev = (item.syncRev ?? 0) + 1;
  const updated = { ...item, updatedAt: new Date(), syncRev: nextRev };

  // 1. IndexedDB (blocking — UI waits for this)
  await savePaste(updated);

  // 2. Track pending state
  this.setSyncState(updated.id, {
    status: 'pending',
    localUpdatedAt: new Date(),
    localSyncRev: nextRev,
    pendingCloudRev: nextRev,
    retryCount: 0,
  });

  // 3. Firestore write (fire-and-forget)
  this.writeToCloud(updated, uid, options?.isDeletion).catch(console.error);
}
```

### Cloud Change Handler

When `onSnapshot` fires with a remote document:

```typescript
handleCloudChange(cloudItem): { accepted: boolean } {
  const local = this.getSyncState(id);

  if (local?.status === 'pending') {
    if (cloudRev < pendingRev)  return { accepted: false };  // reject cloud
    if (cloudRev === pendingRev) { markSynced(); return { accepted: true }; }
    // cloudRev > pendingRev
    markConflict(); return { accepted: true };  // cloud wins, local lost
  }

  if (cloudRev > localRev) {
    markSynced(); return { accepted: true };  // cloud wins
  }
  return { accepted: false };  // local is newer
}
```

### Retry Logic

```typescript
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // ms

// writeToCloud catches errors and retries if:
isRetryable = msg.includes('RESOURCE_EXHAUSTED') ||
               msg.includes('ABORTED') ||
               msg.includes('network');
```

### Stale Pending Cleanup

On `syncEngine` instantiation:

```typescript
// Remove pending states older than 60 seconds
const cutoff = Date.now() - 60_000;
for (const [id, state] of Object.entries(this.store.states)) {
  if (state.status === 'pending' && state.localUpdatedAt < cutoff) {
    state.status = 'conflict';
    state.lastError = 'Stale pending — cleanup on startup';
  }
}
```

### Post-Login Migration

```typescript
async migrateLocalItems(uid: string) {
  // Push items with syncRev === 0 to Firestore
  // Skip: deleted items, already-synced, and video items (too large)
  for (const item of all) {
    if (item.userId && item.userId !== uid) continue;
    if (item.isDeleted) continue;
    if ((item.syncRev ?? 0) > 0) continue;
    if (item.type === 'video') continue;
    await this.writeToCloud({ ...item, userId: uid }, uid, false);
  }
}
```
