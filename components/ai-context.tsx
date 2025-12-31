"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";
import { AICommandChat } from "./ai-command-chat";

type AIContextType = {
  query: string;
  setQuery: (query: string) => void;
  executeQuery: (query: string) => void;
  isProcessing: boolean;
  isChatOpen: boolean;
  openChat: (initialMessage?: string) => void;
  closeChat: () => void;
};

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>();

  const executeQuery = (newQuery: string) => {
    if (!newQuery.trim()) return;

    // Open chat with the query
    setInitialChatMessage(newQuery);
    setIsChatOpen(true);
    setQuery(""); // Clear the input
  };

  const openChat = (initialMessage?: string) => {
    setInitialChatMessage(initialMessage);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setInitialChatMessage(undefined);
  };

  return (
    <AIContext.Provider value={{ query, setQuery, executeQuery, isProcessing, isChatOpen, openChat, closeChat }}>
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
