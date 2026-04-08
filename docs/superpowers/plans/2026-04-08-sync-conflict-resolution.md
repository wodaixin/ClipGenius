# ClipGenius Sync Conflict Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add version-aware conflict detection and retry logic to the clipboard sync system, replacing the current "last write wins with no detection" model with a `syncRev`-based approach that handles multi-device and multi-tab concurrency correctly.

**Architecture:** Introduce a `SyncEngine` singleton that tracks per-item sync state (`synced | pending | conflict`) in `localStorage`, uses Firestore `increment(1)` for device-independent version numbers, and applies Last-Write-Wins (LWW) conflict resolution guided by `syncRev` comparisons. Soft-delete (`isDeleted`) replaces hard-delete to enable eventual-consistency for `clearUnpinned`. Tab-to-tab sync via `BroadcastChannel` + `localStorage` event ensures in-tab edits are not silently overwritten by `onSnapshot` callbacks from the same device.

**Tech Stack:** TypeScript, React hooks, Firestore (`increment`, `setDoc` with `merge:true`, `onSnapshot`), IndexedDB via `idb`, `localStorage`, `BroadcastChannel` API.

---

## File Map

| Role | File |
|------|------|
| Add new fields to PasteItem + new sync types | `src/types.ts` |
| Export `increment` from firebase.ts | `src/firebase.ts` |
| SyncEngine class + conflict logic | `src/lib/syncEngine.ts` (new) |
| Tab broadcast utilities | `src/lib/tabSync.ts` (new) |
| Rewrite cloud-write helpers with retry + merge | `src/services/sync/dualSync.ts` |
| Integrate conflict detection into Firestore listener | `src/hooks/useFirestoreSync.ts` |
| Integrate soft-delete + SyncEngine into store | `src/hooks/usePasteStore.ts` |
| Integrate soft-delete into AppContext | `src/context/AppContext.tsx` |
| Firestore composite indexes | `firestore.indexes.json` (new) |

---

## Phase 1: Data Model + SyncEngine Core

### Task 1: Add sync fields to PasteItem + new sync types

**Files:**
- Modify: `src/types.ts:15-64`

- [ ] **Step 1: Add new fields to PasteItem interface**

Modify the `PasteItem` interface in `src/types.ts` (lines 15–26) by inserting three new fields after `userId`:

```typescript
export interface PasteItem {
  id: string;
  type: PasteType;
  content: string;
  mimeType: string;
  timestamp: Date;
  suggestedName: string;
  summary?: string;
  isAnalyzing: boolean;
  isPinned?: boolean;
  userId: string;
  // --- new fields below ---
  updatedAt?: Date;       // last modification time, refreshed on every update
  syncRev?: number;        // monotonically increasing version, -1 = never synced
  isDeleted?: boolean;     // soft-delete flag
  deletedAt?: Date;        // soft-delete timestamp
}
```

- [ ] **Step 2: Add SyncState and SyncStore types**

Append to the end of `src/types.ts` (after line 53):

```typescript
/** Local sync status for a single PasteItem */
export type SyncStatus = 'synced' | 'pending' | 'conflict';

/** Tracks the sync state of one PasteItem */
export interface SyncState {
  status: SyncStatus;
  localUpdatedAt: Date;       // the updatedAt of the local version
  localSyncRev: number;      // the syncRev of the local version (-1 if never synced)
  pendingCloudRev?: number;   // the syncRev we are waiting for the cloud to acknowledge
  retryCount: number;         // current retry attempt count
  lastError?: string;         // last error message
}

/** The persisted sync store — lives in localStorage */
export interface SyncStore {
  states: Record<string, SyncState>;
}
```

- [ ] **Step 3: Add `deletedAt` field support to db.ts savePaste**

Verify that `savePaste` in `src/lib/db.ts` uses `db.put(STORE_PASTES, item)`, which is schema-less (no version bump needed) and already handles any additional fields on `PasteItem` automatically. No code change required — `deletedAt` is stored as part of the item object. Add a comment to the `savePaste` function documenting this:

```typescript
/**
 * Persists a PasteItem (including soft-deleted items with isDeleted=true and deletedAt)
 * to IndexedDB. The item may contain additional fields beyond the original schema.
 */
export async function savePaste(item: PasteItem) {
```

