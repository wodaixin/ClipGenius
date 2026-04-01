import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Trash2, Layers, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePasteStore } from "../../hooks/usePasteStore";
import { PasteCard } from "../paste/PasteCard";
import { estimateCardHeight } from "../../lib/estimateCardHeight";
import { cn } from "../../lib/utils";

export function HistoryPane() {
  const { t } = useTranslation();
  const {
    filteredItems,
    items,
    searchQuery,
    setSearchQuery,
    clearUnpinned,
  } = usePasteStore();

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => estimateCardHeight(filteredItems[i]),
    overscan: 5,
    gap: 48,
  });

  return (
    <main className="flex-1 h-screen overflow-y-auto bg-[#F5F5F0]">
      {/* Search & Filter Header */}
      <div className="p-8 md:p-12 border-b border-[#141414]/5 flex flex-col md:flex-row items-stretch md:items-center gap-6 justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
          <input
            type="text"
            placeholder={t("history.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b border-[#141414]/10 py-3 pl-12 pr-4 text-xs font-sans uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-50 hover:opacity-100 transition-opacity"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-sans opacity-75 uppercase tracking-widest">
              {t("history.records")}
            </span>
            <span className="text-sm font-bold">{items.length}</span>
          </div>
          <div className="h-8 w-[1px] bg-[#141414]/10" />
          <button
            onClick={clearUnpinned}
            className="p-3 border border-[#141414]/10 rounded-full hover:bg-red-50 hover:border-red-200 text-red-600 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-12">
        {filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20"
          >
            <Layers className="w-16 h-16 mb-6 stroke-[1px]" />
            <h4 className="text-2xl font-serif italic mb-2">{t("history.emptyTitle")}</h4>
            <p className="text-xs font-sans uppercase tracking-[0.3em] opacity-75">
              {t("history.emptyDesc")}
            </p>
          </motion.div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vItem) => (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: vItem.start, left: 0, right: 0 }}
              >
                <PasteCard item={filteredItems[vItem.index]} />
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="pt-12 pb-24 text-center">
            <span className="text-xs font-sans opacity-75 uppercase tracking-[0.5em]">
              {t("history.endOfArchives")}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
