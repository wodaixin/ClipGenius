import React from "react";
import { FileText, Link as LinkIcon, Code } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { PasteItem } from "../../types";
import { cn } from "../../lib/utils";

interface PastePreviewProps {
  item: PasteItem;
  className?: string;
  full?: boolean; // lightbox mode
}

export function PastePreview({ item, className, full }: PastePreviewProps) {
  if (item.type === "image") {
    if (full) return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <img src={item.content} alt="Preview" className={cn("max-w-full max-h-full object-contain", className)} referrerPolicy="no-referrer" />
      </div>
    );
    return <img src={item.content} alt="Preview" className={cn("w-full h-full object-cover transition-all duration-700 rounded-2xl", className)} referrerPolicy="no-referrer" />;
  }

  if (item.type === "video") {
    if (full) return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <video src={item.content} className={cn("max-w-full max-h-full object-contain", className)} controls muted loop />
      </div>
    );
    return (
      <video
        src={item.content}
        className={cn("w-full h-full object-cover transition-all duration-700 rounded-2xl", className)}
        muted loop
        onMouseOver={(e) => e.currentTarget.play()}
        onMouseOut={(e) => e.currentTarget.pause()}
      />
    );
  }

  if (item.type === "markdown") {
    if (full) {
      return (
        <div className={cn("w-full h-full overflow-auto p-8 bg-[#1e1e1e] text-[#d4d4d4] prose prose-invert prose-sm max-w-none scrollbar-thin-light", className)}>
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{item.content}</ReactMarkdown>
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
      <div className={cn("w-full flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden", full ? "max-h-[85vh]" : "h-full", className)}>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] shrink-0">
          <Code className="w-3 h-3 text-white/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{lang}</span>
        </div>
        {full ? (
          <SyntaxHighlighter
            language={lang}
            style={atomOneDark}
            customStyle={{ margin: 0, flex: 1, overflow: "auto", background: "#1e1e1e", fontSize: "0.75rem", lineHeight: "1.6" }}
            className="scrollbar-thin-light"
          >
            {item.content}
          </SyntaxHighlighter>
        ) : (
          <pre className="flex-1 overflow-hidden p-4 text-xs font-mono text-[#d4d4d4] leading-relaxed line-clamp-6">
            <code>{item.content}</code>
          </pre>
        )}
      </div>
    );
  }

  return (
    <div
      style={full ? { maxHeight: "85vh", overflowY: "auto" } : undefined}
      className={cn(full ? "w-full p-10 bg-[#1e1e1e] text-[#d4d4d4] rounded-2xl scrollbar-thin-light" : "w-full h-full flex flex-col items-center justify-center p-8 bg-[#F9F9F7] rounded-2xl", className)}
    >
      {full ? (
        <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden w-full">{item.content}</p>
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
