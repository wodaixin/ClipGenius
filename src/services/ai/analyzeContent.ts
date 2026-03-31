/**
 * Analyze a PasteItem — delegates to the configured provider (see VITE_ANALYSIS_PROVIDER).
 * Supported providers: "gemini" (default), "minimax"
 */
export { analyzeContent } from "./providers";
