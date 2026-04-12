import { LiveServerMessage } from "@google/genai";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => void;
      getSelectedApiKey?: () => Promise<string>;
    };
  }
}

export type PasteType = "image" | "text" | "url" | "video" | "markdown" | "code";

export interface PasteItem {
  id: string;
  type: PasteType;
  content: string; // Base64 for images/videos, raw text for others
  mimeType: string;
  timestamp: Date;
  suggestedName: string;
  summary?: string;
  isAnalyzing: boolean;
  isPinned?: boolean;
  // --- local-only sync fields (kept for soft-delete & local tracking) ---
  updatedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

export interface ChatMessage {
  id: string;
  chatId?: string; // Optional for backward compatibility
  role: "user" | "model";
  text: string;
  thinking?: string;
  timestamp: Date;
  attachments?: StoredAttachment[];
  isResponding?: boolean; // true when model started but no content yet
}

export interface StoredAttachment {
  id: string;
  type: PasteType;
  content: string; // base64 data URI
  mimeType: string;
  suggestedName: string;
}

// Re-exported from @google/genai for use in services
export type { LiveServerMessage };

// Connection object returned by ai.live.connect()
export interface LiveSessionConnection {
  close: () => void;
}
