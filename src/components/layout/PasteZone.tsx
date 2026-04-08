import React, { useState, useRef, useEffect } from "react";
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
  Settings,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { usePasteStore } from "../../hooks/usePasteStore";
import { useClipboard } from "../../hooks/useClipboard";
import { useChat } from "../../context/ChatContext";
import { useImageGen } from "../../hooks/useImageGen";
import { SettingsModal } from "./SettingsModal";
import { cn } from "../../lib/utils";

export function PasteZone() {
  const { t, i18n } = useTranslation();
  const { user, login, logout } = useAuth();
  const { isDragging, isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled } = usePasteStore();
  const { handleDragOver, handleDragLeave, handleDrop } = useClipboard();
  const { openChatWithItem } = useChat();
  const { openImageGen } = useImageGen();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [settingsConfirmOpen, setSettingsConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Countdown timer for advanced settings protection
  useEffect(() => {
    if (!settingsConfirmOpen) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [settingsConfirmOpen]);

  return (
    <aside className="w-full md:w-[45%] min-h-screen md:h-full md:overflow-y-auto shrink-0 border-r border-[#141414]/10 bg-white flex flex-col relative">
      {/* Vertical Rail Text */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden xl:block">
        <span className="writing-vertical text-xs font-sans opacity-40 uppercase tracking-[0.4em] select-none">
          {t("pasteZone.rail")}
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
              <p className="text-xs font-sans opacity-75 uppercase tracking-widest mt-1">
                {t("pasteZone.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 opacity-75" />
              </button>
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#141414]/10 overflow-hidden z-50"
                  >
                    {/* Auto AI */}
                    <div className="px-4 py-3 border-b border-[#141414]/5 flex items-center justify-between">
                      <span className="text-xs font-sans uppercase tracking-widest opacity-75">
                        {t("pasteZone.settings.autoAi")}
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
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-1 w-2 h-2 bg-white rounded-full"
                        />
                      </button>
                    </div>
                    {/* Language */}
                    <div className="px-4 py-3 border-b border-[#141414]/5">
                      <span className="text-xs font-sans uppercase tracking-widest opacity-75 block mb-3">
                        {t("pasteZone.settings.language")}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => i18n.changeLanguage("en")}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-sans uppercase tracking-widest transition-all border",
                            i18n.language === "en"
                              ? "bg-[#141414] text-white border-[#141414]"
                              : "border-[#141414]/10 hover:border-[#141414]/30"
                          )}
                        >
                          {t("pasteZone.settings.english")}
                        </button>
                        <button
                          onClick={() => i18n.changeLanguage("zh")}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-sans uppercase tracking-widest transition-all border",
                            i18n.language === "zh"
                              ? "bg-[#141414] text-white border-[#141414]"
                              : "border-[#141414]/10 hover:border-[#141414]/30"
                          )}
                        >
                          {t("pasteZone.settings.chinese")}
                        </button>
                      </div>
                    </div>
                    {/* Advanced Settings Button */}
                    <div className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSettingsOpen(false);
                          setSettingsConfirmOpen(true);
                        }}
                        className="w-full py-2 px-4 bg-[#141414] text-white text-xs font-sans uppercase tracking-widest rounded-xl hover:bg-[#333] transition-all"
                      >
                        {t("pasteZone.settings.advanced")}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-sans opacity-75 uppercase tracking-widest">
                    {user.displayName}
                  </span>
                  <button
                    onClick={logout}
                    className="text-xs font-sans font-bold hover:underline flex items-center gap-1"
                  >
                    <span>{t("pasteZone.logout")}</span>
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
                className="px-4 py-2 bg-[#141414] text-white text-xs font-sans uppercase tracking-widest rounded-full hover:bg-[#333] transition-colors"
              >
                {t("pasteZone.loginWithGoogle")}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] uppercase">
            {t("pasteZone.heading")} <br />
            <span className="text-[#141414]/20 italic font-serif lowercase">{t("pasteZone.subheading")}</span>
          </h2>
          <p className="text-sm opacity-70 max-w-sm leading-relaxed">
            {t("pasteZone.description")}
          </p>
        </div>
      </header>

      {/* Large Paste Zone */}
      <div className="flex-1 p-8 md:p-12 flex flex-col">
        <div
          className={cn(
            "flex-1 border-2 border-dashed border-[#141414]/20 rounded-3xl flex flex-col items-center justify-center text-center transition-all duration-700 relative overflow-hidden group p-8 min-h-[200px]",
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
                  {t("pasteZone.dropToAnalyze")}
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
                  <Plus className="w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-widest mb-2">{t("pasteZone.pasteZone")}</h3>
                <p className="text-[12px] font-sans opacity-75 uppercase tracking-[0.2em] mb-12">
                  {t("pasteZone.commandHint")}
                </p>

                <div className="flex gap-8">
                  {[
                    { icon: ImageIcon, label: t("pasteZone.typeImage"), key: "image" },
                    { icon: VideoIcon, label: t("pasteZone.typeVideo"), key: "video" },
                    { icon: FileText, label: t("pasteZone.typeText"), key: "text" },
                    { icon: LinkIcon, label: t("pasteZone.typeLink"), key: "link" },
                  ].map(({ icon: Icon, label, key }) => (
                    <div key={key} className="flex flex-col items-center gap-2">
                      <Icon className="w-5 h-5 opacity-40" />
                      <span className="text-xs font-sans uppercase tracking-widest opacity-70">
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
          onClick={() => openChatWithItem(null)}
          className="flex-1 flex items-center justify-center gap-3 bg-white border border-[#141414]/10 py-4 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
        >
          <MessageSquare className="w-5 h-5 opacity-75 group-hover:opacity-100" />
          <span className="text-xs font-sans uppercase tracking-widest">{t("pasteZone.aiChatbot")}</span>
        </button>
        <button
          onClick={openImageGen}
          className="flex-1 flex items-center justify-center gap-3 bg-white border border-[#141414]/10 py-4 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
        >
          <Sparkles className="w-5 h-5 opacity-75 group-hover:opacity-100" />
          <span className="text-xs font-sans uppercase tracking-widest">{t("pasteZone.generateImage")}</span>
        </button>
      </div>

      {/* AI Features Rail */}
      <div className="p-8 md:p-12 border-t border-[#141414]/5 bg-[#F9F9F7]/50">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-[#141414]/10" />
          <span className="text-xs font-sans opacity-70 uppercase tracking-[0.4em]">
            {t("pasteZone.features.systemIntelligence")}
          </span>
          <div className="h-[1px] flex-1 bg-[#141414]/10" />
        </div>
        <div className="grid grid-cols-3 gap-8">
          {[
            { label: t("pasteZone.features.smartName"), icon: Zap, value: "98%" },
            { label: t("pasteZone.features.autoSummary"), icon: Layers, value: "Active" },
            { label: t("pasteZone.features.contextAware"), icon: Search, value: "v3.0" },
          ].map((f, i) => (
            <div key={f.label} className="flex flex-col gap-3 group/feature">
              <div className="flex items-center justify-between">
                <f.icon className="w-4 h-4 opacity-40 group-hover/feature:opacity-100 transition-opacity" />
                <span className="text-xs font-sans opacity-70">{f.value}</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{f.label}</span>
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
      
      {/* Advanced Settings Modal */}
      <SettingsModal 
        isOpen={advancedSettingsOpen} 
        onClose={() => setAdvancedSettingsOpen(false)} 
      />

      <AnimatePresence>
        {settingsConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/40 backdrop-blur-sm p-4"
            onClick={() => setSettingsConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#141414]/10 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">
                  {t("pasteZone.settings.advancedConfirmTitle")}
                </h3>
                <p className="text-xs text-[#141414]/60 leading-relaxed mb-6">
                  {t("pasteZone.settings.advancedConfirmWarning")}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSettingsConfirmOpen(false)}
                    className="flex-1 py-3 border border-[#141414]/10 text-xs font-sans uppercase tracking-widest rounded-xl hover:bg-[#141414]/5 transition-all"
                  >
                    {t("pasteZone.settings.cancel")}
                  </button>
                  <button
                    onClick={() => {
                      setSettingsConfirmOpen(false);
                      setAdvancedSettingsOpen(true);
                    }}
                    disabled={countdown > 0}
                    className="flex-1 py-3 bg-[#141414] text-white text-xs font-sans uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#333]"
                  >
                    {countdown > 0
                      ? t("pasteZone.settings.waitCountdown", { count: countdown })
                      : t("pasteZone.settings.confirm")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
