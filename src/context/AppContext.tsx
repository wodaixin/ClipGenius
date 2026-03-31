import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { PasteItem } from "../types";
import { getPastes } from "../lib/db";

interface AppContextValue {
  items: PasteItem[];
  setItems: React.Dispatch<React.SetStateAction<PasteItem[]>>;
  contextItem: PasteItem | null;
  setContextItem: (item: PasteItem | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PasteItem[]>([]);
  const [contextItem, setContextItem] = useState<PasteItem | null>(null);

  // Load persisted items on mount
  useEffect(() => {
    getPastes().then(setItems);
  }, []);

  return (
    <AppContext.Provider value={{ items, setItems, contextItem, setContextItem }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
