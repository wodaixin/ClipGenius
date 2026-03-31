import { useEffect } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "../firebase";
import { savePaste } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { PasteItem } from "../types";

export function useFirestoreSync() {
  const { user } = useAuth();
  const { setItems } = useAppContext();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/pastes`),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const doc = change.doc;
          const data = doc.data();
          const cloudItem: PasteItem = {
            ...data,
            timestamp: data.timestamp
              ? (data.timestamp as Timestamp).toDate()
              : new Date(),
          } as PasteItem;

          if (change.type === "added" || change.type === "modified") {
            // Write to IndexedDB first
            await savePaste(cloudItem);
            // Then update React state — cloud wins on metadata
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
          // 'removed' handled by deleteItem in usePasteStore
        }
      },
      (error) => {
        console.error("Firestore sync error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, setItems]);
}
