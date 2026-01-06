"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

// Position configurations for different modes
const positionConfigs: Record<ChatPositionMode, {
  className: string;
  style?: React.CSSProperties;
}> = {
  center: {
    className: "top-1/2 left-1/2 w-full max-w-xl max-h-[80vh]",
    style: { transform: "translate(-50%, -50%)" },
  },
  "side-right": {
    className: "right-4 top-20 bottom-4 w-[340px]",
  },
  "side-left": {
    className: "left-[280px] top-20 bottom-4 w-[340px]",
  },
  "bottom-right": {
    className: "right-4 bottom-4 w-[400px] max-h-[50vh]",
  },
};

// Spring animation config for smooth, magical feel
const springConfig = {
  type: "spring" as const,
  damping: 28,
  stiffness: 350,
};

// Determine best chat position based on navigation target
function getPositionForPage(page: string): ChatPositionMode {
  switch (page) {
    case "rules":
      return "side-left"; // Rules page has flow visualization on right
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
  const [isAnimatingPosition, setIsAnimatingPosition] = useState(false);

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
    // Don't navigate if already on the page
    const targetPath = path.split("?")[0];
    if (pathname === targetPath) {
      // Just highlight if needed
      if (highlightId && highlightType) {
        setHighlightElement({ type: highlightType, id: highlightId });
      }
      return;
    }

    // Start position animation
    setIsAnimatingPosition(true);
    const targetPosition = getPositionForPage(page);
    setChatPosition({ mode: targetPosition });

    // Wait for position animation to settle
    await new Promise(resolve => setTimeout(resolve, 300));

    // Navigate
    router.push(path);

    // Set highlight after navigation
    if (highlightId && highlightType) {
      // Small delay to let the page render
      setTimeout(() => {
        setHighlightElement({ type: highlightType, id: highlightId });
      }, 100);
    }

    setIsAnimatingPosition(false);
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

      // Handle navigation and highlighting from tool results
      if (data.toolResults) {
        for (const result of data.toolResults) {
          const props = result.uiComponent?.props;

          // Handle explicit navigation
          if (result.uiComponent?.type === "navigation" && props?.path) {
            await handleNavigation(
              props.path,
              props.path.split("/")[1] || "dashboard"
            );
          }

          // Handle navigation hints from other tools (like createRule)
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
  const currentConfig = positionConfigs[chatPosition.mode];

  // Calculate initial animation origin from header input
  const getInitialAnimation = () => {
    if (originRect) {
      return {
        opacity: 0,
        scale: 0.3,
        x: originRect.x - window.innerWidth / 2 + originRect.width / 2,
        y: originRect.y - window.innerHeight / 2 + originRect.height / 2,
      };
    }
    return {
      opacity: 0,
      scale: 0.85,
      y: -30,
    };
  };

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

          {/* Chat panel */}
          <motion.div
            key="chat-panel"
            initial={getInitialAnimation()}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: -20,
            }}
            transition={springConfig}
            layout
            layoutId="ai-chat"
            className={`fixed z-50 bg-background border shadow-2xl flex flex-col rounded-xl overflow-hidden ${currentConfig.className}`}
            style={currentConfig.style}
          >
            {/* Header */}
            <motion.div
              layout="position"
              className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  layout
                  className="h-7 w-7 rounded-full bg-foreground flex items-center justify-center"
                >
                  <Bot className="h-3.5 w-3.5 text-background" />
                </motion.div>
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
            </motion.div>

            {/* Messages */}
            <motion.div layout="position" className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    transition={{ delay: idx * 0.05 }}
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

                      {/* Render tool results as UI components */}
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
            </motion.div>

            {/* Input */}
            <motion.div layout="position" className="border-t p-3 shrink-0">
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
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
