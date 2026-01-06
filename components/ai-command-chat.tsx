"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  X,
  Bot,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { renderToolComponent } from "@/components/ai-chat-components";
import { useAI, type ChatPositionMode } from "./ai-context";

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

// Spring animation config for smooth, magical feel
const springConfig = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
};

// Determine best chat position based on navigation target
function getPositionForPage(page: string): ChatPositionMode {
  switch (page) {
    case "rules":
      return "side-left";
    case "contacts":
    case "users":
    case "groups":
    case "activity":
      return "side-right";
    default:
      return "side-right";
  }
}

export function AICommandChat({ isOpen, onClose, initialMessage }: AIChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const {
    chatPosition,
    setChatPosition,
    setHighlightElement,
    originRect,
  } = useAI();

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Calculate target position based on mode
  const getTargetPosition = useCallback((mode: ChatPositionMode) => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    const chatWidth = mode === "center" ? Math.min(560, vw - 32) : 340;
    const chatHeight = mode === "center" ? Math.min(500, vh - 120) : vh - 96; // top-20 (80px) + bottom-4 (16px)

    switch (mode) {
      case "center":
        return {
          x: (vw - chatWidth) / 2,
          y: (vh - chatHeight) / 2,
          width: chatWidth,
          height: chatHeight,
        };
      case "side-right":
        return {
          x: vw - chatWidth - 16, // right-4
          y: 80, // top-20
          width: chatWidth,
          height: chatHeight,
        };
      case "side-left":
        return {
          x: 280, // left-[280px] (after sidebar)
          y: 80,
          width: chatWidth,
          height: chatHeight,
        };
      case "bottom-right":
        return {
          x: vw - 400 - 16,
          y: vh - 300 - 16,
          width: 400,
          height: 300,
        };
      default:
        return {
          x: (vw - chatWidth) / 2,
          y: (vh - chatHeight) / 2,
          width: chatWidth,
          height: chatHeight,
        };
    }
  }, []);

  // Get current target position
  const targetPos = useMemo(() =>
    getTargetPosition(chatPosition.mode),
    [chatPosition.mode, getTargetPosition]
  );

  // Calculate initial position from origin rect
  const initialPos = useMemo(() => {
    if (originRect) {
      return {
        x: originRect.x,
        y: originRect.y,
        width: originRect.width,
        height: originRect.height,
        opacity: 0,
        scale: 0.5,
      };
    }
    // Fallback: start from center but scaled down
    const target = getTargetPosition("center");
    return {
      x: target.x + target.width / 2 - 50,
      y: target.y - 50,
      width: 100,
      height: 50,
      opacity: 0,
      scale: 0.8,
    };
  }, [originRect, getTargetPosition]);

  // Handle initial message from header input
  const initialMessageHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !initialMessage) return;
    if (initialMessageHandledRef.current === initialMessage) return;
    initialMessageHandledRef.current = initialMessage;
    setChatPosition({ mode: "center" });
    createNewConversation(initialMessage);
  }, [isOpen, initialMessage]);

  // Reset to center when opening fresh
  useEffect(() => {
    if (isOpen && !initialMessage) {
      setChatPosition({ mode: "center" });
    }
  }, [isOpen, initialMessage, setChatPosition]);

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

  // Handle navigation with orchestrated animations
  const handleNavigation = useCallback(async (
    path: string,
    page: string,
    highlightId?: string,
    highlightType?: "rule" | "contact" | "group" | "user"
  ) => {
    const targetPath = path.split("?")[0];
    if (pathname === targetPath) {
      if (highlightId && highlightType) {
        setHighlightElement({ type: highlightType, id: highlightId });
      }
      return;
    }

    const targetPosition = getPositionForPage(page);
    setChatPosition({ mode: targetPosition });

    await new Promise(resolve => setTimeout(resolve, 300));

    router.push(path);

    if (highlightId && highlightType) {
      setTimeout(() => {
        setHighlightElement({ type: highlightType, id: highlightId });
      }, 100);
    }
  }, [pathname, router, setChatPosition, setHighlightElement]);

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

      if (data.toolResults) {
        for (const result of data.toolResults) {
          const props = result.uiComponent?.props;

          if (result.uiComponent?.type === "navigation" && props?.path) {
            await handleNavigation(
              props.path,
              props.path.split("/")[1] || "dashboard"
            );
          }

          if (props?.navigateTo) {
            const page = props.navigateTo.split("/")[1] || "dashboard";
            const highlightType = result.uiComponent?.type === "ruleCard" ? "rule"
              : result.uiComponent?.type === "contactCard" ? "contact"
              : result.uiComponent?.type === "groupCard" ? "group"
              : result.uiComponent?.type === "userCard" ? "user"
              : undefined;

            await handleNavigation(
              props.navigateTo,
              page,
              props.highlightId,
              highlightType
            );
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

  const togglePosition = () => {
    if (chatPosition.mode === "center") {
      setChatPosition({ mode: "side-right" });
    } else {
      setChatPosition({ mode: "center" });
    }
  };

  const isSide = chatPosition.mode !== "center";

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop - only when centered */}
          <AnimatePresence>
            {!isSide && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/20"
                onClick={onClose}
              />
            )}
          </AnimatePresence>

          {/* Chat panel - using absolute pixel positioning for smooth animation */}
          <motion.div
            key="chat-panel"
            initial={{
              left: initialPos.x,
              top: initialPos.y,
              width: initialPos.width,
              height: initialPos.height,
              opacity: 0,
              scale: initialPos.scale,
            }}
            animate={{
              left: targetPos.x,
              top: targetPos.y,
              width: targetPos.width,
              height: targetPos.height,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
            }}
            transition={springConfig}
            className="fixed z-50 bg-background border shadow-2xl flex flex-col rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5 text-background" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">AI Assistant</h2>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePosition}
                  title={isSide ? "Expand" : "Minimize"}
                  className="h-8 w-8"
                >
                  {isSide ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} title="Close" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages - flex-1 with min-h-0 to enable proper scrolling */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <p className="text-sm">What would you like to do?</p>
                </motion.div>
              ) : (
                activeConversation.messages.map((message, idx) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center shrink-0">
                        <Bot className="h-3 w-3 text-background" />
                      </div>
                    )}
                    <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end max-w-[85%]" : "max-w-[90%]"}`}>
                      {message.content && (
                        <div className={`rounded-lg px-3 py-2 ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      )}

                      {message.toolResults?.map((result, idx) => {
                        if (result.error) {
                          return (
                            <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              {result.error}
                            </div>
                          );
                        }
                        if (result.uiComponent && result.uiComponent.type !== "navigation") {
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className="w-full"
                            >
                              {renderToolComponent(result.uiComponent, undefined, onClose)}
                            </motion.div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-6 w-6 border shrink-0">
                        <AvatarFallback className="text-[10px]">You</AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                ))
              )}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <div className="h-6 w-6 rounded-full bg-foreground flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-background" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3 shrink-0">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tell me what to do..."
                  disabled={isProcessing}
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  onClick={() => input.trim() && sendMessage(input)}
                  disabled={!input.trim() || isProcessing}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
