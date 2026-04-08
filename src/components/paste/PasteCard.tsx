import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Download,
  Copy,
  CheckCircle2,
  Loader2,
  Edit3,
  Pin,
  PinOff,
  Trash2,
  Zap,
  MessageSquare,
  Sparkles,
  Wand2,
  User as UserIcon,
} from "lucide-react";
import { PasteItem } from "../../types";
import { PastePreview } from "./PastePreview";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { usePasteStore } from "../../hooks/usePasteStore";
import { useChat } from "../../context/ChatContext";
import { useImageGen } from "../../hooks/useImageGen";
import { analyzeContent } from "../../services/ai/analyzeContent";

interface PasteCardProps {
  item: PasteItem;
}

export function PasteCard({ item }: PasteCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    copiedId,
    editingItemId,
    editName,
    editSummary,
    setEditName,
    setEditSummary,
    deleteItem,
    togglePin,
    saveEdit,
    startEditing,
    setEditingItemId,
    copyToClipboard,
    downloadItem,
    updateItem,
  } = usePasteStore();

  const { openChatWithItem } = useChat();
  const { openImageGenWithText, startImageEdit } = useImageGen();

  const isEditing = editingItemId === item.id;
  const isCopied = copiedId === item.id;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [fullItem, setFullItem] = useState(item);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightboxOpen(false);
    window.addEventListener("keydown", onKey);
    import("../../lib/db").then(({ getPastes }) =>
      getPastes().then((all) => {
        const found = all.find((p) => p.id === item.id);
        if (found) setFullItem(found);
      })
    );
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, item.id]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const handleAnalyze = useCallback(async () => {
    // Prevent duplicate analysis
    if (item.isAnalyzing) {
      console.log(`[PasteCard] Item ${item.id.substring(0, 8)} is already analyzing, skipping`);
      return;
    }
    console.log(`[PasteCard] Starting analysis for item ${item.id.substring(0, 8)}`);
    updateItem({ ...item, isAnalyzing: true });
  }, [item, updateItem]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: 50 }}
      className="relative"
    >
      <div className={cn(
        "flex flex-col xl:flex-row gap-4 xl:gap-8 transition-all duration-500",
        item.isPinned ? "opacity-100" : "opacity-80 hover:opacity-100"
      )}>
        {/* Preview Column */}
        <div
          className="w-32 h-32 xl:w-64 xl:h-64 bg-white border border-[#141414]/5 rounded-2xl relative shadow-sm group-hover:shadow-xl transition-all duration-500 shrink-0 group cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        >
          <PastePreview item={item} />

          {/* Type Badge */}
          <div className="absolute top-2 left-2 xl:top-4 xl:left-4">
            <span className="px-2 py-0.5 xl:px-3 xl:py-1 bg-white/90 backdrop-blur-md border border-[#141414]/5 text-[10px] xl:text-xs font-bold uppercase tracking-widest rounded-full shadow-sm">
              {item.type}
            </span>
          </div>

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-[#141414]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 xl:gap-4 rounded-2xl">
            <button
              onClick={(e) => { e.stopPropagation(); downloadItem(item); }}
              className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Download className="w-4 h-4 xl:w-5 xl:h-5" />
            </button>

            {user && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); openChatWithItem(item); }}
                  className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <MessageSquare className="w-4 h-4 xl:w-5 xl:h-5" />
                </button>
                {item.type === "text" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openImageGenWithText(item.content); }}
                    className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-4 h-4 xl:w-5 xl:h-5" />
                  </button>
                )}
                {item.type === "markdown" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openImageGenWithText(item.content); }}
                    className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-4 h-4 xl:w-5 xl:h-5" />
                  </button>
                )}
                {item.type === "code" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openImageGenWithText(item.content); }}
                    className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-4 h-4 xl:w-5 xl:h-5" />
                  </button>
                )}
                {item.type === "image" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startImageEdit(item); }}
                    className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-4 h-4 xl:w-5 xl:h-5" />
                  </button>
                )}
                {item.type === "url" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openImageGenWithText(item.summary || item.content); }}
                    className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Sparkles className="w-4 h-4 xl:w-5 xl:h-5" />
                  </button>
                )}
              </>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); copyToClipboard(item); }}
              className="w-8 h-8 xl:w-12 xl:h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4 xl:w-5 xl:h-5 text-green-600" /> : <Copy className="w-4 h-4 xl:w-5 xl:h-5" />}
            </button>
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 max-h-64 overflow-hidden flex flex-col justify-center py-2">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-sans opacity-70 uppercase tracking-widest">
                  {format(item.timestamp, "HH:mm:ss")}
                </span>
                <div className="h-[1px] w-8 bg-[#141414]/10" />
                <span className="text-xs font-sans opacity-70 uppercase tracking-widest">
                  {format(item.timestamp, "MMM d, yyyy")}
                </span>
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-tighter truncate leading-none flex items-center gap-2 group/title mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-transparent border-b border-[#141414] text-2xl font-bold uppercase tracking-tighter w-full focus:outline-none py-0"
                    autoFocus
                  />
                ) : (
                  <>
                    {item.isAnalyzing && (
                      <Loader2 className="w-5 h-5 animate-spin opacity-40" />
                    )}
                    <span className="truncate">{item.suggestedName}</span>
                  </>
                )}
              </h3>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-1 mb-4">
              {!item.isAnalyzing && !isEditing && (
                <>
                  <button
                    onClick={() => startEditing(item)}
                    className="p-1.5 opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-4 bg-[#141414]/10 mx-1.5 self-center" />
                  <button
                    onClick={() => togglePin(item.id)}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      item.isPinned ? "text-[#141414]" : "text-[#141414]/30 hover:text-[#141414]"
                    )}
                  >
                    {item.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 text-[#141414]/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(item)}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      copiedId === item.id ? "text-green-500" : "text-[#141414]/30 hover:text-[#141414]"
                    )}
                  >
                    {copiedId === item.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mb-6 p-4 bg-[#F9F9F7] rounded-2xl border border-[#141414]/5">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white border border-[#141414]/10 rounded-xl px-4 py-3 text-xl font-bold uppercase tracking-tighter focus:outline-none focus:border-[#141414] transition-colors mb-3"
                placeholder={t("pasteCard.namePlaceholder")}
              />
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full bg-white border border-[#141414]/10 rounded-xl px-4 py-3 text-base font-serif italic text-[#141414] leading-relaxed focus:outline-none focus:border-[#141414] resize-none h-28 transition-colors mb-3"
                placeholder={t("pasteCard.summaryPlaceholder")}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingItemId(null)}
                  className="px-4 py-1.5 border border-[#141414]/10 text-xs font-sans uppercase tracking-widest rounded-full hover:bg-[#141414]/5 transition-all"
                >
                  {t("pasteCard.cancel")}
                </button>
                <button
                  onClick={() => saveEdit(item.id)}
                  className="px-4 py-1.5 bg-[#141414] text-white text-xs font-sans uppercase tracking-widest rounded-full hover:bg-[#333] transition-all"
                >
                  {t("pasteCard.save")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-lg font-serif italic text-[#141414]/60 leading-relaxed mb-6 line-clamp-2 truncate">
              {item.isAnalyzing
                ? t("pasteCard.analyzingContent")
                : item.summary || t("pasteCard.noSummary")}
            </p>
          )}

          <div className="flex items-center gap-4 mb-6">
            {item.isAnalyzing ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full opacity-70">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs font-sans uppercase tracking-widest">{t("pasteCard.analyzing")}</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all group/btn"
                >
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {item.summary ? t("pasteCard.reAnalyze") : t("pasteCard.analyzeNow")}
                  </span>
                </button>
                <button
                  onClick={() => openChatWithItem(item)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                >
                  <MessageSquare className="w-3 h-3 opacity-75 group-hover/btn:opacity-100" />
                  <span className="text-xs font-sans uppercase tracking-widest">{t("pasteCard.chatWithAi")}</span>
                </button>
                {item.type === "image" && (
                  <button
                    onClick={() => startImageEdit(item)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                  >
                    <Sparkles className="w-3 h-3 opacity-75 group-hover/btn:opacity-100" />
                    <span className="text-xs font-sans uppercase tracking-widest">{t("pasteCard.editImage")}</span>
                  </button>
                )}
                {(item.type === "text" || item.type === "url" || item.type === "markdown" || item.type === "code") && (
                  <button
                    onClick={() => openImageGenWithText(item.type === "url" ? item.summary || item.content : item.content)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                  >
                    <Sparkles className="w-3 h-3 opacity-75 group-hover/btn:opacity-100" />
                    <span className="text-xs font-sans uppercase tracking-widest">{t("pasteCard.generateImage")}</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="mt-12 h-[1px] w-full bg-[#141414]/5" />

      {lightboxOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
            >
              ✕
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className={cn(
                "relative rounded-2xl overflow-hidden",
                (item.type === "image" || item.type === "video")
                  ? "max-w-[90vw] max-h-[90vh]"
                  : "max-w-4xl w-[90vw] max-h-[85vh]"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <PastePreview item={fullItem} full className="w-full h-full" />
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