Run lint to verify no type errors:
Run: `npm run lint`
Expected: Exit code 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/lib/db.ts
git commit -m "feat(sync): add updatedAt, syncRev, isDeleted fields to PasteItem and add SyncState/SyncStore types"
```

---

### Task 2: Add `increment` export to firebase.ts

**Files:**
- Modify: `src/firebase.ts:3,37`

- [ ] **Step 1: Import and re-export `increment` from firebase/firestore**

In `src/firebase.ts`, update line 3 to include `increment` in the named import, and add it to the exports on line 37.

Line 3 before:
```typescript
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, deleteDoc, updateDoc, serverTimestamp, Timestamp, getDocFromServer } from 'firebase/firestore';
```

Line 3 after:
```typescript
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, deleteDoc, updateDoc, serverTimestamp, Timestamp, getDocFromServer, increment } from 'firebase/firestore';
```

Line 37 before:
```typescript
  Timestamp,
  getDocFromServer
};
```

Line 37 after:
```typescript
  Timestamp,
  getDocFromServer,
  increment
};
```

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 2: Commit**

```bash
git add src/firebase.ts
git commit -m "chore(firebase): re-export increment operator for SyncEngine"
```

---

### Task 3: Create SyncEngine singleton

**Files:**
- Create: `src/lib/syncEngine.ts`

- [ ] **Step 1: Write SyncEngine class with localStorage persistence**

Create `src/lib/syncEngine.ts` with the complete implementation:

```typescript
import {
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from '../firebase';
import { PasteItem, SyncState, SyncStore } from '../types';
import { savePaste } from './db';

const SYNC_STORE_KEY = 'ClipGenius:sync';
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // ms

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Singleton SyncEngine — all sync decisions go through here */
class Engine {
  private store: SyncStore = { states: {} };

  constructor() {
    this.store = this.loadStore();
    this.cleanupStalePending();
  }

  private loadStore(): SyncStore {
    try {
      const raw = localStorage.getItem(SYNC_STORE_KEY);
      return raw ? (JSON.parse(raw) as SyncStore) : { states: {} };
    } catch {
      return { states: {} };
    }
  }

  private persist(): void {
    localStorage.setItem(SYNC_STORE_KEY, JSON.stringify(this.store));
  }

  /** Remove pending states that are stuck (app crash / force-close during sync) */
  private cleanupStalePending(): void {
    const cutoff = Date.now() - 60_000; // 60 seconds
    let changed = false;
    for (const [id, state] of Object.entries(this.store.states)) {
      if (
        state.status === 'pending' &&
        state.localUpdatedAt instanceof Date &&
        state.localUpdatedAt.getTime() < cutoff
      ) {
        state.status = 'conflict';
        state.lastError = 'Stale pending — cleanup on startup';
        changed = true;
      }
    }
    if (changed) this.persist();
  }

  // ---- public read access ----

  getSyncState(id: string): SyncState | undefined {
    return this.store.states[id];
  }

  // ---- state mutation ----

  setSyncState(id: string, state: SyncState): void {
    this.store.states[id] = state;
    this.persist();
  }

  // ---- cloud write with retry ----

  async writeWithSync(
    item: PasteItem,
    uid: string,
    options: { isDeletion?: boolean } = {}
  ): Promise<{ success: boolean }> {
    const now = new Date();
    const nextRev = (item.syncRev ?? 0) + 1;
    const updated: PasteItem = {
      ...item,
      updatedAt: now,
      syncRev: nextRev,
      isDeleted: options.isDeletion ?? item.isDeleted ?? false,
    };

    // 1. Write local (IndexedDB) immediately — UI never waits for network
    await savePaste(updated);

    // 2. Track pending state
    this.setSyncState(updated.id, {
      status: 'pending',
      localUpdatedAt: now,
      localSyncRev: nextRev,
      pendingCloudRev: nextRev,
      retryCount: 0,
    });

    // 3. Fire-and-forget cloud write
    this.writeToCloud(updated, uid, options.isDeletion ?? false).catch((err) => {
      console.error('[SyncEngine] writeToCloud threw unexpectedly:', err);
    });

    return { success: true };
  }

  private async writeToCloud(
    item: PasteItem,
    uid: string,
    isDeletion: boolean,
    attempt = 0
  ): Promise<void> {
    const id = item.id;
    const state = this.getSyncState(id);

    try {
      if (isDeletion) {
        await updateDoc(doc(db, `users/${uid}/pastes`, id), {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          syncRev: increment(1),
        });
      } else {
        await setDoc(
          doc(db, `users/${uid}/pastes`, id),
          {
            ...item,
            timestamp: item.timestamp,          // keep original creation time
            updatedAt: serverTimestamp(),
            syncRev: increment(1),
          },
          { merge: true }                      // KEY: merge not overwrite
        );
      }

      // Success — update to synced
      this.setSyncState(id, {
        status: 'synced',
        localUpdatedAt: item.updatedAt!,
        localSyncRev: item.syncRev!,
        pendingCloudRev: undefined,
        retryCount: 0,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const isRetryable =
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('ABORTED') ||
        msg.includes('network');

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] ?? 3000;
        await sleep(delay);
        return this.writeToCloud(item, uid, isDeletion, attempt + 1);
      }

      // Non-retryable or max retries exceeded → conflict
      this.setSyncState(id, {
        status: 'conflict',
        localUpdatedAt: item.updatedAt!,
        localSyncRev: item.syncRev!,
        pendingCloudRev: undefined,
        retryCount: attempt + 1,
        lastError: msg,
      });
    }
  }

  // ---- cloud change handler (called from useFirestoreSync) ----

  handleCloudChange(
    cloudItem: PasteItem
  ): { accepted: boolean } {
    const id = cloudItem.id;
    const cloudRev = cloudItem.syncRev ?? 0;
    const local = this.getSyncState(id);

    // Case 1: local is pending
    if (local?.status === 'pending') {
      const pendingRev = local.pendingCloudRev ?? 0;

      if (cloudRev < pendingRev) {
        // Cloud hasn't caught up to our pending write — reject cloud
        return { accepted: false };
      }
      if (cloudRev === pendingRev) {
        // Cloud acknowledged our write — synced
        this.setSyncState(id, {
          status: 'synced',
          localUpdatedAt: cloudItem.updatedAt!,
          localSyncRev: cloudRev,
          pendingCloudRev: undefined,
          retryCount: 0,
        });
        return { accepted: true };
      }
      // cloudRev > pendingRev: cloud has a newer change from a 3rd party
      this.setSyncState(id, {
        status: 'conflict',
        localUpdatedAt: local.localUpdatedAt,
        localSyncRev: local.localSyncRev,
        pendingCloudRev: undefined,
        retryCount: 0,
        lastError: 'Local pending overwritten by cloud',
      });
      return { accepted: true }; // accept cloud (our write is lost)
    }

    // Case 2: local is synced or unknown
    const localRev = local?.localSyncRev ?? -1;
    if (cloudRev > localRev) {
      this.setSyncState(id, {
        status: 'synced',
        localUpdatedAt: cloudItem.updatedAt!,
        localSyncRev: cloudRev,
        pendingCloudRev: undefined,
        retryCount: 0,
      });
      return { accepted: true };
    }
    // cloudRev <= localRev: local is newer or equal — reject cloud
    return { accepted: false };
  }

  /** Reset engine state — used by tests only */
  reset(): void {
    this.store = { states: {} };
    this.persist();
  }
}

// Named export so tests can import the singleton
export const syncEngine = new Engine();
```

- [ ] **Step 2: Verify no type errors**

Run: `npm run lint`
Expected: Exit code 0, no errors related to syncEngine.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/syncEngine.ts
git commit -m "feat(sync): add SyncEngine singleton with localStorage persistence and LWW conflict resolution"
```

---

## Phase 2: useFirestoreSync Conflict Detection

### Task 4: Rewrite useFirestoreSync to use handleCloudChange

**Files:**
- Modify: `src/hooks/useFirestoreSync.ts:1-68`

- [ ] **Step 1: Rewrite the hook to delegate conflict detection to SyncEngine**

Replace the entire contents of `src/hooks/useFirestoreSync.ts` with:

```typescript
import { useEffect } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "../firebase";
import { savePaste, deletePaste } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { PasteItem } from "../types";
import { syncEngine } from "../lib/syncEngine";

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return (val as Timestamp).toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return new Date();
}

export function useFirestoreSync() {
  const { user } = useAuth();
  const { setItems } = useAppContext();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/pastes`),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const docData = change.doc.data();

          const cloudItem: PasteItem = {
            ...docData,
            timestamp: toDate(docData.timestamp),
            updatedAt: toDate(docData.updatedAt ?? docData.timestamp),
            syncRev: docData.syncRev ?? 0,
            isDeleted: docData.isDeleted ?? false,
            deletedAt: docData.deletedAt ? toDate(docData.deletedAt) : undefined,
          } as PasteItem;

          // --- soft-delete path ---
          if (cloudItem.isDeleted && cloudItem.deletedAt) {
            // Remove from UI immediately (optimistic)
            setItems((prev: PasteItem[]) =>
              prev.filter((i) => i.id !== cloudItem.id)
            );
            // Remove from IndexedDB
            await deletePaste(cloudItem.id);
            // Update sync engine state to synced
            syncEngine.setSyncState(cloudItem.id, {
              status: 'synced',
              localUpdatedAt: cloudItem.deletedAt,
              localSyncRev: cloudItem.syncRev ?? 0,
              retryCount: 0,
            });
            continue;
          }

          if (change.type === "added" || change.type === "modified") {
            const { accepted } = syncEngine.handleCloudChange(cloudItem);

            if (accepted) {
              await savePaste(cloudItem);
              setItems((prev: PasteItem[]) => {
                const idx = prev.findIndex((i) => i.id === cloudItem.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = cloudItem;
                  return next;
                }
                return [cloudItem, ...prev];
              });
            }
            // accepted === false → local has a newer pending write; skip
          } else if (change.type === "removed") {
            // Firestore hard-delete should not happen with our soft-delete model,
            // but handle it gracefully
            setItems((prev: PasteItem[]) =>
              prev.filter((i) => i.id !== change.doc.id)
            );
            await deletePaste(change.doc.id);
          }
        }
      },
      (error) => {
        console.error("Firestore sync error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, setItems]);
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFirestoreSync.ts
git commit -m "feat(sync): delegate conflict detection to SyncEngine in useFirestoreSync"
```

---

## Phase 3: Soft-Delete + usePasteStore Integration

### Task 5: Rewrite usePasteStore to use SyncEngine for all cloud writes

**Files:**
- Modify: `src/hooks/usePasteStore.ts:1-169`

- [ ] **Step 1: Replace dualSync imports with SyncEngine**

Replace lines 1–16 (imports) of `src/hooks/usePasteStore.ts` with:

```typescript
import { useState, useCallback, useMemo } from "react";
import { PasteItem } from "../types";
import {
  savePaste,
  deletePaste as deleteLocalPaste,
} from "../lib/db";
import { syncEngine } from "../lib/syncEngine";
import { copyItemToClipboard, downloadItem as downloadItemUtil } from "../services/clipboard/clipboardUtils";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
```

- [ ] **Step 2: Rewrite addItem to set initial syncRev**

Find the `addItem` callback (around line 50) and replace it with:

```typescript
  const addItem = useCallback(
    async (item: PasteItem) => {
      const newItem: PasteItem = {
        ...item,
        updatedAt: new Date(),
        syncRev: 0,
      };
      await savePaste(newItem);
      setItems((prev: PasteItem[]) => [newItem, ...prev]);
      if (user?.uid) {
        syncEngine.writeWithSync(newItem, user.uid);
      }
    },
    [user, setItems]
  );
```

- [ ] **Step 3: Rewrite updateItem to increment syncRev**

Find the `updateItem` callback (around line 59) and replace it with:

```typescript
  const updateItem = useCallback(
    async (updated: PasteItem) => {
      const updatedWithSync: PasteItem = {
        ...updated,
        updatedAt: new Date(),
        syncRev: (updated.syncRev ?? 0) + 1,
      };
      await savePaste(updatedWithSync);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === updated.id ? updatedWithSync : i))
      );
      if (user?.uid) {
        syncEngine.writeWithSync(updatedWithSync, user.uid);
      }
    },
    [user, setItems]
  );
