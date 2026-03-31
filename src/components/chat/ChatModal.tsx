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
  Film,
} from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { useAppContext } from "../../context/AppContext";
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
        <Film className="w-8 h-8 text-white opacity-50" />
        <video
          src={item.content}
          className="absolute inset-0 w-full h-full object-contain"
          controls
        />
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 p-4 bg-[#F9F9F7]">
      <div className="flex-shrink-0 w-8 h-8 bg-[#141414]/5 rounded-lg flex items-center justify-center">
        <span className="text-[8px] font-mono uppercase opacity-40 leading-none">
          {item.type === "text" ? "TXT" : "URL"}
        </span>
      </div>
      <p className="text-[11px] font-mono opacity-60 leading-relaxed line-clamp-4 break-all">
        {item.type === "text"
          ? item.content
          : item.content}
      </p>
    </div>
  );
}

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
    startLiveSessionHandler,
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
                  onClick={isLiveActive ? stopLiveSession : startLiveSessionHandler}
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
                  {/* Inline attachments (Gemini-style — shown above text bubble) */}
                  {msg.role === "user" && msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-1 rounded-2xl rounded-br-sm overflow-hidden border border-[#141414]/10">
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

                  {/* Text bubble — always rendered, uses placeholder when empty */}
                  <div
                    className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#141414] text-white rounded-tr-none"
                        : "bg-[#F0F0EE] text-[#141414] rounded-tl-none"
                    )}
                  >
                    <div className="prose prose-sm max-w-none prose-invert">
                      <ReactMarkdown>
                        {msg.text ||
                          (msg.role === "user" && msg.attachments?.length
                            ? " "
                            : msg.text)}
                      </ReactMarkdown>
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
                        <Film className="w-5 h-5 opacity-40" />
                      )}
                      {contextItem.type === "text" && (
                        <span className="text-[8px] font-mono opacity-40 uppercase leading-none text-center px-1">TXT</span>
                      )}
                      {contextItem.type === "url" && (
                        <span className="text-[8px] font-mono opacity-40 uppercase leading-none text-center px-1">URL</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">Attaching</p>
                      <p className="text-[11px] font-bold truncate uppercase tracking-tighter">
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
                    <XCircle className="w-4 h-4 opacity-30 hover:opacity-100" />
                  </button>
                </div>
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
                  disabled={isChatLoading || (!chatInput.trim() && !contextItem)}
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
