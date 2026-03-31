import {
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "../../firebase";
import { PasteItem } from "../../types";

/** Write a new paste item to Firestore */
export async function syncPasteToCloud(item: PasteItem, uid: string): Promise<void> {
  try {
    await setDoc(doc(db, `users/${uid}/pastes`, item.id), {
      ...item,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("syncPasteToCloud failed:", error);
  }
}

/** Update specific fields of an existing paste in Firestore */
export async function syncPasteUpdateToCloud(
  id: string,
  uid: string,
  fields: Partial<PasteItem>
): Promise<void> {
  try {
    // Filter out undefined values as Firebase doesn't accept them
    const definedFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(definedFields).length === 0) return;
    await updateDoc(doc(db, `users/${uid}/pastes`, id), definedFields as Record<string, unknown>);
  } catch (error) {
    console.error("syncPasteUpdateToCloud failed:", error);
  }
}

/** Delete a paste from Firestore */
export async function syncPasteDeleteFromCloud(id: string, uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, `users/${uid}/pastes`, id));
  } catch (error) {
    console.error("syncPasteDeleteFromCloud failed:", error);
  }
}

/** Batch delete multiple unpinned pastes from Firestore */
export async function syncClearUnpinnedFromCloud(items: PasteItem[], uid: string): Promise<void> {
  try {
    const promises = items.map((item) =>
      deleteDoc(doc(db, `users/${uid}/pastes`, item.id))
    );
    await Promise.all(promises);
  } catch (error) {
    console.error("syncClearUnpinnedFromCloud failed:", error);
  }
}