```

- [ ] **Step 4: Rewrite deleteItem to use soft-delete**

Find the `deleteItem` callback (around line 66) and replace it with:

```typescript
  const deleteItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      // Soft-delete: mark isDeleted instead of hard-deleting
      const deletedItem: PasteItem = {
        ...item,
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
        syncRev: (item.syncRev ?? 0) + 1,
      };

      await savePaste(deletedItem);
      setItems((prev: PasteItem[]) => prev.filter((i) => i.id !== id));

      if (user?.uid) {
        syncEngine.writeWithSync(deletedItem, user.uid, { isDeletion: true });
      }
    },
    [user, items, setItems]
  );
```

- [ ] **Step 5: Rewrite clearUnpinned to use soft-delete (no longer two-phase)**

Find the `clearUnpinned` callback (around line 85) and replace it with:

```typescript
  const clearUnpinned = useCallback(async () => {
    const unpinned = items.filter((i) => !i.isPinned && !i.isDeleted);
    if (unpinned.length === 0) return;

    const deletedItems: PasteItem[] = unpinned.map((item) => ({
      ...item,
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
      syncRev: (item.syncRev ?? 0) + 1,
    }));

    // Optimistic: remove from UI immediately
    setItems((prev: PasteItem[]) =>
      prev.filter((i) => !deletedItems.some((d) => d.id === i.id))
    );

    // Persist soft-delete state to IndexedDB
    for (const item of deletedItems) {
      await savePaste(item);
    }

    // Fan out async cloud writes
    if (user?.uid) {
      for (const item of deletedItems) {
        syncEngine.writeWithSync(item, user.uid, { isDeletion: true });
      }
    }
  }, [user, items, setItems]);
