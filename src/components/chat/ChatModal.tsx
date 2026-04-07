import { motion, AnimatePresence } from "motion/react";
import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { prepare, layout } from "@chenglou/pretext";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  MessageSquare,
  Sparkles,
  Trash2,
  Mic,
  Loader2,
  Volume2,
  Send,
  XCircle,
  Film,
  AlertTriangle,
  Code,
} from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { StoredAttachment } from "../../types";

function AttachmentPreview({ item }: { item: StoredAttachment }) {
  if (item.type === "image") {
    return (
      <img
        src={item.content}
        alt={item.suggestedName}
        className="w-full max-h-64 object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (item.type === "video") {
    return (
      <div className="relative bg-black flex items-center justify-center h-40">
        <Film className="w-8 h-8 text-white opacity-70" />
        <video
          src={item.content}
          className="absolute inset-0 w-full h-full object-contain"
          controls
        />
      </div>
    );
  }
  if (item.type === "code") {
    const lang = item.mimeType?.startsWith("code/") ? item.mimeType.slice(5) : "code";
    return (
      <div className="bg-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d]">
          <Code className="w-3 h-3 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{lang}</span>
        </div>
        <pre className="p-3 text-xs font-mono text-[#d4d4d4] leading-relaxed line-clamp-4 overflow-hidden">
          <code>{item.content}</code>
        </pre>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 p-4 bg-[#F9F9F7]">
      <div className="flex-shrink-0 w-8 h-8 bg-[#141414]/5 rounded-lg flex items-center justify-center">
        <span className="text-[8px] font-mono uppercase opacity-75 leading-none">
          {item.type === "text" ? "TXT" : "URL"}
        </span>
      </div>
      <p className="text-[12px] font-sans opacity-75 leading-relaxed line-clamp-4 break-all">
        {item.content}
      </p>
    </div>
  );
}

export function ChatModal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    chatMessages,
    chatInput,
    isChatLoading,
    isChatOpen,
    isLiveActive,
    liveTranscription,
    chatError,
    setChatInput,
    closeChat,
    clearChat,
    sendMessage,
    startLiveSessionHandler,
    stopLiveSession,
    clearChatError,
  } = useChat();

  const { contextItem, setContextItem } = useAppContext();

  const modalRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  function estimateMsgHeight(index: number): number {
    const msg = chatMessages[index];
    if (!msg) return 80;
    try {
      const prepared = prepare(msg.text || msg.thinking || " ", "14px Inter");
      const { lineCount } = layout(prepared, 380, 22);
      return 48 + lineCount * 22 + (msg.attachments?.length ? 180 : 0);
    } catch {
      return 80;
    }
  }

  const virtualizer = useVirtualizer({
    count: chatMessages.length,
    getScrollElement: () => messagesScrollRef.current,
    estimateSize: estimateMsgHeight,
    overscan: 5,
    gap: 24,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      virtualizer.scrollToIndex(chatMessages.length - 1, { align: "end" });
    }
  }, [chatMessages.length]);

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-2xl h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#141414]/10"
          >
            <>
              {/* Header */}
              <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-[#F9F9F7]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#141414] rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-sm">{t("chat.title")}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5 opacity-75 hover:opacity-100" />
                </button>
                <button
                  onClick={isLiveActive ? stopLiveSession : startLiveSessionHandler}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isLiveActive ? "bg-red-500 text-white animate-pulse" : "hover:bg-[#141414]/5"
                  )}
                >
                  {isLiveActive ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5 opacity-50" />
                  )}
                </button>
                <button
                  onClick={closeChat}
                  className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 opacity-50" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-6">
              {isLiveActive && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Volume2 className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-lg font-bold uppercase tracking-widest mb-2">{t("chat.liveVoiceActive")}</h4>
                  <p className="text-xs font-sans opacity-70 max-w-xs">
                    {liveTranscription || t("chat.listening")}
                  </p>
                </div>
              )}

              {chatMessages.length === 0 && !isLiveActive && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-xs font-sans uppercase tracking-widest opacity-75">
                    {t("chat.emptyPrompt")}
                  </p>
                </div>
              )}

              {chatMessages.length > 0 && (
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((vItem) => {
                    const msg = chatMessages[vItem.index];
                    return (
                      <div
                        key={vItem.key}
                        data-index={vItem.index}
                        ref={virtualizer.measureElement}
                        style={{ position: "absolute", top: vItem.start, left: 0, right: 0 }}
                      >
                        <div className={cn("flex items-start gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                          {msg.role === "model" && (
                            <div className="w-6 h-6 rounded-full bg-[#141414] flex items-center justify-center shrink-0">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
                            {msg.role === "user" && msg.attachments && msg.attachments.length > 0 && (
                              <div className="mb-1 rounded-3xl overflow-hidden border border-[#141414]/10">
                                {msg.attachments.length === 1 ? (
                                  <AttachmentPreview item={msg.attachments[0]} />
                                ) : (
                                  <div className="grid grid-cols-2 gap-0.5">
                                    {msg.attachments.map((att) => (
                                      <AttachmentPreview key={att.id} item={att} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {msg.role === "model" && (
                              msg.thinking ? (
                                <div className="mb-1 p-3 rounded-3xl bg-[#E8E8E4] text-[12px] font-sans opacity-80 leading-relaxed whitespace-pre-wrap break-words">
                                  <div className="uppercase tracking-widest opacity-70 mb-1 text-xs">{t("chat.thinking")}</div>
                                  {msg.thinking}
                                </div>
                              ) : msg.isResponding ? (
                                <div className="mb-1 flex items-center gap-2 p-3 rounded-3xl bg-[#E8E8E4]">
                                  <Loader2 className="w-3 h-3 animate-spin opacity-75" />
                                  <span className="text-xs font-sans opacity-75 uppercase tracking-widest">{t("chat.thinking")}</span>
                                </div>
                              ) : null
                            )}
                            {msg.text && (
                              <div className={cn("p-4 text-sm leading-relaxed", msg.role === "user" ? "bg-[#1a1a1a] text-white rounded-3xl" : "bg-[#F0F0EE] text-[#141414] rounded-3xl")}>
                                <div className={cn("prose prose-sm max-w-none", msg.role === "user" ? "prose-invert" : "")}>
                                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                              </div>
                            )}
                            <span className="text-xs font-sans opacity-70 mt-1 uppercase tracking-widest">
                              {format(msg.timestamp, "HH:mm")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <AnimatePresence>
                {chatError && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mt-6"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-red-700 font-mono leading-relaxed">{chatError}</p>
                    </div>
                    <button onClick={clearChatError} className="p-1 hover:bg-red-100 rounded-full transition-colors flex-shrink-0">
                      <XCircle className="w-4 h-4 text-red-400 hover:text-red-600" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-6 border-t border-[#141414]/5 bg-[#F9F9F7]">
              {/* Sticky attachment preview — disappears after send */}
              {contextItem && (
                <div className="mb-3 p-3 bg-white border border-[#141414]/10 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                    <div className="w-10 h-10 bg-[#F9F9F7] rounded-lg flex-shrink-0 flex items-center justify-center border border-[#141414]/5 overflow-hidden">
                      {contextItem.type === "image" && (
                        <img
                          src={contextItem.content}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {contextItem.type === "video" && (
                        <Film className="w-5 h-5 opacity-75" />
                      )}
                      {contextItem.type === "text" && (
                        <span className="text-[8px] font-mono opacity-75 uppercase leading-none text-center px-1">TXT</span>
                      )}
                      {contextItem.type === "url" && (
                        <span className="text-[8px] font-mono opacity-75 uppercase leading-none text-center px-1">URL</span>
                      )}
                      {contextItem.type === "code" && (
                        <Code className="w-4 h-4 opacity-75" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-sans uppercase tracking-widest opacity-75">{t("chat.attaching")}</p>
                      <p className="text-[12px] font-bold truncate uppercase tracking-tighter">
                        {contextItem.type === "text"
                          ? contextItem.content.slice(0, 60) + (contextItem.content.length > 60 ? "..." : "")
                          : contextItem.type === "url"
                          ? contextItem.content
                          : contextItem.suggestedName || contextItem.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setContextItem(null)}
                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors flex-shrink-0"
                  >
                    <XCircle className="w-4 h-4 opacity-50 hover:opacity-100" />
                  </button>
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isChatLoading && sendMessage()}
                  placeholder={
                    contextItem ? t("chat.inputContextPlaceholder") : t("chat.inputPlaceholder")
                  }
                  className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 pl-6 pr-16 text-xs font-sans uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors"
                />
                <button
                  onClick={() => {
                    const input = modalRef.current?.querySelector('input[type="text"]') as HTMLInputElement | null;
                    sendMessage(input?.value);
                  }}
                  disabled={isChatLoading || (!chatInput.trim() && !contextItem)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#141414] text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              </div>
            </>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
