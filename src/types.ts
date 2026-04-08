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
  userId: string;
  // --- sync fields ---
  updatedAt?: Date; // last modification time, refreshed on every update
  syncRev?: number; // monotonically increasing version, 0 = never synced
  isDeleted?: boolean; // soft-delete flag
  deletedAt?: Date; // soft-delete timestamp
}

/** Local sync status for a single PasteItem */
export type SyncStatus = 'synced' | 'pending' | 'conflict';

/** Tracks the sync state of one PasteItem */
export interface SyncState {
  status: SyncStatus;
  localUpdatedAt: Date; // the updatedAt of the local version
  localSyncRev: number; // the syncRev of the local version (-1 if never synced)
  pendingCloudRev?: number; // the syncRev we are waiting for the cloud to acknowledge
  retryCount: number; // current retry attempt count
  lastError?: string; // last error message
}

/** The persisted sync store — lives in localStorage */
export interface SyncStore {
  states: Record<string, SyncState>;
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
