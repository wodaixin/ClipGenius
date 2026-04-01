import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { PasteItem } from "../types";
import {
  savePaste,
  deletePaste as deleteLocalPaste,
  clearUnpinnedPastes,
  updatePaste as updateLocalPaste,
} from "../lib/db";
import {
  syncPasteToCloud,
  syncPasteUpdateToCloud,
  syncPasteDeleteFromCloud,
  syncClearUnpinnedFromCloud,
} from "../services/sync/dualSync";
import { copyItemToClipboard, downloadItem as downloadItemUtil } from "../services/clipboard/clipboardUtils";
import { analyzeContent } from "../services/ai/analyzeContent";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

// ---------- Hook ----------
// All state lives in AppContext (which is persisted to IndexedDB).
// usePasteStore provides UI-specific derived state + action helpers.

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
      await savePaste(item);
      setItems((prev: PasteItem[]) => [item, ...prev]);
      if (user) syncPasteToCloud(item, user.uid);
    },
    [user]
  );

  const updateItem = useCallback(
    async (updated: PasteItem) => {
      await updateLocalPaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      if (user) {
        syncPasteUpdateToCloud(updated.id, user.uid, {
          suggestedName: updated.suggestedName,
          summary: updated.summary,
          isAnalyzing: updated.isAnalyzing,
          isPinned: updated.isPinned,
        });
      }
    },
    [user, setItems]
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
      await updateLocalPaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
      if (user) syncPasteUpdateToCloud(id, user.uid, { isPinned: updated.isPinned });
    },
    [user, items, setItems]
  );

  const clearUnpinned = useCallback(async () => {
    const unpinned = items.filter((i) => !i.isPinned);
    await clearUnpinnedPastes();
    setItems((prev: PasteItem[]) => prev.filter((i) => i.isPinned));
    if (user) syncClearUnpinnedFromCloud(unpinned, user.uid);
  }, [user, items, setItems]);

  const saveEdit = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const updated = { ...item, suggestedName: editName, summary: editSummary };
      await updateLocalPaste(updated);
      setItems((prev: PasteItem[]) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
      if (user) syncPasteUpdateToCloud(id, user.uid, { suggestedName: editName, summary: editSummary });
      setEditingItemId(null);
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

  // Auto-analyze: watch for items with isAnalyzing=true and no summary
  const analyzingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const toAnalyze = items.filter(
      (item) => item.isAnalyzing && !analyzingRef.current.has(item.id)
    );
    toAnalyze.forEach((item) => {
      analyzingRef.current.add(item.id);
      analyzeContent(item)
        .then((result) => updateItem({ ...item, ...result, isAnalyzing: false }))
        .catch(() => updateItem({ ...item, isAnalyzing: false }))
        .finally(() => analyzingRef.current.delete(item.id));
    });
  }, [items, user, updateItem]);

  // Catch-up: when user logs in, analyze items that missed auto-analyze (pasted before login)
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (!user || prevUserRef.current) return; // only trigger on first login
    prevUserRef.current = user;
    if (!isAutoAnalyzeEnabled) return;
    const toAnalyze = items.filter(
      (item) => !item.summary && !analyzingRef.current.has(item.id)
    );
    toAnalyze.forEach((item) => {
      analyzingRef.current.add(item.id);
      analyzeContent(item)
        .then((result) => updateItem({ ...item, ...result }))
        .finally(() => analyzingRef.current.delete(item.id));
    });
  }, [user, items, isAutoAnalyzeEnabled, updateItem]);

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
