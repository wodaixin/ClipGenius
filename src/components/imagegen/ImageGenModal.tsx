import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  XCircle,
  Loader2,
  Download,
  Zap,
} from "lucide-react";
import { useImageGen } from "../../hooks/useImageGen";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

export function ImageGenModal() {
  const { user, login } = useAuth();
  const {
    isImageGenOpen,
    imagePrompt,
    imageSize,
    generatedImage,
    isGeneratingImage,
    isEditingImage,
    imageQuality,
    hasApiKey,
    setImagePrompt,
    setImageSize,
    setImageQuality,
    closeImageGen,
    generateImage,
    downloadGenerated,
  } = useImageGen();

  return (
    <AnimatePresence>
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
            {/* Login required state */}
            {!user ? (
              <div className="flex flex-col items-center justify-center p-16 text-center gap-6">
                <div className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 opacity-20" />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Login Required</h3>
                  <p className="text-sm opacity-50">Sign in to use AI Image Generator</p>
                </div>
                <button
                  onClick={login}
                  className="px-8 py-4 bg-[#141414] text-white text-xs font-mono uppercase tracking-widest rounded-full hover:bg-[#333] transition-colors"
                >
                  Login with Google
                </button>
                <button
                  onClick={closeImageGen}
                  className="text-[10px] font-mono uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-[#F9F9F7]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#141414] rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold uppercase tracking-widest text-sm">
                      {isEditingImage ? "AI Image Editor" : "AI Image Generator"}
                    </h3>
                  </div>
                  <button
                    onClick={closeImageGen}
                    className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors"
                  >
                    <XCircle className="w-5 h-5 opacity-30" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8">
                  {/* Quality selector */}
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 block">
                      Generation Quality
                    </label>
                    <div className="flex p-1 bg-[#F9F9F7] border border-[#141414]/5 rounded-2xl">
                      {(["standard", "pro"] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setImageQuality(q)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                            imageQuality === q
                              ? "bg-white shadow-sm text-[#141414]"
                              : "text-[#141414]/40 hover:text-[#141414]"
                          )}
                        >
                          {q === "standard" ? "Standard (Free)" : "Pro (Paid Key)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* API key warning for Pro */}
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
                        onClick={() => window.aistudio?.openSelectKey?.()}
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

                  {/* Prompt */}
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 block">
                      Describe your image
                    </label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="A VIBRANT NEON CITYSCAPE IN THE STYLE OF CYBERPUNK..."
                      className="w-full h-32 bg-[#F9F9F7] border border-[#141414]/10 rounded-2xl p-6 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-[#141414] transition-colors resize-none"
                    />
                  </div>

                  {/* Size + Generate */}
                  <div className="flex items-center justify-between">
                    {imageQuality === "pro" ? (
                      <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 block">
                          Resolution
                        </label>
                        <div className="flex gap-2">
                          {(["1K", "2K", "4K"] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => setImageSize(size)}
                              className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-mono border transition-all",
                                imageSize === size
                                  ? "bg-[#141414] text-white border-[#141414]"
                                  : "bg-white border-[#141414]/10 opacity-40"
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
                      {isGeneratingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate
                    </button>
                  </div>

                  {/* Generated image */}
                  {generatedImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden border border-[#141414]/10">
                        <img
                          src={generatedImage}
                          alt="Generated"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={downloadGenerated}
                        className="w-full py-4 border border-[#141414]/10 rounded-2xl text-[10px] font-mono uppercase tracking-widest hover:bg-[#F9F9F7] transition-colors flex items-center justify-center gap-3"
                      >
                        <Download className="w-4 h-4" />
                        Download Generation
                      </button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
