import { useState, useCallback, useMemo } from "react";
import { PasteItem } from "../types";
import {
  savePaste,
  deletePaste as deleteLocalPaste,
} from "../lib/db";
import { syncEngine } from "../lib/syncEngine";
import { copyItemToClipboard, downloadItem as downloadItemUtil } from "../services/clipboard/clipboardUtils";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

export function usePasteStore() {
  const { user } = useAuth();
  const { items, setItems, isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled } = useAppContext();

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
      const newItem: PasteItem = {
        ...item,
        updatedAt: new Date(),
        syncRev: 0,
      };
      await savePaste(newItem);
      setItems((prev: PasteItem[]) => [newItem, ...prev]);
      if (user?.uid) {
        syncEngine.writeWithSync(newItem, user.uid);
      }
    },
    [user, setItems]
  );

  const updateItem = useCallback(
    async (updated: PasteItem) => {
      const updatedWithSync: PasteItem = {
        ...updated,
        updatedAt: new Date(),
        syncRev: (updated.syncRev ?? 0) + 1,
      };
      await savePaste(updatedWithSync);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === updated.id ? updatedWithSync : i))
      );
      if (user?.uid) {
        syncEngine.writeWithSync(updatedWithSync, user.uid);
      }
    },
    [user, setItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      // Soft-delete: mark isDeleted instead of hard-deleting
      const deletedItem: PasteItem = {
        ...item,
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
        syncRev: (item.syncRev ?? 0) + 1,
      };

      await savePaste(deletedItem);
      setItems((prev: PasteItem[]) => prev.filter((i) => i.id !== id));

      if (user?.uid) {
        syncEngine.writeWithSync(deletedItem, user.uid, { isDeletion: true });
      }
    },
    [user, items, setItems]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, isPinned: !item.isPinned, updatedAt: new Date(), syncRev: (item.syncRev ?? 0) + 1 };
      await savePaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
      if (user?.uid) {
        syncEngine.writeWithSync(updated, user.uid);
      }
    },
    [user, items, setItems]
  );

  const clearUnpinned = useCallback(async () => {
    const unpinned = items.filter((i) => !i.isPinned && !i.isDeleted);
    if (unpinned.length === 0) return;

    const deletedItems: PasteItem[] = unpinned.map((item) => ({
      ...item,
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
      syncRev: (item.syncRev ?? 0) + 1,
    }));

    // Optimistic: remove from UI immediately
    setItems((prev: PasteItem[]) =>
      prev.filter((i) => !deletedItems.some((d) => d.id === i.id))
    );

    // Persist soft-delete state to IndexedDB
    for (const item of deletedItems) {
      await savePaste(item);
    }

    // Fan out async cloud writes
    if (user?.uid) {
      for (const item of deletedItems) {
        syncEngine.writeWithSync(item, user.uid, { isDeletion: true });
      }
    }
  }, [user, items, setItems]);

  const saveEdit = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, suggestedName: editName, summary: editSummary, updatedAt: new Date(), syncRev: (item.syncRev ?? 0) + 1 };
      await savePaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
      setEditingItemId(null);
      if (user?.uid) {
        syncEngine.writeWithSync(updated, user.uid);
      }
    },
    [user, items, editName, editSummary, setItems]
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
