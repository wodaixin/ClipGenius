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

/**
 * Persists a PasteItem (including soft-deleted items with isDeleted=true and deletedAt)
 * to IndexedDB. The item may contain additional fields beyond the original schema.
 */
export async function savePaste(item: PasteItem) {
  const db = await initDB();
  await db.put(STORE_PASTES, item);
}

export async function getPastes(): Promise<PasteItem[]> {
  const db = await initDB();
  const pastes = await db.getAll(STORE_PASTES);
  console.log('[getPastes] Loaded', pastes.length, 'items from IndexedDB');
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
  console.log('[clearUnpinnedPastes] Total items in DB:', all.length);
  
  let deletedCount = 0;
  for (const item of all) {
    if (!item.isPinned) {
      console.log('[clearUnpinnedPastes] Deleting:', item.id.substring(0, 8), item.suggestedName);
      await store.delete(item.id);
      deletedCount++;
    }
  }
  await tx.done;
  console.log('[clearUnpinnedPastes] Deleted', deletedCount, 'items');
}

export async function updatePaste(item: PasteItem) {
  const db = await initDB();
  await db.put(STORE_PASTES, item);
}

export async function saveChatMessage(message: ChatMessage) {
  const db = await initDB();
  await db.put(STORE_CHATS, message);
}

export async function getChatMessages(chatId?: string): Promise<ChatMessage[]> {
  const db = await initDB();
  const chats = await db.getAll(STORE_CHATS);
  console.log('[getChatMessages] Total messages in DB:', chats.length, 'chatId:', chatId);
  const filtered = chatId 
    ? chats.filter((m) => {
        const match = m.chatId === chatId || (!m.chatId && chatId === "default");
        if (match) {
          console.log('[getChatMessages] Including message:', m.id.substring(0, 8), 'chatId:', m.chatId);
        }
        return match;
      })
    : chats;
  console.log('[getChatMessages] Returning', filtered.length, 'messages');
  return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export async function clearChatMessages(chatId?: string): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORE_CHATS, 'readwrite');
  const store = tx.objectStore(STORE_CHATS);
  const all = await store.getAll();
  console.log('[clearChatMessages] Total messages in DB:', all.length, 'chatId:', chatId);
  
  let deletedCount = 0;
  for (const msg of all) {
    // If chatId is specified, only delete messages for that chat
    // If no chatId, delete all messages
    const shouldDelete = !chatId || msg.chatId === chatId || (!msg.chatId && chatId === "default");
    if (shouldDelete) {
      console.log('[clearChatMessages] Deleting message:', msg.id.substring(0, 8), 'chatId:', msg.chatId);
      await store.delete(msg.id);
      deletedCount++;
    }
  }
  await tx.done;
  console.log('[clearChatMessages] Deleted', deletedCount, 'messages');
}
