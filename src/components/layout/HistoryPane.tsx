import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Trash2, Layers, XCircle } from "lucide-react";
import { usePasteStore } from "../../hooks/usePasteStore";
import { PasteCard } from "../paste/PasteCard";
import { cn } from "../../lib/utils";

export function HistoryPane() {
  const {
    filteredItems,
    items,
    searchQuery,
    setSearchQuery,
    clearUnpinned,
  } = usePasteStore();

  return (
    <main className="flex-1 h-screen overflow-y-auto bg-[#F5F5F0]">
      {/* Search & Filter Header */}
      <div className="p-8 md:p-12 border-b border-[#141414]/5 flex flex-col md:flex-row items-stretch md:items-center gap-6 justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
          <input
            type="text"
            placeholder="SEARCH HISTORY..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b border-[#141414]/10 py-3 pl-12 pr-4 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-30 hover:opacity-100 transition-opacity"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">
              Records
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
      <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
        <AnimatePresence initial={false}>
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20"
            >
              <Layers className="w-16 h-16 mb-6 stroke-[1px]" />
              <h4 className="text-2xl font-serif italic mb-2">Empty Archives</h4>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em]">
                Waiting for input signal
              </p>
            </motion.div>
          ) : (
            filteredItems.map((item) => (
              <PasteCard key={item.id} item={item} />
            ))
          )}
        </AnimatePresence>

        {/* End of List Indicator */}
        {items.length > 0 && (
          <div className="pt-12 pb-24 text-center">
            <span className="text-[9px] font-mono opacity-20 uppercase tracking-[0.5em]">
              End of Archives
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
