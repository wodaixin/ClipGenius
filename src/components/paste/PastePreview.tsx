import React from "react";
import { Image as ImageIcon, Video as VideoIcon, FileText, Link as LinkIcon } from "lucide-react";
import { PasteItem } from "../../types";
import { cn } from "../../lib/utils";

interface PastePreviewProps {
  item: PasteItem;
  className?: string;
}

export function PastePreview({ item, className }: PastePreviewProps) {
  if (item.type === "image") {
    return (
      <img
        src={item.content}
        alt="Preview"
        className={cn("w-full h-full object-cover transition-all duration-700 rounded-2xl", className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (item.type === "video") {
    return (
      <video
        src={item.content}
        className={cn("w-full h-full object-cover transition-all duration-700 rounded-2xl", className)}
        controls={false}
        muted
        loop
        onMouseOver={(e) => e.currentTarget.play()}
        onMouseOut={(e) => e.currentTarget.pause()}
      />
    );
  }

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center p-8 bg-[#F9F9F7] rounded-2xl", className)}>
      {item.type === "url" ? (
        <LinkIcon className="w-12 h-12 opacity-5 mb-4" />
      ) : (
        <FileText className="w-12 h-12 opacity-5 mb-4" />
      )}
      <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">{item.type}</span>
    </div>
  );
}
