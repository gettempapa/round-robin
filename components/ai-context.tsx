"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { AICommandChat } from "./ai-command-chat";

// Chat position modes for smart repositioning
export type ChatPositionMode = "center" | "side-right" | "side-left" | "bottom-right";

export type ChatPosition = {
  mode: ChatPositionMode;
};

// Highlight element for drawing attention to created/updated items
export type HighlightElement = {
  type: "rule" | "contact" | "group" | "user";
  id: string;
} | null;

// Origin rect for entry animation
export type OriginRect = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

type AIContextType = {
  query: string;
  setQuery: (query: string) => void;
  executeQuery: (query: string) => void;
  isProcessing: boolean;
  isChatOpen: boolean;
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
  // New: Highlight system
  highlightElement: HighlightElement;
  setHighlightElement: (el: HighlightElement) => void;
  // New: Chat positioning
  chatPosition: ChatPosition;
  setChatPosition: (pos: ChatPosition) => void;
  // New: Origin rect for entry animation
  originRect: OriginRect;
  setOriginRect: (rect: OriginRect) => void;
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>();

  // New state for magic carpet features
  const [highlightElement, setHighlightElementState] = useState<HighlightElement>(null);
  const [chatPosition, setChatPosition] = useState<ChatPosition>({ mode: "center" });
  const [originRect, setOriginRect] = useState<OriginRect>(null);

  // Auto-clear highlight after animation completes (4.5s = 3 pulses of 1.5s each)
  useEffect(() => {
    if (highlightElement) {
      const timer = setTimeout(() => {
        setHighlightElementState(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [highlightElement]);

  const setHighlightElement = useCallback((el: HighlightElement) => {
    setHighlightElementState(el);
  }, []);

  const executeQuery = useCallback((newQuery: string) => {
    if (!newQuery.trim()) return;

    // Open chat with the query
    setInitialChatMessage(newQuery);
    setIsChatOpen(true);
    setQuery(""); // Clear the input
  }, []);

  const openChat = useCallback((initialMessage?: string) => {
    setInitialChatMessage(initialMessage);
    setChatPosition({ mode: "center" }); // Reset to center on open
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setInitialChatMessage(undefined);
    setHighlightElementState(null); // Clear any highlights when closing
  }, []);

  return (
    <AIContext.Provider value={{
      query,
      setQuery,
      executeQuery,
      isProcessing,
      isChatOpen,
      openChat,
      closeChat,
      highlightElement,
      setHighlightElement,
      chatPosition,
      setChatPosition,
      originRect,
      setOriginRect,
    }}>
      {children}
      <AICommandChat
        isOpen={isChatOpen}
        onClose={closeChat}
        initialMessage={initialChatMessage}
      />
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
}
