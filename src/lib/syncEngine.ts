import {
  db,
  doc,
  setDoc,
  updateDoc,
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

    // Skip cloud sync for video items (too large for Firestore 1MB limit)
    if (item.type === 'video') {
      console.log('[SyncEngine] Skipping cloud sync for video item:', item.id.substring(0, 8));
      this.setSyncState(updated.id, {
        status: 'synced', // Mark as synced locally (no cloud sync needed)
        localUpdatedAt: now,
        localSyncRev: nextRev,
        pendingCloudRev: undefined,
        retryCount: 0,
      });
      return { success: true };
    }

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
            timestamp: item.timestamp,
            updatedAt: serverTimestamp(),
            syncRev: increment(1),
          },
          { merge: true }
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
      console.error('[SyncEngine] writeToCloud error:', error);
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

  async migrateLocalItems(uid: string): Promise<{ migrated: number; skipped: number }> {
    const { getPastes } = await import('./db');
    const all = await getPastes();
    let count = 0;

    for (const item of all) {
      if (item.userId && item.userId !== uid) continue;
      if (item.isDeleted) continue;
      if ((item.syncRev ?? 0) > 0) continue;
      if (item.type === 'video') continue;
      const toSync: PasteItem = item.userId ? item : { ...item, userId: uid };
      console.log('[migrateLocalItems] pushing:', toSync.id, 'userId:', toSync.userId);
      await this.writeToCloud(toSync, uid, false);
      count++;
    }

    return { migrated: count, skipped: all.length - count };
  }
}

// Named export so tests can import the singleton
export const syncEngine = new Engine();