```

- [ ] **Step 6: Verify lint**

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePasteStore.ts
git commit -m "feat(sync): replace hard-delete with soft-delete and route all cloud writes through SyncEngine"
```

---

## Phase 4: Tab Synchronization

### Task 6: Create tabSync broadcast module

**Files:**
- Create: `src/lib/tabSync.ts`

- [ ] **Step 1: Write tabSync module with BroadcastChannel + localStorage dual-channel**

Create `src/lib/tabSync.ts`:

```typescript
import { PasteItem } from '../types';

const TAB_CHANNEL = 'ClipGenius:tab-sync';
const EDITING_KEY = 'ClipGenius:editing';

type TabMessage =
  | { type: 'item-updated'; item: PasteItem; fromTabId: string }
  | { type: 'item-deleted'; id: string; fromTabId: string };

let currentTabId: string;
let channel: BroadcastChannel | null = null;

// In-memory set of items currently being edited in this tab
const editingIds = new Set<string>();

function getOrCreateTabId(): string {
  if (!currentTabId) {
    currentTabId = crypto.randomUUID();
  }
  return currentTabId;
}

/**
 * Initialise cross-tab sync. Call once at app startup.
 * Returns a cleanup function to call on unmount.
 */
export function initTabSync(
  onItemUpdated: (item: PasteItem) => void,
  onItemDeleted: (id: string) => void
): () => void {
  const tabId = getOrCreateTabId();

  // --- BroadcastChannel (primary, does not fire on sender) ---
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(TAB_CHANNEL);
    channel.onmessage = (event: MessageEvent<TabMessage>) => {
      const msg = event.data;
      if (msg.fromTabId === tabId) return; // ignore own messages
      if (msg.type === 'item-updated') onItemUpdated(msg.item);
      if (msg.type === 'item-deleted') onItemDeleted(msg.id);
    };
  }

  // --- localStorage event (fires on sender too; Safari-safe fallback) ---
  const onStorage = (event: StorageEvent) => {
    if (event.key !== TAB_CHANNEL || !event.newValue) return;
    try {
      const msg: TabMessage = JSON.parse(event.newValue);
      if (msg.fromTabId === tabId) return;
      if (msg.type === 'item-updated') onItemUpdated(msg.item);
      if (msg.type === 'item-deleted') onItemDeleted(msg.id);
    } catch {
      // ignore malformed messages
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}

/** Broadcast an item update to all other tabs */
export function broadcastItemUpdated(item: PasteItem): void {
  const tabId = getOrCreateTabId();
  const msg: TabMessage = { type: 'item-updated', item, fromTabId: tabId };
  channel?.postMessage(msg);
  // localStorage fallback + trigger for sender tab
  try {
    localStorage.setItem(TAB_CHANNEL, JSON.stringify(msg));
    // Immediately remove so the same message fires storage event again on next change
    localStorage.removeItem(TAB_CHANNEL);
  } catch {
    // ignore quota errors
  }
}

/** Broadcast a deletion to all other tabs */
export function broadcastItemDeleted(id: string): void {
  const tabId = getOrCreateTabId();
  const msg: TabMessage = { type: 'item-deleted', id, fromTabId: tabId };
  channel?.postMessage(msg);
  try {
    localStorage.setItem(TAB_CHANNEL, JSON.stringify(msg));
    localStorage.removeItem(TAB_CHANNEL);
  } catch {
    // ignore
  }
}

/** Mark an item as being edited locally (protects against self-overwrite) */
export function markItemEditing(id: string): void {
  editingIds.add(id);
  try {
    const raw = localStorage.getItem(EDITING_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(id)) {
      set.push(id);
      localStorage.setItem(EDITING_KEY, JSON.stringify(set));
    }
  } catch {
    // ignore
  }
}

/** Remove editing protection when user saves or cancels */
export function unmarkItemEditing(id: string): void {
  editingIds.delete(id);
  try {
    const raw = localStorage.getItem(EDITING_KEY);
    if (!raw) return;
    const set: string[] = JSON.parse(raw);
    const next = set.filter((x) => x !== id);
    localStorage.setItem(EDITING_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** Returns true if ANY open tab (including this one) is currently editing this item */
export function isItemEditing(id: string): boolean {
  if (editingIds.has(id)) return true;
  try {
    const raw = localStorage.getItem(EDITING_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(id);
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Verify lint**

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add src/lib/tabSync.ts
git commit -m "feat(tab-sync): add BroadcastChannel + localStorage cross-tab broadcast module"
```

