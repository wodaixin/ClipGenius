import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clipboard,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Sparkles,
  Zap,
  Layers,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePasteStore } from "../../hooks/usePasteStore";
import { useClipboard } from "../../hooks/useClipboard";
import { useChat } from "../../hooks/useChat";
import { useImageGen } from "../../hooks/useImageGen";
import { cn } from "../../lib/utils";

export function PasteZone() {
  const { user, login, logout } = useAuth();
  const { isDragging, isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled } = usePasteStore();
  const { handleDragOver, handleDragLeave, handleDrop } = useClipboard();
  const { openChatWithItem } = useChat();
  const { openImageGen } = useImageGen();

  return (
    <aside className="w-full lg:w-[45%] lg:h-screen lg:overflow-y-auto shrink-0 border-r border-[#141414]/10 bg-white flex flex-col relative">
      {/* Vertical Rail Text */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden xl:block">
        <span className="writing-vertical text-[10px] font-mono opacity-20 uppercase tracking-[0.4em] select-none">
          CLIPGENIUS • AI CLIPBOARD SYSTEM • V1.2.0
        </span>
      </div>

      {/* Header */}
      <header className="p-8 md:p-12 border-b border-[#141414]/5">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-full">
              <Clipboard className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold italic tracking-tight leading-none">
                ClipGenius
              </h1>
              <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest mt-1">
                Intelligence Layer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto AI Toggle */}
            {user && (
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#F9F9F7] rounded-full border border-[#141414]/5">
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">
                  Auto AI
                </span>
                <button
                  onClick={() => setIsAutoAnalyzeEnabled(!isAutoAnalyzeEnabled)}
                  className={cn(
                    "w-8 h-4 rounded-full transition-all relative",
                    isAutoAnalyzeEnabled ? "bg-green-500" : "bg-gray-300"
                  )}
                >
                  <motion.div
                    animate={{ x: isAutoAnalyzeEnabled ? 16 : 2 }}
                    className="absolute top-1 w-2 h-2 bg-white rounded-full"
                  />
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">
                    {user.displayName}
                  </span>
                  <button
                    onClick={logout}
                    className="text-[9px] font-mono font-bold hover:underline flex items-center gap-1"
                  >
                    <span>LOGOUT</span>
                  </button>
                </div>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="w-8 h-8 rounded-full border border-[#141414]/10"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = "none";
                      (img.nextElementSibling as HTMLElement).style.display = "flex";
                    }}
                  />
                )}
                <span className="hidden w-8 h-8 rounded-full border border-[#141414]/10 bg-[#141414] text-white text-xs font-bold items-center justify-center select-none">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
            ) : (
              <button
                onClick={login}
                className="px-4 py-2 bg-[#141414] text-white text-[10px] font-mono uppercase tracking-widest rounded-full hover:bg-[#333] transition-colors"
              >
                Login with Google
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] uppercase">
            Capture <br />
            <span className="text-[#141414]/20 italic font-serif lowercase">everything.</span>
          </h2>
          <p className="text-sm opacity-50 max-w-sm leading-relaxed">
            ClipGenius is a professional-grade AI clipboard utility powered by Gemini.
            Intelligently capture, analyze, and organize images, videos, text, or links.
          </p>
        </div>
      </header>

      {/* Large Paste Zone */}
      <div className="flex-1 p-8 md:p-12 flex flex-col">
        <div
          className={cn(
            "flex-1 border-2 border-dashed border-[#141414]/20 rounded-3xl flex flex-col items-center justify-center text-center transition-all duration-700 relative overflow-hidden group p-12 min-h-[320px]",
            isDragging
              ? "bg-[#141414] border-solid border-[#141414]"
              : "bg-[#F9F9F7] hover:bg-white hover:border-[#141414]/40"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence mode="wait">
            {isDragging ? (
              <motion.div
                key="dragging"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                className="flex flex-col items-center text-white"
              >
                <Plus className="w-20 h-20 mb-4 animate-bounce" />
                <span className="text-xl font-mono uppercase tracking-[0.3em]">
                  Drop to Analyze
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 border border-[#141414]/10 rounded-full flex items-center justify-center mb-8 bg-white shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <Plus className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Paste Zone</h3>
                <p className="text-[11px] font-mono opacity-40 uppercase tracking-[0.2em] mb-12">
                  Command + V to Begin
                </p>

                <div className="flex gap-8">
                  {[
                    { icon: ImageIcon, label: "Image" },
                    { icon: VideoIcon, label: "Video" },
                    { icon: FileText, label: "Text" },
                    { icon: LinkIcon, label: "Link" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-2">
                      <Icon className="w-5 h-5 opacity-20" />
                      <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-8 md:px-12 pb-8 flex gap-4">
        <button
          onClick={() => user && openChatWithItem(null)}
          className="flex-1 flex items-center justify-center gap-3 bg-white border border-[#141414]/10 py-4 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
        >
          <MessageSquare className="w-5 h-5 opacity-40 group-hover:opacity-100" />
          <span className="text-[10px] font-mono uppercase tracking-widest">AI Chatbot</span>
        </button>
        <button
          onClick={openImageGen}
          className="flex-1 flex items-center justify-center gap-3 bg-white border border-[#141414]/10 py-4 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
        >
          <Sparkles className="w-5 h-5 opacity-40 group-hover:opacity-100" />
          <span className="text-[10px] font-mono uppercase tracking-widest">Generate Image</span>
        </button>
      </div>

      {/* AI Features Rail */}
      <div className="p-8 md:p-12 border-t border-[#141414]/5 bg-[#F9F9F7]/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-[#141414]/10" />
          <span className="text-[9px] font-mono opacity-30 uppercase tracking-[0.4em]">
            System Intelligence
          </span>
          <div className="h-[1px] flex-1 bg-[#141414]/10" />
        </div>
        <div className="grid grid-cols-3 gap-8">
          {[
            { label: "Smart Name", icon: Zap, value: "98%" },
            { label: "Auto Summary", icon: Layers, value: "Active" },
            { label: "Context Aware", icon: Search, value: "v3.0" },
          ].map((f, i) => (
            <div key={f.label} className="flex flex-col gap-3 group/feature">
              <div className="flex items-center justify-between">
                <f.icon className="w-4 h-4 opacity-20 group-hover/feature:opacity-100 transition-opacity" />
                <span className="text-[8px] font-mono opacity-30">{f.value}</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest">{f.label}</span>
              <div className="h-1 w-full bg-[#141414]/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "60%" }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                  className="h-full bg-[#141414]/20 group-hover/feature:bg-[#141414]/40 transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
