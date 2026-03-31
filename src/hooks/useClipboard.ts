import { useEffect, useCallback } from "react";
import { PasteItem } from "../types";
import { usePasteStore } from "./usePasteStore";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

export function useClipboard() {
  const { user } = useAuth();
  const { addItem, setIsDragging, isAutoAnalyzeEnabled } = usePasteStore();

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      if (clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i];
          if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const id = crypto.randomUUID();
            const type = file.type.startsWith("video/") ? "video" : "image";
            const newItem: PasteItem = {
              id,
              type,
              content: base64,
              mimeType: file.type,
              timestamp: new Date(),
              suggestedName: `${type === "video" ? "vid" : "img"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
              isAnalyzing: user ? isAutoAnalyzeEnabled : false,
              isPinned: false,
              userId: user?.uid || "guest",
            };
            addItem(newItem);
          };
          reader.readAsDataURL(file);
        }
      }

      const text = clipboardData.getData("text/plain");
      if (text && clipboardData.files.length === 0) {
        const isUrl = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text.trim());
        const id = crypto.randomUUID();
        const newItem: PasteItem = {
          id,
          type: isUrl ? "url" : "text",
          content: text,
          mimeType: isUrl ? "text/uri-list" : "text/plain",
          timestamp: new Date(),
          suggestedName: `${isUrl ? "link" : "note"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
          isAnalyzing: user ? isAutoAnalyzeEnabled : false,
          isPinned: false,
          userId: user?.uid || "guest",
        };
        addItem(newItem);
      }
    },
    [user, isAutoAnalyzeEnabled, addItem]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Suppress default so we handle it ourselves
      e.preventDefault();
      handlePaste(e);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handlePaste]);

  // Expose drag state helpers for PasteZone
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, [setIsDragging]);

  return { handleDragOver, handleDragLeave, handleDrop };
}
