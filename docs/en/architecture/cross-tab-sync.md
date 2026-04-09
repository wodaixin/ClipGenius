# Cross-Tab Sync

Changes made in one browser tab are broadcast to other open tabs via `tabSync.ts`.

## Mechanism

### Primary: BroadcastChannel

The `BroadcastChannel` API allows windows/tabs in the same origin to communicate:

```typescript
const channel = new BroadcastChannel('clipgenius-sync');
channel.postMessage({ type: 'ITEM_UPDATED', item });
channel.postMessage({ type: 'ITEM_DELETED', id });
```

**Important**: `BroadcastChannel.postMessage()` does NOT fire on the sender tab. This prevents infinite update loops.

### Fallback: `storage` Event

For browsers that do not support `BroadcastChannel` (older Safari), a `window.addEventListener('storage', ...)` listener serves as fallback. The `storage` event fires on other tabs when `localStorage` is changed.

```typescript
window.addEventListener('storage', (e) => {
  if (e.key === 'clipgenius-tab-update') {
    const data = JSON.parse(e.newValue);
    // apply update
  }
});
```

## Coordinate Editing Across Tabs

The `editingIds` Set in `tabSync.ts` prevents one tab from overwriting edits made in another tab:

```typescript
// When starting to edit in tab A:
broadcast({ type: 'MARK_EDITING', id });
// Tab B receives MARK_EDITING → stores id in its editingIds Set

// When tab B tries to save:
if (isItemEditing(id)) return; // silently ignore — tab A is editing
// proceed with save
```

This is a cooperative protocol — it assumes well-behaved tabs and does not use locks.

## Initialization

`initTabSync(onItemUpdated, onItemDeleted)` is called once at app startup (inside `AppContext`). It sets up the listeners and returns a cleanup function.
