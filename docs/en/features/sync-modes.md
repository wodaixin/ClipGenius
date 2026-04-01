# Sync Modes

## Overview

ClipGenius operates in two modes depending on authentication state: Guest (local-only) or Authenticated (dual-write to IndexedDB + Firestore).

## Guest Mode

No login required. All data is stored in IndexedDB via the `idb` library. The app is fully functional offline with no network calls made.

## Authenticated Mode

When signed in with Google, all data operations write to both IndexedDB (synchronous, local) and Firestore (asynchronous, cloud).

## Dual-Write on Write

Every mutation follows this pattern:

1. Write to IndexedDB immediately (local state updated first)
2. Call Firestore function asynchronously (fire-and-forget with `.catch(console.error)`)

```typescript
// From usePasteStore.ts
const addItem = async (item: PasteItem) => {
  await savePaste(item);               // IndexedDB — synchronous
  setItems((prev) => [item, ...prev]);  // local state — immediate
  if (user) syncPasteToCloud(item, user.uid); // Firestore — async
};
```

This ensures instant local feedback regardless of network conditions.

## Cloud-Wins on Read

`useFirestoreSync` subscribes to Firestore `onSnapshot`. On `added` or `modified` events, it overwrites the local IndexedDB entry AND the React state with the cloud document:

```
Cloud change arrives → overwrite local item → re-render
```

This means changes made on another device replace the local version, including `suggestedName`, `summary`, and `isPinned`.

## Conflict Resolution

Last-write-wins at the Firestore level. No optimistic locking. For content fields (e.g., a user edits the summary on device A while device B has not yet synced), whichever device synced last wins.

## Chat Sync

Chat uses a separate merge strategy. `onSnapshot` gets all cloud messages, then local-only messages (identified by ID not present in the cloud snapshot) are preserved:

```typescript
const localOnly = prev.filter((m) => !firestoreIds.has(m.id));
return [...mergedCloudMessages, ...localOnly];
```

This prevents losing optimistic local messages during reconnection.

## Offline Behavior

- IndexedDB is always the primary store for reads
- The app is fully functional offline
- Firestore writes silently fail — they are not retried

## Data Isolation

Firestore security rules enforce `request.auth.uid == userId` on all writes. Guests have no cloud presence at all.
