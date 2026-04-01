import React from "react";
import { FileText, Link as LinkIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PasteItem } from "../../types";
import { cn } from "../../lib/utils";

interface PastePreviewProps {
  item: PasteItem;
  className?: string;
  full?: boolean; // lightbox mode
}

export function PastePreview({ item, className, full }: PastePreviewProps) {
  if (item.type === "image") {
    return (
      <img
        src={item.content}
        alt="Preview"
        className={cn("w-full h-full object-cover transition-all duration-700 rounded-2xl", full && "object-contain rounded-none", className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (item.type === "video") {
    return (
      <video
        src={item.content}
        className={cn("w-full h-full object-cover transition-all duration-700 rounded-2xl", full && "object-contain rounded-none", className)}
        controls={full}
        muted
        loop
        onMouseOver={(e) => !full && e.currentTarget.play()}
        onMouseOut={(e) => !full && e.currentTarget.pause()}
      />
    );
  }

  if (item.type === "markdown") {
    if (full) {
      return (
        <div className={cn("w-full h-full overflow-auto p-8 bg-[#F9F9F7] rounded-2xl prose prose-sm max-w-none", className)}>
          <ReactMarkdown>{item.content}</ReactMarkdown>
        </div>
      );
    }
    // Thumbnail: plain text preview, no rendering
    const plainText = item.content.replace(/^#{1,6}\s+/gm, "").replace(/[*_`>\[\]]/g, "").trim();
    return (
      <div className={cn("w-full h-full flex flex-col p-5 bg-[#F9F9F7] rounded-2xl overflow-hidden", className)}>
        <span className="text-[10px] font-sans font-bold uppercase tracking-widest opacity-50 mb-2">MD</span>
        <p className="text-xs font-sans leading-relaxed opacity-75 line-clamp-6 break-words">{plainText}</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center p-8 bg-[#F9F9F7] rounded-2xl", full && "items-start justify-start overflow-auto p-10", className)}>
      {full ? (
        <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap break-words w-full">{item.content}</p>
      ) : (
        <>
          {item.type === "url" ? (
            <LinkIcon className="w-12 h-12 opacity-5 mb-4" />
          ) : (
            <FileText className="w-12 h-12 opacity-5 mb-4" />
          )}
          <span className="text-[8px] font-mono uppercase tracking-widest opacity-50">{item.type}</span>
        </>
      )}
    </div>
  );
}
