"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  X,
  Bot,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { renderToolComponent } from "@/components/ai-chat-components";

type ToolResult = {
  tool: string;
  success: boolean;
  error?: string;
  uiComponent?: {
    type: string;
    props: any;
  };
  data?: any;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolResults?: ToolResult[];
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

type AIChatProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
};

export function AICommandChat({ isOpen, onClose, initialMessage }: AIChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Handle initial message from header input
  const initialMessageHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !initialMessage) return;
    if (initialMessageHandledRef.current === initialMessage) return;
    initialMessageHandledRef.current = initialMessage;
    createNewConversation(initialMessage);
  }, [isOpen, initialMessage]);

  // Load conversations from localStorage once
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const saved = localStorage.getItem("ai-conversations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversationsWithDates);
        if (conversationsWithDates.length > 0) {
          const mostRecent = conversationsWithDates.sort((a: Conversation, b: Conversation) =>
            b.updatedAt.getTime() - a.updatedAt.getTime()
          )[0];
          setActiveConversationId(mostRecent.id);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      }
    }
  }, []);

  // Save conversations
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("ai-conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const createNewConversation = async (firstMessage?: string) => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: firstMessage?.slice(0, 50) || "New conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);

    if (firstMessage) {
      await sendMessage(firstMessage, newConv.id);
    }
  };

  const sendMessage = async (message: string, conversationId?: string) => {
    const targetConvId = conversationId || activeConversationId;

    if (!targetConvId) {
      await createNewConversation(message);
      return;
    }

    if (!message.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    const currentConversation = conversations.find(c => c.id === targetConvId);
    const existingMessages = currentConversation?.messages || [];

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        return {
          ...conv,
          messages: [...conv.messages, userMsg],
          updatedAt: new Date(),
          title: conv.messages.length === 0 ? message.slice(0, 50) : conv.title
        };
      }
      return conv;
    }));

    setInput("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationHistory: existingMessages
        }),
      });

      const data = await response.json();

      // Handle navigation if the AI wants to navigate
      if (data.toolResults) {
        for (const result of data.toolResults) {
          if (result.uiComponent?.type === "navigation" && result.uiComponent?.props?.path) {
            router.push(result.uiComponent.props.path);
          }
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "",
        timestamp: new Date(),
        toolResults: data.toolResults || [],
      };

      setConversations(prev => prev.map(conv =>
        conv.id === targetConvId
          ? { ...conv, messages: [...conv.messages, aiMsg], updatedAt: new Date() }
          : conv
      ));
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setConversations(prev => prev.map(conv =>
        conv.id === targetConvId
          ? { ...conv, messages: [...conv.messages, errorMsg] }
          : conv
      ));
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        sendMessage(input);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20"
      onClick={onClose}
    >
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background border rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center">
                <Bot className="h-4 w-4 text-background" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">RoundRobin AI</h2>
                <p className="text-[10px] text-muted-foreground">Ask me to do anything</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">What would you like to do?</p>
              </div>
            ) : (
              activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-background" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end max-w-[80%]" : "max-w-[90%]"}`}>
                    <div className={`rounded-lg px-3 py-2 ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {/* Render tool results as UI components */}
                    {message.toolResults?.map((result, idx) => {
                      if (result.error) {
                        return (
                          <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {result.error}
                          </div>
                        );
                      }
                      if (result.uiComponent) {
                        return (
                          <div key={idx} className="w-full">
                            {renderToolComponent(result.uiComponent, undefined, onClose)}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarFallback className="text-xs">You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}

            {isProcessing && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-background" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what to do..."
                disabled={isProcessing}
                rows={1}
                className="flex-1 min-h-[40px] max-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                onClick={() => input.trim() && sendMessage(input)}
                disabled={!input.trim() || isProcessing}
                size="icon"
                className="h-10 w-10"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
