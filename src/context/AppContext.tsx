import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { PasteItem } from "../types";
import { getPastes } from "../lib/db";
import { generateImage } from "../services/ai/generateImage";

export type ImageQuality = "standard" | "pro";
export type ImageSize = "1K" | "2K" | "4K";

interface AppContextValue {
  items: PasteItem[];
  setItems: React.Dispatch<React.SetStateAction<PasteItem[]>>;
  contextItem: PasteItem | null;
  setContextItem: (item: PasteItem | null) => void;
  // Image Gen
  isImageGenOpen: boolean;
  imagePrompt: string;
  imageSize: ImageSize;
  generatedImage: string | null;
  isGeneratingImage: boolean;
  isEditingImage: boolean;
  imageQuality: ImageQuality;
  hasApiKey: boolean;
  isAutoAnalyzeEnabled: boolean;
  setIsAutoAnalyzeEnabled: (v: boolean) => void;
  setImagePrompt: (v: string) => void;
  setImageSize: (v: ImageSize) => void;
  setImageQuality: (v: ImageQuality) => void;
  openImageGen: () => void;
  openImageGenWithText: (text: string) => void;
  startImageEdit: (item: PasteItem) => void;
  closeImageGen: () => void;
  generateImageAction: () => Promise<void>;
  downloadGenerated: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PasteItem[]>([]);
  const [contextItem, setContextItem] = useState<PasteItem | null>(null);

  // Image Gen state
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageQuality, setImageQuality] = useState<ImageQuality>("standard");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabledState] = useState(
    () => localStorage.getItem("autoAnalyze") === "true"
  );
  const setIsAutoAnalyzeEnabled = useCallback((v: boolean) => {
    localStorage.setItem("autoAnalyze", String(v));
    setIsAutoAnalyzeEnabledState(v);
  }, []);

  // Load persisted items on mount
  const PREVIEW_LIMIT = 2000;
  useEffect(() => {
    getPastes().then((pastes) =>
      setItems(pastes.map((p) =>
        (p.type === "text" || p.type === "url" || p.type === "markdown" || p.type === "code") && p.content.length > PREVIEW_LIMIT
          ? { ...p, content: p.content.slice(0, PREVIEW_LIMIT) }
          : p
      ))
    );
  }, []);

  // Check if AI Studio has a paid key selected when modal opens
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    if (isImageGenOpen) checkApiKey();
  }, [isImageGenOpen]);

  const openImageGen = useCallback(() => {
    setIsImageGenOpen(true);
  }, []);

  const openImageGenWithText = useCallback((text: string) => {
    setIsImageGenOpen(true);
    setImagePrompt(`Create a high-quality visual representation of: ${text}`);
    setIsEditingImage(false);
    setContextItem(null);
  }, []);

  const startImageEdit = useCallback((item: PasteItem) => {
    setIsImageGenOpen(true);
    setContextItem(item);
    setImagePrompt("Add a futuristic neon glow to this image");
    setIsEditingImage(true);
  }, []);

  const closeImageGen = useCallback(() => {
    setIsImageGenOpen(false);
    setIsEditingImage(false);
    setContextItem(null);
    setGeneratedImage(null);
    setImagePrompt("");
  }, []);

  const generateImageAction = useCallback(async () => {
    if (!imagePrompt.trim()) return;

    setIsGeneratingImage(true);
    setGeneratedImage(null);

    let result: string | null = null;

    try {
      result = await generateImage({
        prompt: imagePrompt,
        quality: imageQuality,
        size: imageSize,
        contextItem,
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });
    } catch (error: any) {
      console.error("Image gen error:", error);
      const isPermissionError =
        error?.message?.includes("PERMISSION_DENIED") ||
        error?.message?.includes("not found") ||
        error?.message?.includes("quota") ||
        error?.message?.includes("has no");

      // PRO mode failed — prompt user to select AI Studio paid key
      if (imageQuality === "pro" && isPermissionError) {
        setHasApiKey(false);
        window.aistudio?.openSelectKey?.();
        const hasKey = await window.aistudio?.hasSelectedApiKey?.();
        if (hasKey) {
          const paidKey = await window.aistudio?.getSelectedApiKey?.();
          if (paidKey) {
            setHasApiKey(true);
            result = await generateImage({
              prompt: imagePrompt,
              quality: imageQuality,
              size: imageSize,
              contextItem,
              apiKey: paidKey,
            });
          }
        }
      }
    } finally {
      if (result) setGeneratedImage(result);
      setIsGeneratingImage(false);
    }
  }, [imagePrompt, imageQuality, imageSize, contextItem]);

  const downloadGenerated = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `gen_${Date.now()}.png`;
    link.click();
  }, [generatedImage]);

  return (
    <AppContext.Provider
      value={{
        items, setItems, contextItem, setContextItem,
        isImageGenOpen, imagePrompt, imageSize, generatedImage,
        isGeneratingImage, isEditingImage, imageQuality, hasApiKey,
        isAutoAnalyzeEnabled, setIsAutoAnalyzeEnabled,
        setImagePrompt, setImageSize, setImageQuality,
        openImageGen, openImageGenWithText, startImageEdit,
        closeImageGen, generateImageAction, downloadGenerated,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
