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
