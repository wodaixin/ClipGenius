import { PasteItem } from '../types';

const TAB_CHANNEL = 'ClipGenius:tab-sync';
const EDITING_KEY = 'ClipGenius:editing';

type TabMessage =
  | { type: 'item-updated'; item: PasteItem; fromTabId: string }
  | { type: 'item-deleted'; id: string; fromTabId: string };

let currentTabId: string;
let channel: BroadcastChannel | null = null;

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
      if (msg.fromTabId === tabId) return;
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
  try {
    localStorage.setItem(TAB_CHANNEL, JSON.stringify(msg));
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
