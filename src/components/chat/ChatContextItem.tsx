import React from "react";
import { XCircle } from "lucide-react";
import { PasteItem } from "../../types";
import { PastePreview } from "../paste/PastePreview";
import { format } from "date-fns";

interface ChatContextItemProps {
  item: PasteItem;
  onDismiss: () => void;
}

export function ChatContextItem({ item, onDismiss }: ChatContextItemProps) {
  return (
    <div className="mb-4 p-3 bg-white border border-[#141414]/10 rounded-2xl flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-[#F9F9F7] rounded-lg flex-shrink-0 flex items-center justify-center border border-[#141414]/5 overflow-hidden">
          {item.type === "image" ? (
            <img
              src={item.content}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[9px] font-mono opacity-40 uppercase">{item.type}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">Referencing Context</p>
          <p className="text-[11px] font-bold truncate uppercase tracking-tighter">
            {item.suggestedName ||
              (item.type === "text" ? item.content : item.type)}
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
      >
        <XCircle className="w-4 h-4 opacity-30 hover:opacity-100" />
      </button>
    </div>
  );
}
