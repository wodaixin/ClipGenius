import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Clipboard, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Loader2,
  Plus,
  History,
  Zap,
  Search,
  Pin,
  PinOff,
  XCircle,
  Layers,
  MessageSquare,
  Send,
  User as UserIcon,
  LogOut,
  Sparkles,
  Mic,
  MicOff,
  Edit3,
  Volume2,
  VolumeX,
  Video as VideoIcon,
  MapPin,
  Globe,
  Wand2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { GoogleGenAI, ThinkingLevel, Modality, LiveServerMessage } from "@google/genai";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { PasteItem, ChatMessage } from "./types";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  getDocs,
  updateDoc, 
  serverTimestamp,
  Timestamp,
  User
} from "./firebase";

import { 
  savePaste, 
  getPastes, 
  deletePaste as deleteLocalPaste, 
  clearUnpinnedPastes, 
  updatePaste as updateLocalPaste,
  saveChatMessage,
  getChatMessages
} from "./lib/db";

// We will initialize GoogleGenAI inside functions to use the latest API key
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Add window type for AI Studio
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [items, setItems] = useState<PasteItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSummary, setEditSummary] = useState("");
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [contextItem, setContextItem] = useState<PasteItem | null>(null);

  // Image Gen State
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageQuality, setImageQuality] = useState<"standard" | "pro">("standard");
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Check for API key when image gen modal opens
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    if (isImageGenOpen) {
      checkApiKey();
    }
  }, [isImageGenOpen]);

  // Voice Chat State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveSession, setLiveSession] = useState<any>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Data Sync (Local-First)
  useEffect(() => {
    const loadData = async () => {
      const pastes = await getPastes();
      setItems(pastes);
      const chats = await getChatMessages();
      setChatMessages(chats);
    };
    loadData();
  }, []);

  // Firestore Sync (Background)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/pastes`),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const cloudItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate() : new Date()
        } as PasteItem;
      });

      // Merge cloud items into local storage and state
      // We prioritize cloud items for metadata (summary, suggestedName)
      for (const cloudItem of cloudItems) {
        await savePaste(cloudItem);
      }
      
      // Refresh local state after merge
      const allPastes = await getPastes();
      setItems(allPastes);
    }, (error) => {
      console.error("Firestore sync error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Chat Sync (Cloud only)
  useEffect(() => {
    if (!user || !isChatOpen) return;

    const chatId = contextItem?.id || 'default';
    const q = query(
      collection(db, `users/${user.uid}/chats/${chatId}/messages`),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate() : new Date()
        } as ChatMessage;
      });
      setChatMessages(messages);
    });

    return () => unsubscribe();
  }, [user, isChatOpen, contextItem?.id]);

  const clearChat = async () => {
    const chatId = contextItem?.id || 'default';
    
    // 1. Clear local state immediately for instant feedback
    setChatMessages([]);
    
    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/chats/${chatId}/messages`));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        // 2. Delete all messages found in the snapshot
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        // 3. Final local clear to ensure any late-arriving snapshots are overridden
        setChatMessages([]);
      } catch (error) {
        console.error("Failed to clear chat:", error);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Handle paste event
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    if (clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const id = crypto.randomUUID();
            const type = file.type.startsWith("video/") ? "video" : "image";
            const newItem: PasteItem = {
              id,
              type,
              content: base64,
              mimeType: file.type,
              timestamp: new Date(),
              suggestedName: `${type === "video" ? "vid" : "img"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
              isAnalyzing: user ? isAutoAnalyzeEnabled : false,
              isPinned: false,
              userId: user?.uid || "guest"
            };
            
            // Always save locally
            await savePaste(newItem);
            setItems(prev => [newItem, ...prev]);

            // Sync to cloud if logged in
            if (user) {
              await setDoc(doc(db, `users/${user.uid}/pastes`, id), {
                ...newItem,
                timestamp: serverTimestamp()
              });
            }

            if (user && isAutoAnalyzeEnabled) {
              analyzeContent(newItem);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }

    const text = clipboardData.getData("text/plain");
    if (text && clipboardData.files.length === 0) {
      const isUrl = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text.trim());
      const id = crypto.randomUUID();
      const newItem: PasteItem = {
        id,
        type: isUrl ? "url" : "text",
        content: text,
        mimeType: isUrl ? "text/uri-list" : "text/plain",
        timestamp: new Date(),
        suggestedName: `${isUrl ? "link" : "note"}_${format(new Date(), "yyyyMMdd_HHmmss")}`,
        isAnalyzing: user ? isAutoAnalyzeEnabled : false,
        isPinned: false,
        userId: user?.uid || "guest"
      };
      
      // Always save locally
      await savePaste(newItem);
      setItems(prev => [newItem, ...prev]);

      // Sync to cloud if logged in
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/pastes`, id), {
          ...newItem,
          timestamp: serverTimestamp()
        });
      }

      if (user && isAutoAnalyzeEnabled) {
        analyzeContent(newItem);
      }
    }
  }, [user, isAutoAnalyzeEnabled]);

  const analyzeContent = async (item: PasteItem) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
      // Set analyzing state locally first
      const analyzingItem = { ...item, isAnalyzing: true };
      await updateLocalPaste(analyzingItem);
      setItems(prev => prev.map(i => i.id === item.id ? analyzingItem : i));

      // Sync analyzing state to cloud if logged in
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/pastes`, item.id), { isAnalyzing: true });
      }

      let prompt = "";
      let parts: any[] = [];
      let model = "gemini-3-flash-preview"; // Default to Flash for all auto-analysis
      let config: any = { responseMimeType: "application/json" };

      if (item.type === "image" || item.type === "video") {
        prompt = `Analyze this ${item.type}. Suggest a short, descriptive filename (no extension) and provide a 1-sentence summary of what's in the ${item.type}. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
        parts = [
          { text: prompt },
          { inlineData: { data: item.content.split(",")[1], mimeType: item.mimeType } }
        ];
      } else if (item.type === "url") {
        prompt = `Analyze this URL: ${item.content}. Suggest a short, descriptive filename (no extension) based on the site and provide a 1-sentence summary of what it likely contains. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
        parts = [{ text: prompt }];
        config.tools = [{ googleSearch: {} }];
      } else {
        prompt = `Analyze this text: "${item.content.substring(0, 1000)}...". Suggest a short, descriptive filename (no extension) based on the content and provide a 1-sentence summary. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
        parts = [{ text: prompt }];
      }

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config
      });

      const result = JSON.parse(response.text || "{}");
      
      const updated = {
        ...item,
        suggestedName: result.suggestedName || item.suggestedName,
        summary: result.summary || "No summary available.",
        isAnalyzing: false
      };

      // Always save update locally
      await updateLocalPaste(updated);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));

      // Sync update to cloud if logged in
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/pastes`, item.id), {
          suggestedName: updated.suggestedName,
          summary: updated.summary,
          isAnalyzing: false
        });
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      const failedItem = { ...item, isAnalyzing: false };
      await updateLocalPaste(failedItem);
      setItems(prev => prev.map(i => i.id === item.id ? failedItem : i));
      
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/pastes`, item.id), { isAnalyzing: false });
      }
    }
  };

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const openChatWithItem = (item: PasteItem) => {
    setIsChatOpen(true);
    setContextItem(item);
    setChatMessages([]); // Clear messages immediately for the new context
    setChatInput(""); // Clear input, don't pre-fill with long prompt
  };

  const openImageGenWithText = (text: string) => {
    setIsImageGenOpen(true);
    setImagePrompt(`Create a high-quality visual representation of: ${text}`);
  };

  const startImageEdit = (item: PasteItem) => {
    setIsImageGenOpen(true);
    setContextItem(item);
    setImagePrompt("Add a futuristic neon glow to this image");
    setIsEditingImage(true);
  };

  const startLiveSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are ClipGenius Voice Assistant. Be concise and helpful.",
        },
        callbacks: {
          onopen: () => setIsLiveActive(true),
          onclose: () => setIsLiveActive(false),
          onmessage: (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
              setLiveTranscription(msg.serverContent.modelTurn.parts[0].text);
            }
          }
        }
      });
      setLiveSession(session);
    } catch (error) {
      console.error("Live session failed:", error);
    }
  };

  const stopLiveSession = () => {
    liveSession?.close();
    setIsLiveActive(false);
    setLiveSession(null);
  };

  const startEditing = (item: PasteItem) => {
    setEditingItemId(item.id);
    setEditName(item.suggestedName);
    setEditSummary(item.summary || "");
  };

  const saveEdit = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      const updated = { ...item, suggestedName: editName, summary: editSummary };
      
      // Always update locally
      await updateLocalPaste(updated);
      setItems(prev => prev.map(i => i.id === id ? updated : i));

      // Sync to cloud if logged in
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/pastes`, id), {
          suggestedName: editName,
          summary: editSummary
        });
      }
    }
    setEditingItemId(null);
  };

  const deleteItem = async (id: string) => {
    // Always delete locally
    await deleteLocalPaste(id);
    setItems(prev => prev.filter(i => i.id !== id));

    // Sync to cloud if logged in
    if (user) {
      await deleteDoc(doc(db, `users/${user.uid}/pastes`, id));
    }
  };

  const clearAll = async () => {
    if (window.confirm("确定要清空所有非置顶的历史记录吗？")) {
      const unpinned = items.filter(i => !i.isPinned);
      
      // Always clear locally
      await clearUnpinnedPastes();
      setItems(prev => prev.filter(i => i.isPinned));

      // Sync to cloud if logged in
      if (user) {
        for (const item of unpinned) {
          await deleteDoc(doc(db, `users/${user.uid}/pastes`, item.id));
        }
      }
    }
  };

  const togglePin = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      const updated = { ...item, isPinned: !item.isPinned };
      
      // Always update locally
      await updateLocalPaste(updated);
      setItems(prev => prev.map(i => i.id === id ? updated : i));

      // Sync to cloud if logged in
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/pastes`, id), {
          isPinned: !item.isPinned
        });
      }
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: chatInput,
      timestamp: new Date()
    };

    setChatInput("");
    setIsChatLoading(true);

    const chatId = contextItem?.id || 'default';

    if (user) {
      await setDoc(doc(db, `users/${user.uid}/chats/${chatId}/messages`, userMsgId), {
        ...userMsg,
        timestamp: serverTimestamp()
      });
    } else {
      await saveChatMessage(userMsg);
      setChatMessages(prev => [...prev, userMsg]);
    }

    try {
      const history = chatMessages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const model = "gemini-3.1-pro-preview";

      let finalPrompt = chatInput;
      const parts: any[] = [];
      
      // If there's a context item, ALWAYS include it in the request parts
      // This ensures the AI never "forgets" the file or text context being discussed
      if (contextItem) {
        if (contextItem.type === "image" || contextItem.type === "video") {
          parts.push({
            inlineData: {
              data: contextItem.content.split(",")[1],
              mimeType: contextItem.mimeType
            }
          });
          // Add a subtle hint to the prompt about the context
          finalPrompt = `[Context: ${contextItem.type} attached] ${chatInput}`;
        } else {
          finalPrompt = `Context: "${contextItem.content}"\n\nUser Question: ${chatInput}`;
        }
      }

      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model,
        contents: [
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: "user", parts }
        ],
        config: {
          systemInstruction: "You are ClipGenius AI, a professional-grade assistant for a clipboard manager. You are currently helping the user analyze a specific item from their history. Always refer to the attached context (image, video, or text) to answer their questions accurately. If you see an image, describe it if asked. If you see text, summarize or explain it. Be concise and professional.",
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      const modelMsgId = crypto.randomUUID();
      const modelMsg: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text: response.text || "I couldn't generate a response.",
        timestamp: new Date()
      };

      if (user) {
        await setDoc(doc(db, `users/${user.uid}/chats/default/messages`, modelMsgId), {
          ...modelMsg,
          timestamp: serverTimestamp()
        });
      } else {
        await saveChatMessage(modelMsg);
        setChatMessages(prev => [...prev, modelMsg]);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) return;

    // Only check for API key if using Pro models
    if (imageQuality === "pro" && window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    }

    setIsGeneratingImage(true);
    setGeneratedImage(null);

    try {
      // Use process.env.API_KEY if available, otherwise fallback to GEMINI_API_KEY
      const apiKey = (imageQuality === "pro") ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      let response;
      if (isEditingImage && contextItem) {
        // Image Editing Mode
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: {
            parts: [
              { inlineData: { data: contextItem.content.split(",")[1], mimeType: contextItem.mimeType } },
              { text: imagePrompt }
            ]
          }
        });
      } else if (imageQuality === "pro") {
        // Pro Generation (Paid)
        response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: { parts: [{ text: imagePrompt }] },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize
            }
          }
        });
      } else {
        // Standard Generation (Free/Default)
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: { parts: [{ text: imagePrompt }] },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });
      }

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        const base64 = `data:image/png;base64,${imagePart.inlineData.data}`;
        setGeneratedImage(base64);
      }
    } catch (error: any) {
      console.error("Image gen error:", error);
      if (error?.message?.includes("PERMISSION_DENIED") || error?.message?.includes("not found")) {
        if (imageQuality === "pro") setHasApiKey(false);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const copyToClipboard = async (item: PasteItem) => {
    try {
      if (item.type === "image") {
        const response = await fetch(item.content);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
      } else {
        await navigator.clipboard.writeText(item.content);
      }
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback to text copy if image copy fails
      navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const downloadItem = (item: PasteItem) => {
    const link = document.createElement("a");
    let url = "";
    let extension = "";

    if (item.type === "image" || item.type === "video") {
      url = item.content;
      extension = item.mimeType.split("/")[1] || (item.type === "image" ? "png" : "mp4");
    } else {
      const blob = new Blob([item.content], { type: item.mimeType });
      url = URL.createObjectURL(blob);
      extension = item.type === "url" ? "url" : "txt";
    }

    link.href = url;
    link.download = `${item.suggestedName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (item.type !== "image" && item.type !== "video") URL.revokeObjectURL(url);
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item => 
      item.suggestedName.toLowerCase().includes(query) ||
      item.summary?.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query)
    );

    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [items, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      {/* Main Layout: Split Pane */}
      <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
        
        {/* Left Pane: The "Hero" Paste Zone */}
        <aside className="w-full lg:w-[45%] h-full border-r border-[#141414]/10 bg-white flex flex-col relative">
          {/* Vertical Rail Text (Recipe 11) */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden xl:block">
            <span className="writing-vertical text-[10px] font-mono opacity-20 uppercase tracking-[0.4em] select-none">
              CLIPGENIUS • AI CLIPBOARD SYSTEM • V1.2.0
            </span>
          </div>

          {/* Header in Left Pane */}
          <header className="p-8 md:p-12 border-b border-[#141414]/5">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-full">
                  <Clipboard className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold italic tracking-tight leading-none">ClipGenius</h1>
                  <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest mt-1">Intelligence Layer</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Auto AI Toggle - Only show if logged in */}
                {user && (
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#F9F9F7] rounded-full border border-[#141414]/5">
                    <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">Auto AI</span>
                    <button 
                      onClick={() => setIsAutoAnalyzeEnabled(!isAutoAnalyzeEnabled)}
                      className={cn(
                        "w-8 h-4 rounded-full transition-all relative",
                        isAutoAnalyzeEnabled ? "bg-green-500" : "bg-gray-300"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isAutoAnalyzeEnabled ? 16 : 2 }}
                        className="absolute top-1 w-2 h-2 bg-white rounded-full"
                      />
                    </button>
                  </div>
                )}
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">{user.displayName}</span>
                      <button onClick={handleLogout} className="text-[9px] font-mono font-bold hover:underline flex items-center gap-1">
                        <LogOut className="w-3 h-3" /> LOGOUT
                      </button>
                    </div>
                    {user.photoURL && <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-[#141414]/10" />}
                  </div>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="px-4 py-2 bg-[#141414] text-white text-[10px] font-mono uppercase tracking-widest rounded-full hover:bg-[#333] transition-colors"
                  >
                    Login with Google
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] uppercase">
                Capture <br />
                <span className="text-[#141414]/20 italic font-serif lowercase">everything.</span>
              </h2>
              <p className="text-sm opacity-50 max-w-sm leading-relaxed">
                ClipGenius is a professional-grade AI clipboard utility powered by Gemini. 
                Intelligently capture, analyze, and organize images, videos, text, or links.
              </p>
            </div>
          </header>

          {/* Large Paste Zone */}
          <div className="flex-1 p-8 md:p-12 flex flex-col">
            <div 
              className={cn(
                "flex-1 border-2 border-dashed border-[#141414]/20 rounded-3xl flex flex-col items-center justify-center text-center transition-all duration-700 relative overflow-hidden group p-12 min-h-[320px]",
                isDragging ? "bg-[#141414] border-solid border-[#141414]" : "bg-[#F9F9F7] hover:bg-white hover:border-[#141414]/40"
              )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
              >
                <AnimatePresence mode="wait">
                  {isDragging ? (
                    <motion.div 
                      key="dragging"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                      className="flex flex-col items-center text-white"
                    >
                      <Plus className="w-20 h-20 mb-4 animate-bounce" />
                      <span className="text-xl font-mono uppercase tracking-[0.3em]">Drop to Analyze</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-24 h-24 border border-[#141414]/10 rounded-full flex items-center justify-center mb-8 bg-white shadow-sm group-hover:scale-110 transition-transform duration-500">
                        <Plus className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Paste Zone</h3>
                      <p className="text-[11px] font-mono opacity-40 uppercase tracking-[0.2em] mb-12">
                        Command + V to Begin
                      </p>
                      
                      <div className="flex gap-8">
                        <div className="flex flex-col items-center gap-2">
                          <ImageIcon className="w-5 h-5 opacity-20" />
                          <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">Image</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <VideoIcon className="w-5 h-5 opacity-20" />
                          <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">Video</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-5 h-5 opacity-20" />
                          <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">Text</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <LinkIcon className="w-5 h-5 opacity-20" />
                          <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">Link</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="px-8 md:px-12 pb-8 flex gap-4">
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex-1 flex items-center justify-center gap-3 bg-white border border-[#141414]/10 py-4 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
            >
              <MessageSquare className="w-5 h-5 opacity-40 group-hover:opacity-100" />
              <span className="text-[10px] font-mono uppercase tracking-widest">AI Chatbot</span>
            </button>
            <button 
              onClick={() => setIsImageGenOpen(true)}
              className="flex-1 flex items-center justify-center gap-3 bg-white border border-[#141414]/10 py-4 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
            >
              <Sparkles className="w-5 h-5 opacity-40 group-hover:opacity-100" />
              <span className="text-[10px] font-mono uppercase tracking-widest">Generate Image</span>
            </button>
          </div>

          {/* AI Features Rail - Refined for Technical Feel */}
          <div className="p-8 md:p-12 border-t border-[#141414]/5 bg-[#F9F9F7]/50">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-[#141414]/10" />
              <span className="text-[9px] font-mono opacity-30 uppercase tracking-[0.4em]">System Intelligence</span>
              <div className="h-[1px] flex-1 bg-[#141414]/10" />
            </div>
            <div className="grid grid-cols-3 gap-8">
              {[
                { label: "Smart Name", icon: Zap, value: "98%" },
                { label: "Auto Summary", icon: Layers, value: "Active" },
                { label: "Context Aware", icon: Search, value: "v3.0" }
              ].map((f, i) => (
                <div key={i} className="flex flex-col gap-3 group/feature">
                  <div className="flex items-center justify-between">
                    <f.icon className="w-4 h-4 opacity-20 group-hover/feature:opacity-100 transition-opacity" />
                    <span className="text-[8px] font-mono opacity-30">{f.value}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest">{f.label}</span>
                  <div className="h-1 w-full bg-[#141414]/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "60%" }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      className="h-full bg-[#141414]/20 group-hover/feature:bg-[#141414]/40 transition-colors" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Pane: History List */}
        <main className="flex-1 h-full flex flex-col bg-[#F5F5F0]">
          {/* Search & Filter Header */}
          <div className="p-8 md:p-12 border-b border-[#141414]/5 flex flex-col md:flex-row items-stretch md:items-center gap-6 justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-10">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type="text"
                placeholder="SEARCH HISTORY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-[#141414]/10 py-3 pl-12 pr-4 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 opacity-30 hover:opacity-100 transition-opacity"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest">Records</span>
                <span className="text-sm font-bold">{items.length}</span>
              </div>
              <div className="h-8 w-[1px] bg-[#141414]/10" />
              <button 
                onClick={clearAll}
                className="p-3 border border-[#141414]/10 rounded-full hover:bg-red-50 hover:border-red-200 text-red-600 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
            <AnimatePresence initial={false}>
              {filteredItems.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20"
                >
                  <Layers className="w-16 h-16 mb-6 stroke-[1px]" />
                  <h4 className="text-2xl font-serif italic mb-2">Empty Archives</h4>
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em]">Waiting for input signal</p>
                </motion.div>
              ) : (
                filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 50 }}
                    className="group relative"
                  >
                    {/* Item Card */}
                    <div className={cn(
                      "flex flex-col md:flex-row gap-8 transition-all duration-500",
                      item.isPinned ? "opacity-100" : "opacity-80 hover:opacity-100"
                    )}>
                      {/* Preview Column */}
                      <div className="w-full md:w-64 aspect-square md:aspect-auto md:h-64 bg-white border border-[#141414]/5 rounded-2xl relative shadow-sm group-hover:shadow-xl transition-all duration-500">
                        {item.type === "image" ? (
                          <img 
                            src={item.content} 
                            alt="Preview" 
                            className="w-full h-full object-cover transition-all duration-700 rounded-2xl"
                            referrerPolicy="no-referrer"
                          />
                        ) : item.type === "video" ? (
                          <video 
                            src={item.content} 
                            className="w-full h-full object-cover transition-all duration-700 rounded-2xl"
                            controls={false}
                            muted
                            loop
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => e.currentTarget.pause()}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#F9F9F7] rounded-2xl">
                            {item.type === "url" ? (
                              <LinkIcon className="w-12 h-12 opacity-5 mb-4" />
                            ) : (
                              <FileText className="w-12 h-12 opacity-5 mb-4" />
                            )}
                            <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">{item.type}</span>
                          </div>
                        )}
                        
                        {/* Type Badge */}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur-md border border-[#141414]/5 text-[9px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                            {item.type}
                          </span>
                        </div>
 
                        {/* Quick Actions Overlay */}
                        <div className="absolute inset-0 bg-[#141414]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 rounded-2xl">
                          <button 
                            onClick={() => downloadItem(item)}
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          
                          {user && (
                            <>
                              <button 
                                onClick={() => openChatWithItem(item)}
                                className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                              >
                                <MessageSquare className="w-5 h-5" />
                              </button>
                              {item.type === "text" && (
                                <button 
                                  onClick={() => openImageGenWithText(item.content)}
                                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                >
                                  <Sparkles className="w-5 h-5" />
                                </button>
                              )}
                              {item.type === "image" && (
                                <button 
                                  onClick={() => startImageEdit(item)}
                                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                >
                                  <Sparkles className="w-5 h-5" />
                                </button>
                              )}
                              {item.type === "url" && (
                                <button 
                                  onClick={() => openImageGenWithText(item.summary || item.content)}
                                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                >
                                  <Sparkles className="w-5 h-5" />
                                </button>
                              )}
                            </>
                          )}
                          
                          <button 
                            onClick={() => copyToClipboard(item)}
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            {copiedId === item.id ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Info Column */}
                      <div className="flex-1 flex flex-col justify-center py-2">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
                                {format(item.timestamp, "HH:mm:ss")}
                              </span>
                              <div className="h-[1px] w-8 bg-[#141414]/10" />
                              <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
                                {format(item.timestamp, "MMM d, yyyy")}
                              </span>
                            </div>
                             <h3 className="text-2xl font-bold uppercase tracking-tighter truncate leading-none flex items-center gap-3 group/title">
                              {item.isAnalyzing ? (
                                <span className="flex items-center gap-3 opacity-20">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Analyzing...
                                </span>
                              ) : editingItemId === item.id ? (
                                <input 
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="bg-transparent border-b border-[#141414] text-2xl font-bold uppercase tracking-tighter w-full focus:outline-none py-0"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  {item.suggestedName}
                                  <button 
                                    onClick={() => startEditing(item)}
                                    className="p-1 opacity-20 hover:opacity-100 transition-opacity"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  {user && (
                                    <button 
                                      onClick={() => analyzeContent(item)}
                                      className={cn(
                                        "p-1 rounded-md transition-all hover:scale-110",
                                        item.summary ? "text-[#141414]/20 hover:text-blue-500" : "text-blue-500"
                                      )}
                                    >
                                      <Wand2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </h3>
                          </div>
                          <div className="flex gap-2">
                            {editingItemId === item.id ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => saveEdit(item.id)}
                                  className="px-4 py-2 bg-[#141414] text-white text-[10px] font-mono uppercase tracking-widest rounded-full hover:bg-[#333] transition-all"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setEditingItemId(null)}
                                  className="px-4 py-2 border border-[#141414]/10 text-[10px] font-mono uppercase tracking-widest rounded-full hover:bg-[#141414]/5 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => togglePin(item.id)}
                                  className={cn(
                                    "p-2 rounded-full border border-[#141414]/10 transition-all",
                                    item.isPinned ? "bg-[#141414] text-white border-[#141414]" : "hover:bg-white"
                                  )}
                                >
                                  {item.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                </button>
                                <button 
                                  onClick={() => deleteItem(item.id)}
                                  className="p-2 rounded-full border border-[#141414]/10 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {editingItemId === item.id ? (
                          <textarea 
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                            className="w-full bg-transparent border-b border-[#141414]/10 text-lg font-serif italic text-[#141414] leading-relaxed mb-6 focus:outline-none focus:border-[#141414] resize-none h-24 py-2"
                            placeholder="Enter summary..."
                          />
                        ) : (
                          <p className="text-lg font-serif italic text-[#141414]/60 leading-relaxed mb-6 line-clamp-2">
                            {item.isAnalyzing ? "Processing content through intelligence layer..." : item.summary || "No summary generated."}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                          {item.isAnalyzing ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full opacity-50">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-[9px] font-mono uppercase tracking-widest">Analyzing...</span>
                            </div>
                          ) : user ? (
                            <div className="flex flex-wrap gap-2">
                              <button 
                                onClick={() => analyzeContent(item)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all group/btn"
                              >
                                <Zap className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">
                                  {item.summary ? "Re-analyze" : "Analyze Now"}
                                </span>
                              </button>

                              <button 
                                onClick={() => openChatWithItem(item)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                              >
                                <MessageSquare className="w-3 h-3 opacity-40 group-hover/btn:opacity-100" />
                                <span className="text-[9px] font-mono uppercase tracking-widest">Chat with AI</span>
                              </button>

                              {item.type === "image" && (
                                <button 
                                  onClick={() => startImageEdit(item)}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                                >
                                  <Sparkles className="w-3 h-3 opacity-40 group-hover/btn:opacity-100" />
                                  <span className="text-[9px] font-mono uppercase tracking-widest">Generate Image</span>
                                </button>
                               )}

                               {item.type === "text" && (
                                 <button 
                                   onClick={() => openImageGenWithText(item.content)}
                                   className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                                 >
                                   <Sparkles className="w-3 h-3 opacity-40 group-hover/btn:opacity-100" />
                                   <span className="text-[9px] font-mono uppercase tracking-widest">Generate Image</span>
                                 </button>
                               )}

                               {item.type === "url" && (
                                 <button 
                                   onClick={() => openImageGenWithText(item.summary || item.content)}
                                   className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full hover:bg-[#141414] hover:text-white transition-all group/btn"
                                 >
                                   <Sparkles className="w-3 h-3 opacity-40 group-hover/btn:opacity-100" />
                                   <span className="text-[9px] font-mono uppercase tracking-widest">Generate Image</span>
                                 </button>
                               )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#141414]/5 rounded-full opacity-30">
                              <UserIcon className="w-3 h-3" />
                              <span className="text-[9px] font-mono uppercase tracking-widest">Login for AI Analysis</span>
                            </div>
                          )}
                        </div>

                        {item.type !== "image" && (
                          <div className="p-4 bg-white/40 border border-[#141414]/5 rounded-xl text-[11px] font-mono opacity-40 line-clamp-2 break-all">
                            {item.content}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider (Recipe 1) */}
                    <div className="mt-12 h-[1px] w-full bg-[#141414]/5" />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            
            {/* End of List Indicator */}
            {items.length > 0 && (
              <div className="pt-12 pb-24 text-center">
                <span className="text-[9px] font-mono opacity-20 uppercase tracking-[0.5em]">End of Archives</span>
              </div>
            )}
          </div>
        </main>
      </div>
      {/* Chat Modals & Overlays */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#141414]/10"
            >
              <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-[#F9F9F7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#141414] rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold uppercase tracking-widest text-sm">PasteEx Intelligence</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={clearChat}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-full transition-colors"
                  >
                    <Trash2 className="w-5 h-5 opacity-40 hover:opacity-100" />
                  </button>
                  <button 
                    onClick={isLiveActive ? stopLiveSession : startLiveSession}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      isLiveActive ? "bg-red-500 text-white animate-pulse" : "hover:bg-[#141414]/5"
                    )}
                  >
                    {isLiveActive ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5 opacity-30" />}
                  </button>
                  <button onClick={() => { setIsChatOpen(false); setContextItem(null); }} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
                    <XCircle className="w-5 h-5 opacity-30" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLiveActive && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Volume2 className="w-10 h-10 text-white" />
                    </div>
                    <h4 className="text-lg font-bold uppercase tracking-widest mb-2">Live Voice Active</h4>
                    <p className="text-xs font-mono opacity-40 max-w-xs">{liveTranscription || "Listening to your voice..."}</p>
                  </div>
                )}
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="text-xs font-mono uppercase tracking-widest">Ask me anything about your captures</p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user" 
                        ? "bg-[#141414] text-white rounded-tr-none" 
                        : "bg-[#F0F0EE] text-[#141414] rounded-tl-none"
                    )}>
                      <div className="prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono opacity-30 mt-1 uppercase tracking-widest">
                      {format(msg.timestamp, "HH:mm")}
                    </span>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-3 opacity-40">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Thinking...</span>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[#141414]/5 bg-[#F9F9F7]">
                {contextItem && (
                  <div className="mb-4 p-3 bg-white border border-[#141414]/10 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-[#F9F9F7] rounded-lg flex-shrink-0 flex items-center justify-center border border-[#141414]/5 overflow-hidden">
                        {contextItem.type === 'image' ? (
                          <img src={contextItem.content} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : contextItem.type === 'video' ? (
                          <VideoIcon className="w-4 h-4 opacity-40" />
                        ) : contextItem.type === 'url' ? (
                          <LinkIcon className="w-4 h-4 opacity-40" />
                        ) : (
                          <FileText className="w-4 h-4 opacity-40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">Referencing Context</p>
                        <p className="text-[11px] font-bold truncate uppercase tracking-tighter">
                          {contextItem.suggestedName || (contextItem.type === 'text' ? contextItem.content : contextItem.type)}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setContextItem(null)}
                      className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                    >
                      <XCircle className="w-4 h-4 opacity-30 hover:opacity-100" />
                    </button>
                  </div>
                )}
                <div className="relative">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={contextItem ? "ASK ABOUT THIS CONTEXT..." : "TYPE YOUR MESSAGE..."}
                    className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 pl-6 pr-16 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#141414] text-white rounded-xl flex items-center justify-center disabled:opacity-20 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isImageGenOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#141414]/10"
            >
              <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-[#F9F9F7]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#141414] rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold uppercase tracking-widest text-sm">
                    {isEditingImage ? "AI Image Editor" : "AI Image Generator"}
                  </h3>
                </div>
                <button onClick={() => { setIsImageGenOpen(false); setIsEditingImage(false); setContextItem(null); }} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
                  <XCircle className="w-5 h-5 opacity-30" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="flex flex-col gap-4">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 block">Generation Quality</label>
                  <div className="flex p-1 bg-[#F9F9F7] border border-[#141414]/5 rounded-2xl">
                    <button 
                      onClick={() => setImageQuality("standard")}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        imageQuality === "standard" ? "bg-white shadow-sm text-[#141414]" : "text-[#141414]/40 hover:text-[#141414]"
                      )}
                    >
                      Standard (Free)
                    </button>
                    <button 
                      onClick={() => setImageQuality("pro")}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        imageQuality === "pro" ? "bg-white shadow-sm text-[#141414]" : "text-[#141414]/40 hover:text-[#141414]"
                      )}
                    >
                      Pro (Paid Key)
                    </button>
                  </div>
                </div>

                {imageQuality === "pro" && !hasApiKey && (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-amber-800">
                      <Zap className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">API Key Required</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      High-quality image generation requires a paid Gemini API key. Please select your key to continue.
                    </p>
                    <button 
                      onClick={() => window.aistudio.openSelectKey()}
                      className="w-full py-3 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-700 transition-colors"
                    >
                      Select API Key
                    </button>
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-amber-600 underline text-center"
                    >
                      Learn about billing
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 block">Describe your image</label>
                  <textarea 
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="A VIBRANT NEON CITYSCAPE IN THE STYLE OF CYBERPUNK..."
                    className="w-full h-32 bg-[#F9F9F7] border border-[#141414]/10 rounded-2xl p-6 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  {imageQuality === "pro" ? (
                    <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 block">Resolution</label>
                      <div className="flex gap-2">
                        {["1K", "2K", "4K"].map((size) => (
                          <button 
                            key={size}
                            onClick={() => setImageSize(size as any)}
                            className={cn(
                              "px-4 py-2 rounded-full text-[10px] font-mono border transition-all",
                              imageSize === size ? "bg-[#141414] text-white border-[#141414]" : "bg-white border-[#141414]/10 opacity-40"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                  <button 
                    onClick={generateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="px-8 py-4 bg-[#141414] text-white text-xs font-mono uppercase tracking-widest rounded-full hover:bg-[#333] disabled:opacity-20 transition-all shadow-lg flex items-center gap-3"
                  >
                    {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate
                  </button>
                </div>

                {generatedImage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden border border-[#141414]/10">
                      <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                    </div>
                    <button 
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = generatedImage;
                        link.download = `gen_${Date.now()}.png`;
                        link.click();
                      }}
                      className="w-full py-4 border border-[#141414]/10 rounded-2xl text-[10px] font-mono uppercase tracking-widest hover:bg-[#F9F9F7] transition-colors flex items-center justify-center gap-3"
                    >
                      <Download className="w-4 h-4" />
                      Download Generation
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
