import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ChatProvider } from "./context/ChatContext";
import { useFirestoreSync } from "./hooks/useFirestoreSync";
import { useClipboard } from "./hooks/useClipboard";
import { PasteZone } from "./components/layout/PasteZone";
import { HistoryPane } from "./components/layout/HistoryPane";
import { ChatModal } from "./components/chat/ChatModal";
import { ImageGenModal } from "./components/imagegen/ImageGenModal";

function AppContent() {
  // Background Firestore sync (invisible)
  useFirestoreSync();

  // Clipboard event listener
  useClipboard();

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      <div className="min-h-screen md:h-full flex flex-col md:flex-row">
        <PasteZone />
        <HistoryPane />
      </div>
      <ChatModal />
      <ImageGenModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </AppProvider>
    </AuthProvider>
  );
}
