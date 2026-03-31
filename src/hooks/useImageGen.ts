import { useState, useCallback, useEffect } from "react";
import { PasteItem } from "../types";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { generateImage } from "../services/ai/generateImage";

export type ImageQuality = "standard" | "pro";
export type ImageSize = "1K" | "2K" | "4K";

export function useImageGen() {
  const { user } = useAuth();
  const { contextItem, setContextItem } = useAppContext();

  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageQuality, setImageQuality] = useState<ImageQuality>("standard");
  const [hasApiKey, setHasApiKey] = useState(true);

  // Check API key when modal opens
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
    if (!user) return;
    setIsImageGenOpen(true);
  }, [user]);

  const openImageGenWithText = useCallback((text: string) => {
    if (!user) return;
    setIsImageGenOpen(true);
    setImagePrompt(`Create a high-quality visual representation of: ${text}`);
    setIsEditingImage(false);
    setContextItem(null);
  }, [user, setContextItem]);

  const startImageEdit = useCallback((item: PasteItem) => {
    if (!user) return;
    setIsImageGenOpen(true);
    setContextItem(item);
    setImagePrompt("Add a futuristic neon glow to this image");
    setIsEditingImage(true);
  }, [user, setContextItem]);

  const closeImageGen = useCallback(() => {
    setIsImageGenOpen(false);
    setIsEditingImage(false);
    setContextItem(null);
    setGeneratedImage(null);
    setImagePrompt("");
  }, [setContextItem]);

  const _generateImage = useCallback(async () => {
    if (!imagePrompt.trim()) return;

    // Check API key for Pro mode
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
      const apiKey =
        imageQuality === "pro"
          ? process.env.API_KEY || process.env.GEMINI_API_KEY
          : process.env.GEMINI_API_KEY;

      const result = await generateImage({
        prompt: imagePrompt,
        quality: imageQuality,
        size: imageSize,
        contextItem,
        apiKey,
      });

      if (result) setGeneratedImage(result);
    } catch (error: any) {
      console.error("Image gen error:", error);
      if (
        error?.message?.includes("PERMISSION_DENIED") ||
        error?.message?.includes("not found")
      ) {
        if (imageQuality === "pro") setHasApiKey(false);
      }
    } finally {
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

  return {
    // State
    isImageGenOpen,
    imagePrompt,
    imageSize,
    generatedImage,
    isGeneratingImage,
    isEditingImage,
    imageQuality,
    hasApiKey,
    // Setters
    setImagePrompt,
    setImageSize,
    setImageQuality,
    // Actions
    openImageGen,
    openImageGenWithText,
    startImageEdit,
    closeImageGen,
    generateImage: _generateImage,
    downloadGenerated,
  };
}
