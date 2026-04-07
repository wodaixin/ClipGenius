import { useState, useCallback, useMemo } from "react";
import { PasteItem } from "../types";
import {
  savePaste,
  deletePaste as deleteLocalPaste,
  clearUnpinnedPastes,
} from "../lib/db";
import {
  syncPasteToCloud,
  syncPasteUpdateToCloud,
  syncPasteDeleteFromCloud,
  syncClearUnpinnedFromCloud,
} from "../services/sync/dualSync";
import { copyItemToClipboard, downloadItem as downloadItemUtil } from "../services/clipboard/clipboardUtils";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

// ---------- Hook ----------
// All state lives in AppContext (which is persisted to IndexedDB).
// usePasteStore provides UI-specific derived state + action helpers.

export function usePasteStore() {
  const { user } = useAuth();
  const { items, setItems, isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled, updateItem: updateItemFromContext } = useAppContext();

  // ---------- UI state ----------
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = items.filter(
      (item) =>
        item.suggestedName.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [items, searchQuery]);

  // ---------- Actions ----------

  const addItem = useCallback(
    async (item: PasteItem) => {
      await savePaste(item);
      setItems((prev: PasteItem[]) => [item, ...prev]);
      if (user) syncPasteToCloud(item, user.uid);
    },
    [user, setItems]
  );

  const updateItem = useCallback(
    async (updated: PasteItem) => {
      await updateItemFromContext(updated, user?.uid);
    },
    [user, updateItemFromContext]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await deleteLocalPaste(id);
      setItems((prev: PasteItem[]) => prev.filter((i) => i.id !== id));
      if (user) syncPasteDeleteFromCloud(id, user.uid);
    },
    [user, setItems]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, isPinned: !item.isPinned };
      await updateItem(updated);
    },
    [user, items, updateItem]
  );

  const clearUnpinned = useCallback(async () => {
    const unpinned = items.filter((i) => !i.isPinned);
    console.log('[clearUnpinned] Starting clear, unpinned count:', unpinned.length);
    console.log('[clearUnpinned] Unpinned items:', unpinned.map(i => ({ id: i.id.substring(0, 8), name: i.suggestedName })));
    
    // First delete from cloud to prevent re-sync
    if (user) {
      console.log('[clearUnpinned] Deleting from cloud...');
      await syncClearUnpinnedFromCloud(unpinned, user.uid);
      console.log('[clearUnpinned] Cloud deletion complete');
    }
    
    // Then delete from local IndexedDB
    console.log('[clearUnpinned] Deleting from IndexedDB...');
    await clearUnpinnedPastes();
    console.log('[clearUnpinned] IndexedDB deletion complete');
    
    // Finally update React state
    console.log('[clearUnpinned] Updating React state...');
    setItems((prev: PasteItem[]) => {
      const filtered = prev.filter((i) => i.isPinned);
      console.log('[clearUnpinned] State updated, remaining items:', filtered.length);
      return filtered;
    });
    console.log('[clearUnpinned] Clear complete');
  }, [user, items, setItems]);

  const saveEdit = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, suggestedName: editName, summary: editSummary };
      await updateItem(updated);
      setEditingItemId(null);
    },
    [user, items, editName, editSummary, updateItem]
  );

  const startEditing = useCallback((item: PasteItem) => {
    setEditingItemId(item.id);
    setEditName(item.suggestedName);
    setEditSummary(item.summary || "");
  }, []);

  const copyToClipboard = useCallback(async (item: PasteItem) => {
    await copyItemToClipboard(item);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleDownload = useCallback((item: PasteItem) => {
    downloadItemUtil(item);
  }, []);

  return {
    // State (read from AppContext)
    items,
    filteredItems,
    // UI state
    searchQuery,
    isDragging,
    copiedId,
    editingItemId,
    editName,
    editSummary,
    isAutoAnalyzeEnabled,
    // Setters
    setSearchQuery,
    setIsDragging,
    setEditingItemId,
    setEditName,
    setEditSummary,
    setIsAutoAnalyzeEnabled,
    // Actions
    addItem,
    updateItem,
    deleteItem,
    togglePin,
    clearUnpinned,
    saveEdit,
    startEditing,
    copyToClipboard,
    downloadItem: handleDownload,
  };
}
