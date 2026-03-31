export type PasteType = "image" | "text" | "url" | "video";

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
  userId: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}