---

### Task 7: Wire tabSync into usePasteStore and useFirestoreSync

**Files:**
- Modify: `src/hooks/usePasteStore.ts` (startEditing, saveEdit)
- Modify: `src/hooks/useFirestoreSync.ts` (integration)

- [ ] **Step 1: Add tabSync imports to usePasteStore and wire into startEditing/saveEdit**

At the top of `src/hooks/usePasteStore.ts`, add the import:

```typescript
import { broadcastItemUpdated, markItemEditing, unmarkItemEditing } from "../lib/tabSync";
```

Find `startEditing` and add the `markItemEditing` call:

```typescript
  const startEditing = useCallback((item: PasteItem) => {
    setEditingItemId(item.id);
    setEditName(item.suggestedName);
    setEditSummary(item.summary || "");
    markItemEditing(item.id);
  }, []);
```

Find `saveEdit` and add `broadcastItemUpdated` + `unmarkItemEditing`:

```typescript
  const saveEdit = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, suggestedName: editName, summary: editSummary };
      unmarkItemEditing(id);
      await updateItem(updated);
      // Broadcast to other tabs so they update their local state
      broadcastItemUpdated(updated);
      setEditingItemId(null);
    },
    [items, editName, editSummary, updateItem]
  );
```

Also add `broadcastItemDeleted` to `deleteItem` — find the `deleteItem` callback and add the broadcast after `syncEngine.writeWithSync`:

