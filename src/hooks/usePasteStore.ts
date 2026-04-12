import { useState, useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import { PasteItem } from "../types";
import {
  savePaste,
  deletePaste as deleteLocalPaste,
} from "../lib/db";
import { markItemEditing, unmarkItemEditing } from "../lib/tabSync";
import { copyItemToClipboard, downloadItem as downloadItemUtil } from "../services/clipboard/clipboardUtils";
import { useAppContext } from "../context/AppContext";

export function usePasteStore() {
  const { items, setItems, isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled } = useAppContext();

  // ---------- UI state ----------
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return [...items].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    }

    const fuse = new Fuse(items, {
      keys: [
        { name: "suggestedName", weight: 0.4 },
        { name: "summary", weight: 0.3 },
        { name: "content", weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });

    const results = fuse.search(searchQuery);
    return results.map((r) => r.item);
  }, [items, searchQuery]);

  // ---------- Actions ----------

  const addItem = useCallback(
    async (item: PasteItem) => {
      const newItem: PasteItem = {
        ...item,
        updatedAt: new Date(),
      };
      await savePaste(newItem);
      setItems((prev: PasteItem[]) => [newItem, ...prev]);
    },
    [setItems]
  );

  const updateItem = useCallback(
    async (updated: PasteItem) => {
      const updatedWithSync: PasteItem = {
        ...updated,
        updatedAt: new Date(),
      };
      await savePaste(updatedWithSync);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === updated.id ? updatedWithSync : i))
      );
    },
    [setItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const deletedItem: PasteItem = {
        ...item,
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      };

      await savePaste(deletedItem);
      setItems((prev: PasteItem[]) => prev.filter((i) => i.id !== id));
    },
    [items, setItems]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, isPinned: !item.isPinned, updatedAt: new Date() };
      await savePaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
    },
    [items, setItems]
  );

  const clearUnpinned = useCallback(async () => {
    const unpinned = items.filter((i) => !i.isPinned && !i.isDeleted);
    if (unpinned.length === 0) return;

    const deletedItems: PasteItem[] = unpinned.map((item) => ({
      ...item,
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    }));

    setItems((prev: PasteItem[]) =>
      prev.filter((i) => !deletedItems.some((d) => d.id === i.id))
    );

    for (const item of deletedItems) {
      await savePaste(item);
    }
  }, [items, setItems]);

  const saveEdit = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, suggestedName: editName, summary: editSummary, updatedAt: new Date() };
      unmarkItemEditing(id);
      await savePaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
      setEditingItemId(null);
    },
    [items, editName, editSummary, setItems]
  );

  const startEditing = useCallback((item: PasteItem) => {
    setEditingItemId(item.id);
    setEditName(item.suggestedName);
    setEditSummary(item.summary || "");
    markItemEditing(item.id);
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
