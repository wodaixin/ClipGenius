import { openDB, IDBPDatabase } from 'idb';
import { PasteItem, ChatMessage } from '../types';

const DB_NAME = 'ClipGeniusDB';
const STORE_PASTES = 'pastes';
const STORE_CHATS = 'chats';
const VERSION = 1;

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PASTES)) {
        db.createObjectStore(STORE_PASTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
      }
    },
  });
}

export async function savePaste(item: PasteItem) {
  const db = await initDB();
  await db.put(STORE_PASTES, item);
}

export async function getPastes(): Promise<PasteItem[]> {
  const db = await initDB();
  const pastes = await db.getAll(STORE_PASTES);
  return pastes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function deletePaste(id: string) {
  const db = await initDB();
  await db.delete(STORE_PASTES, id);
}

export async function clearUnpinnedPastes() {
  const db = await initDB();
  const tx = db.transaction(STORE_PASTES, 'readwrite');
  const store = tx.objectStore(STORE_PASTES);
  const all = await store.getAll();
  for (const item of all) {
    if (!item.isPinned) {
      await store.delete(item.id);
    }
  }
  await tx.done;
}

export async function updatePaste(item: PasteItem) {
  const db = await initDB();
  await db.put(STORE_PASTES, item);
}

export async function saveChatMessage(message: ChatMessage) {
  const db = await initDB();
  await db.put(STORE_CHATS, message);
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  const db = await initDB();
  const chats = await db.getAll(STORE_CHATS);
  return chats.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
