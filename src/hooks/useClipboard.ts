import { useEffect, useCallback } from "react";
import { PasteItem } from "../types";
import { usePasteStore } from "./usePasteStore";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

// Module-level: ignore paste events within 500ms (handles StrictMode double-mount)
let lastPasteTime = 0;

export function useClipboard() {
  const { user } = useAuth();
  const { addItem, setIsDragging, isAutoAnalyzeEnabled } = usePasteStore();

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const now = Date.now();
      if (now - lastPasteTime < 500) return;
      lastPasteTime = now;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      if (clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          const file = clipboardData.files[i];
          if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const type = file.type.startsWith("video/") ? "video" : "image";

            // Videos from clipboard may only contain a data URL header (not the full file).
            // If the base64 is tiny, likely a truncated read — skip it.
            if (type === "video" && base64.length < 1024) return;

            const id = crypto.randomUUID();
            const newItem: PasteItem = {
              id,
              type,
              content: base64,
              mimeType: file.type,
              timestamp: new Date(),
              suggestedName: `${type === "video" ? "vid" : "img"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
              isAnalyzing: user ? isAutoAnalyzeEnabled : false,
              isPinned: false,
              userId: user?.uid ?? "",
            };
            addItem(newItem);
          };
          reader.readAsDataURL(file);
        }
      }

      const text = clipboardData.getData("text/plain");
      if (text && clipboardData.files.length === 0) {
        const isUrl = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text.trim());
        const isMarkdown = !isUrl && /^#{1,6} |^\*\*|^- |\*[^*]+\*|```|\[.+\]\(.+\)|^>\s/m.test(text);
        const codeLang = !isUrl && !isMarkdown ? detectCodeLanguage(text) : null;
        const type = isUrl ? "url" : isMarkdown ? "markdown" : codeLang ? "code" : "text";
        const id = crypto.randomUUID();
        const newItem: PasteItem = {
          id,
          type,
          content: text,
          mimeType: isUrl ? "text/uri-list" : codeLang ? `code/${codeLang}` : "text/plain",
          timestamp: new Date(),
          suggestedName: `${type === "url" ? "link" : type === "markdown" ? "doc" : type === "code" ? `${codeLang}_snippet` : "note"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
          isAnalyzing: user ? isAutoAnalyzeEnabled : false,
          isPinned: false,
          userId: user?.uid ?? "",
        };
        addItem(newItem);
      }
    },
    [user, isAutoAnalyzeEnabled, addItem]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handlePaste(e);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handlePaste]);

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

function detectCodeLanguage(text: string): string | null {
  const t = text.trim();
  const rules: [RegExp, string][] = [
    [/^\s*\{[\s\S]*\}\s*$|^\s*\[[\s\S]*\]\s*$/, "json"],
    [/<\?xml|<\/[a-zA-Z]+>/, "xml"],
    [/<!DOCTYPE html|<html|<\/div>|<\/span>/, "html"],
    [/^\s*SELECT\s|^\s*INSERT\s|^\s*UPDATE\s|^\s*CREATE\s/im, "sql"],
    [/^def |^from .+ import|^async def /m, "python"],
    [/^func |^package |^import \(|:= /, "go"],
    [/^fn |^let mut |^use std::|^impl |^pub fn /m, "rust"],
    [/^#include|^int main\(|std::|cout <</, "cpp"],
    [/^import |^export |^const |^let |^var |=>|\.tsx?$/, "typescript"],
    [/^import |^export |^const |^let |^var |=>/, "javascript"],
    [/^public class |^private |^protected |^import java\./m, "java"],
    [/^using System|^namespace |^public class /m, "csharp"],
    [/^<\?php|^\$[a-z_]+ =|echo |->/, "php"],
    [/^#!\/bin\/bash|^\$\(|^if \[|^fi$|^echo /m, "bash"],
    [/^[a-z-]+:\s*$|^\s{2,}[a-z-]+:/m, "yaml"],
    [/^\[.+\]\s*$|^[a-z_]+ = /m, "toml"],
  ];
  for (const [regex, lang] of rules) {
    if (regex.test(t)) return lang;
  }
  // Fallback: has enough code-like structure
  if (/[{};()=>]/.test(t) && t.split("\n").length > 2) return "code";
  return null;
}
