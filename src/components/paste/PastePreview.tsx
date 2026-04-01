import React from "react";
import { FileText, Link as LinkIcon, Code } from "lucide-react";
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

  if (item.type === "code") {
    const lang = item.mimeType.startsWith("code/") ? item.mimeType.slice(5) : "code";
    return (
      <div className={cn("w-full h-full flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden", full && "rounded-none", className)}>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] shrink-0">
          <Code className="w-3 h-3 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{lang}</span>
        </div>
        <pre className={cn("flex-1 overflow-auto p-4 text-xs font-mono text-[#d4d4d4] leading-relaxed", !full && "line-clamp-6")}>
          <code>{item.content}</code>
        </pre>
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
            <LinkIcon className="w-8 h-8 opacity-10 mb-3 shrink-0" />
          ) : (
            <FileText className="w-8 h-8 opacity-10 mb-3 shrink-0" />
          )}
          <p className="text-xs font-sans leading-relaxed opacity-60 line-clamp-6 break-all text-center">{item.content}</p>
        </>
      )}
    </div>
  );
}
