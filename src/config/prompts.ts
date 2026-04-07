/**
 * AI Prompts Configuration
 * Centralized prompt templates for different AI features
 * 
 * Prompts are loaded from JSON files:
 * - prompts.en.json (English)
 * - prompts.zh.json (Chinese)
 */

import EN_PROMPTS from "./prompts.en.json";
import ZH_PROMPTS from "./prompts.zh.json";

export interface PromptConfig {
  // Chat system instructions
  chat: {
    systemInstruction: string;
  };
  
  // Chat router (with context) system instructions
  chatRouter: {
    systemInstruction: string;
  };
  
  // Live voice system instructions
  liveVoice: {
    systemInstruction: string;
  };
  
  // Content analysis prompts
  analyze: {
    image: string;
    video: string;
    url: string;
    text: string;
    langSuffix: string;
  };
}

// Get prompts based on current language
export function getPrompts(language: string = "en"): PromptConfig {
  return language === "zh" ? ZH_PROMPTS : EN_PROMPTS;
}

// Helper function to replace template variables
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