```typescript
      if (user?.uid) {
        syncEngine.writeWithSync(deletedItem, user.uid, { isDeletion: true });
        broadcastItemDeleted(deletedItem.id);
      }
```

And add `broadcastItemUpdated` to `togglePin` after `updateItem`:

```typescript
      await updateItem(updated);
      broadcastItemUpdated(updated);
```

And add `broadcastItemUpdated` to `clearUnpinned` after the `syncEngine.writeWithSync` loop — after the `if (user?.uid)` block inside `clearUnpinned`:

```typescript
      if (user?.uid) {
        for (const item of deletedItems) {
          syncEngine.writeWithSync(item, user.uid, { isDeletion: true });
          broadcastItemDeleted(item.id);
        }
      }
```

- [ ] **Step 2: Wire tabSync into useFirestoreSync**

In `src/hooks/useFirestoreSync.ts`, add the import:

```typescript
import { broadcastItemUpdated } from "../lib/tabSync";
```

In the `added` / `modified` handler, after `setItems(...)`, add:

```typescript
              // Broadcast to other tabs so they don't get stale
              broadcastItemUpdated(cloudItem);
```

The relevant block in `useFirestoreSync.ts` (around line `setItems(...)`) should look like:

```typescript
            if (accepted) {
              await savePaste(cloudItem);
              setItems((prev: PasteItem[]) => {
                const idx = prev.findIndex((i) => i.id === cloudItem.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = cloudItem;
                  return next;
                }
                return [cloudItem, ...prev];
              });
              // Broadcast to other tabs so they don't get stale
              broadcastItemUpdated(cloudItem);
            }
```

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePasteStore.ts src/hooks/useFirestoreSync.ts
git commit -m "feat(tab-sync): wire tabSync broadcast into usePasteStore and useFirestoreSync"
```

---

## Phase 5: Firestore Indexes + Migration Safety

### Task 8: Add composite index for syncRev + updatedAt ordering

**Files:**
- Create: `firestore.indexes.json`

- [ ] **Step 1: Create firestore.indexes.json**

Create `firestore.indexes.json` at the project root (same level as `firestore.rules`):

```json
{
  "indexes": [
    {
      "collectionGroup": "pastes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "pastes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "syncRev", "order": "DESCENDING" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.indexes.json
git commit -m "chore(firestore): add composite indexes for userId+updatedAt and userId+syncRev"
```

---

## Phase 6: Backward Compatibility + End-to-End Verification

### Task 9: Add backward-compat defaults in useClipboard.ts and getPastes

**Files:**
- Modify: `src/hooks/useClipboard.ts`
- Modify: `src/lib/db.ts` (getPastes)

- [ ] **Step 1: Ensure new items always have syncRev and updatedAt on creation**

In `src/hooks/useClipboard.ts`, every `newItem` construction (there are 4 places — for image/video, FB video fallback, URL, and text/markdown/code) already spreads `user: user?.uid ?? ""`. Add `syncRev: 0` and `updatedAt: new Date()` to each `newItem` literal.

Example — find the first `newItem` block (around line 38):

```typescript
            const newItem: PasteItem = {
              id,
              type,
              content: base64,
              mimeType: file.type,
              timestamp: new Date(),
              suggestedName: `${type === "video" ? "vid" : "img"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
              isAnalyzing: isAutoAnalyzeEnabled,
              isPinned: false,
              userId: user?.uid ?? "",
              syncRev: 0,
              updatedAt: new Date(),
            };
```

Apply the same `syncRev: 0, updatedAt: new Date()` addition to the remaining three `newItem` literals in the file (URL block around line 85, text block around line 106, and the FB video fallback block around line 69).

- [ ] **Step 2: Verify getPastes applies backward-compat defaults**

In `src/lib/db.ts`, update `getPastes` to normalise `syncRev` and `updatedAt` on load from IndexedDB:

```typescript
export async function getPastes(): Promise<PasteItem[]> {
  const db = await initDB();
  const pastes = await db.getAll(STORE_PASTES);
  console.log('[getPastes] Loaded', pastes.length, 'items from IndexedDB');
  return pastes
    .map((p) => ({
      ...p,
      syncRev: p.syncRev ?? 0,
      updatedAt: p.updatedAt ?? p.timestamp,
      isDeleted: p.isDeleted ?? false,
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
```

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useClipboard.ts src/lib/db.ts
git commit -m "fix(sync): set initial syncRev=0 and updatedAt on new PasteItems; normalise legacy items on load"
```

---

## Phase 7: Full Build Verification

### Task 10: Run full build to confirm everything compiles

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Exit code 0, output in `dist/`

- [ ] **Step 2: Run type check**

Run: `npm run lint`
Expected: Exit code 0

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: finalise sync conflict resolution implementation"
```

---

## Self-Review Checklist

| Requirement | Covered by Task |
|-------------|----------------|
| PasteItem gets `updatedAt`, `syncRev`, `isDeleted`, `deletedAt` | Task 1 |
| Firestore `increment` available | Task 2 |
| SyncEngine singleton with localStorage persistence | Task 3 |
| Conflict detection (pending / LWW) on `onSnapshot` | Task 4 |
| `handleCloudChange` respects `pendingCloudRev` | Task 3 + Task 4 |
| `writeWithSync` uses `merge:true` | Task 3 |
| Retry with exponential backoff, error classification | Task 3 |
| Soft-delete (`isDeleted`) replaces `deleteDoc` | Task 5 |
| `clearUnpinned` no longer two-phase delete | Task 5 |
| `addItem` / `updateItem` / `deleteItem` go through SyncEngine | Task 5 |
| `BroadcastChannel` + `localStorage` cross-tab sync | Task 6 |
| `editingIds` Set prevents self-overwrite during edit | Task 6 |
| New fields have backward-compat defaults (`syncRev ?? 0`) | Task 1, Task 9 |
| Firestore composite indexes | Task 8 |
| Full build passes | Task 10 |

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-08-sync-conflict-resolution.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
