import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { X, Save, AlertCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Settings {
  // Firebase
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  
  // AI Providers
  geminiApiKey: string;
  minimaxApiKey: string;
  minimaxBaseUrl: string;
  
  // Provider Selection
  analysisProvider: "gemini" | "minimax";
  chatProvider: "gemini" | "minimax";
  
  // Models
  analysisModel: string;
  chatModel: string;
}

const STORAGE_KEY = "clipgenius_settings";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({
    firebaseApiKey: "",
    firebaseAuthDomain: "",
    firebaseProjectId: "",
    firebaseStorageBucket: "",
    firebaseMessagingSenderId: "",
    firebaseAppId: "",
    geminiApiKey: "",
    minimaxApiKey: "",
    minimaxBaseUrl: "https://api.minimaxi.com/anthropic",
    analysisProvider: "gemini",
    chatProvider: "gemini",
    analysisModel: "",
    chatModel: "",
  });
  
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    // Show reload prompt
    if (window.confirm(t("settings.reloadPrompt"))) {
      window.location.reload();
    }
  };

  const handleChange = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-3xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#141414]/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-[#F9F9F7]">
            <h3 className="font-bold uppercase tracking-widest text-sm">
              {t("settings.title")}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 opacity-50" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {/* Firebase Configuration */}
              <section>
                <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  {t("settings.firebase.title")}
                </h4>
                <div className="space-y-3">
                  <InputField
                    label={t("settings.firebase.apiKey")}
                    value={settings.firebaseApiKey}
                    onChange={(v) => handleChange("firebaseApiKey", v)}
                    placeholder="AIza..."
                  />
                  <InputField
                    label={t("settings.firebase.authDomain")}
                    value={settings.firebaseAuthDomain}
                    onChange={(v) => handleChange("firebaseAuthDomain", v)}
                    placeholder="your-app.firebaseapp.com"
                  />
                  <InputField
                    label={t("settings.firebase.projectId")}
                    value={settings.firebaseProjectId}
                    onChange={(v) => handleChange("firebaseProjectId", v)}
                    placeholder="your-project-id"
                  />
                  <InputField
                    label={t("settings.firebase.storageBucket")}
                    value={settings.firebaseStorageBucket}
                    onChange={(v) => handleChange("firebaseStorageBucket", v)}
                    placeholder="your-app.appspot.com"
                  />
                  <InputField
                    label={t("settings.firebase.messagingSenderId")}
                    value={settings.firebaseMessagingSenderId}
                    onChange={(v) => handleChange("firebaseMessagingSenderId", v)}
                    placeholder="123456789"
                  />
                  <InputField
                    label={t("settings.firebase.appId")}
                    value={settings.firebaseAppId}
                    onChange={(v) => handleChange("firebaseAppId", v)}
                    placeholder="1:123:web:abc"
                  />
                </div>
              </section>

              {/* AI Configuration */}
              <section>
                <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  {t("settings.ai.title")}
                </h4>
                <div className="space-y-3">
                  <InputField
                    label={t("settings.ai.geminiApiKey")}
                    value={settings.geminiApiKey}
                    onChange={(v) => handleChange("geminiApiKey", v)}
                    placeholder="AIza..."
                    type="password"
                  />
                  <InputField
                    label={t("settings.ai.minimaxApiKey")}
                    value={settings.minimaxApiKey}
                    onChange={(v) => handleChange("minimaxApiKey", v)}
                    placeholder="sk-..."
                    type="password"
                  />
                  <InputField
                    label={t("settings.ai.minimaxBaseUrl")}
                    value={settings.minimaxBaseUrl}
                    onChange={(v) => handleChange("minimaxBaseUrl", v)}
                    placeholder="https://api.minimaxi.com/anthropic"
                  />
                </div>
              </section>

              {/* Provider Selection */}
              <section>
                <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {t("settings.providers.title")}
                </h4>
                <div className="space-y-3">
                  <SelectField
                    label={t("settings.providers.analysis")}
                    value={settings.analysisProvider}
                    onChange={(v) => handleChange("analysisProvider", v)}
                    options={[
                      { value: "gemini", label: "Gemini" },
                      { value: "minimax", label: "Minimax" },
                    ]}
                  />
                  <SelectField
                    label={t("settings.providers.chat")}
                    value={settings.chatProvider}
                    onChange={(v) => handleChange("chatProvider", v)}
                    options={[
                      { value: "gemini", label: "Gemini" },
                      { value: "minimax", label: "Minimax" },
                    ]}
                  />
                  <InputField
                    label={t("settings.providers.analysisModel")}
                    value={settings.analysisModel}
                    onChange={(v) => handleChange("analysisModel", v)}
                    placeholder="gemini-2.0-flash-exp (optional)"
                  />
                  <InputField
                    label={t("settings.providers.chatModel")}
                    value={settings.chatModel}
                    onChange={(v) => handleChange("chatModel", v)}
                    placeholder="gemini-3.1-pro-preview (optional)"
                  />
                </div>
              </section>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  {t("settings.warning")}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#141414]/5 bg-[#F9F9F7] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-[#141414]/10 text-xs font-sans uppercase tracking-widest rounded-full hover:bg-[#141414]/5 transition-all"
            >
              {t("settings.cancel")}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-[#141414] text-white text-xs font-sans uppercase tracking-widest rounded-full hover:bg-[#333] transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saved ? t("settings.saved") : t("settings.save")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-sans uppercase tracking-widest opacity-75 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#141414]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#141414] transition-colors"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={selectRef}>
      <label className="block text-xs font-sans uppercase tracking-widest opacity-75 mb-2">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-[#141414]/10 rounded-xl px-4 py-3 text-sm text-left focus:outline-none focus:border-[#141414] transition-colors flex items-center justify-between"
        >
          <span>{selectedOption?.label || "Select..."}</span>
          <motion.svg
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 w-full mt-2 bg-white border border-[#141414]/10 rounded-xl shadow-xl overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-sm text-left hover:bg-[#141414]/5 transition-colors ${
                    opt.value === value ? "bg-[#141414]/10 font-medium" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
