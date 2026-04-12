import { PasteItem } from '../types';

const EDITING_KEY = 'ClipGenius:editing';

const editingIds = new Set<string>();

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
    // silently ignore storage errors
  }
}

export function unmarkItemEditing(id: string): void {
  editingIds.delete(id);
  try {
    const raw = localStorage.getItem(EDITING_KEY);
    if (!raw) return;
    const set: string[] = JSON.parse(raw);
    const next = set.filter((x) => x !== id);
    localStorage.setItem(EDITING_KEY, JSON.stringify(next));
  } catch {
    // silently ignore storage errors
  }
}

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

export function broadcastItemUpdated(_item: PasteItem): void {
  // cloud sync removed — no-op
}

export function broadcastItemDeleted(_id: string): void {
  // cloud sync removed — no-op
}

export function initTabSync(
  _onItemUpdated: (item: PasteItem) => void,
  _onItemDeleted: (id: string) => void
): () => void {
  return () => {};
}
