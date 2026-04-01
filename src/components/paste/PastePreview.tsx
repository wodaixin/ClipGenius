import React, { useState } from "react";
import { FileText, Link as LinkIcon, Code, Copy, CheckCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { PasteItem } from "../../types";
import { cn } from "../../lib/utils";

interface PastePreviewProps {
  item: PasteItem;
  className?: string;
  full?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-auto p-1 text-white/40 hover:text-white/80 transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
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
        <div className={cn("w-full flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden max-h-[85vh]", className)}>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] shrink-0">
            <Code className="w-3 h-3 text-white/40" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">markdown</span>
            <CopyButton text={item.content} />
          </div>
          <div className="flex-1 overflow-auto p-8 prose prose-invert prose-sm max-w-none scrollbar-thin-light [&_pre]:!p-0 [&_pre]:!bg-transparent [&_pre]:!rounded-none [&_pre]:!-mx-0 [&_li_pre]:!-ml-6 [&_pre_code]:!text-xs [&_pre_code.hljs]:rounded-lg">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{item.content}</ReactMarkdown>
          </div>
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
          <CopyButton text={item.content} />
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
          <div className="flex-1 overflow-hidden p-4 text-xs font-mono text-[#d4d4d4] leading-relaxed line-clamp-6 whitespace-pre-wrap break-all">
            {item.content}
          </div>
        )}
      </div>
    );
  }

  if (item.type === "text" || item.type === "url") {
    if (full) return (
      <div className={cn("w-full flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden max-h-[85vh]", className)}>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] shrink-0">
          {item.type === "url" ? <LinkIcon className="w-3 h-3 text-white/40" /> : <FileText className="w-3 h-3 text-white/40" />}
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{item.type}</span>
          <CopyButton text={item.content} />
        </div>
        <div
          className="flex-1 overflow-y-auto p-6 text-sm font-sans text-[#d4d4d4] leading-relaxed whitespace-pre-wrap break-words scrollbar-thin-light"
        >
          {item.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center p-8 bg-[#F9F9F7] rounded-2xl", className)}>
      {item.type === "url" ? (
        <LinkIcon className="w-8 h-8 opacity-10 mb-3 shrink-0" />
      ) : (
        <FileText className="w-8 h-8 opacity-10 mb-3 shrink-0" />
      )}
      <p className="text-xs font-sans leading-relaxed opacity-60 line-clamp-6 break-all text-center">{item.content}</p>
    </div>
  );
}
