import React from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import {
  MessageSquare,
  Sparkles,
  Trash2,
  Mic,
  Loader2,
  Volume2,
  Send,
  XCircle,
} from "lucide-react";
import { useChat } from "../../hooks/useChat";
import { useAppContext } from "../../context/AppContext";
import { ChatContextItem } from "./ChatContextItem";
import { cn } from "../../lib/utils";

export function ChatModal() {
  const {
    chatMessages,
    chatInput,
    isChatLoading,
    isChatOpen,
    isLiveActive,
    liveTranscription,
    setChatInput,
    closeChat,
    clearChat,
    sendMessage,
    startLiveSession,
    stopLiveSession,
  } = useChat();

  const { contextItem, setContextItem } = useAppContext();

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
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
            {/* Header */}
            <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-[#F9F9F7]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#141414] rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-sm">PasteEx Intelligence</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5 opacity-40 hover:opacity-100" />
                </button>
                <button
                  onClick={isLiveActive ? stopLiveSession : startLiveSession}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isLiveActive ? "bg-red-500 text-white animate-pulse" : "hover:bg-[#141414]/5"
                  )}
                >
                  {isLiveActive ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5 opacity-30" />
                  )}
                </button>
                <button
                  onClick={closeChat}
                  className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors"
                >
                  <XCircle className="w-5 h-5 opacity-30" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLiveActive && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Volume2 className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-lg font-bold uppercase tracking-widest mb-2">Live Voice Active</h4>
                  <p className="text-xs font-mono opacity-40 max-w-xs">
                    {liveTranscription || "Listening to your voice..."}
                  </p>
                </div>
              )}

              {chatMessages.length === 0 && !isLiveActive && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="text-xs font-mono uppercase tracking-widest">
                    Ask me anything about your captures
                  </p>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#141414] text-white rounded-tr-none"
                        : "bg-[#F0F0EE] text-[#141414] rounded-tl-none"
                    )}
                  >
                    <div className="prose prose-sm max-w-none prose-invert">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono opacity-30 mt-1 uppercase tracking-widest">
                    {format(msg.timestamp, "HH:mm")}
                  </span>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center gap-3 opacity-40">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Thinking...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-[#141414]/5 bg-[#F9F9F7]">
              {contextItem && (
                <ChatContextItem
                  item={contextItem}
                  onDismiss={() => setContextItem(null)}
                />
              )}
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={
                    contextItem ? "ASK ABOUT THIS CONTEXT..." : "TYPE YOUR MESSAGE..."
                  }
                  className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 pl-6 pr-16 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#141414] text-white rounded-xl flex items-center justify-center disabled:opacity-20 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
