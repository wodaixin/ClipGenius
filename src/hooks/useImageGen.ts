import { useAppContext } from "../context/AppContext";

export function useImageGen() {
  const ctx = useAppContext();

  return {
    isImageGenOpen: ctx.isImageGenOpen,
    imagePrompt: ctx.imagePrompt,
    imageSize: ctx.imageSize,
    generatedImage: ctx.generatedImage,
    isGeneratingImage: ctx.isGeneratingImage,
    isEditingImage: ctx.isEditingImage,
    imageQuality: ctx.imageQuality,
    hasApiKey: ctx.hasApiKey,
    setImagePrompt: ctx.setImagePrompt,
    setImageSize: ctx.setImageSize,
    setImageQuality: ctx.setImageQuality,
    openImageGen: ctx.openImageGen,
    openImageGenWithText: ctx.openImageGenWithText,
    startImageEdit: ctx.startImageEdit,
    closeImageGen: ctx.closeImageGen,
    generateImage: ctx.generateImageAction,
    downloadGenerated: ctx.downloadGenerated,
  };
}
