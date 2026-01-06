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

// Constants
const SIDEBAR_WIDTH = 256; // w-64
const CHAT_PADDING = 16;
const HEADER_HEIGHT = 64;
const CHAT_WIDTH = 380;
const CHAT_HEIGHT = 420;

// Spring animation config for smooth, magical feel
const springConfig = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
};

export function AICommandChat({ isOpen, onClose, initialMessage }: AIChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightedElementRect, setHighlightedElementRect] = useState<DOMRect | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const {
    chatPosition,
    setChatPosition,
    highlightElement,
    setHighlightElement,
    originRect,
  } = useAI();

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Watch for highlighted element and get its position
  useEffect(() => {
    if (!highlightElement) {
      setHighlightedElementRect(null);
      return;
    }

    // Small delay to let the element render after navigation
    const timer = setTimeout(() => {
      const el = document.querySelector('.ai-highlight');
      if (el) {
        setHighlightedElementRect(el.getBoundingClientRect());
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [highlightElement, pathname]);

  // Calculate smart position that avoids highlighted element and sidebar
  const getSmartPosition = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Center position (for when chat is first opened)
    if (chatPosition.mode === "center") {
      const centerWidth = Math.min(560, vw - 32);
      const centerHeight = Math.min(500, vh - 120);
      return {
        x: (vw - centerWidth) / 2,
        y: (vh - centerHeight) / 2,
        width: centerWidth,
        height: centerHeight,
      };
    }

    // For side positions, use consistent chat dimensions
    const chatWidth = CHAT_WIDTH;
    const chatHeight = CHAT_HEIGHT;

    // Safe bounds (avoiding sidebar and edges)
    const minX = SIDEBAR_WIDTH + CHAT_PADDING;
    const maxX = vw - chatWidth - CHAT_PADDING;
    const minY = HEADER_HEIGHT + CHAT_PADDING;
    const maxY = vh - chatHeight - CHAT_PADDING;

    // Default position: bottom-right (safe spot)
    let x = maxX;
    let y = maxY;

    // If we have a highlighted element, position relative to it
    if (highlightedElementRect) {
      const elCenterX = highlightedElementRect.left + highlightedElementRect.width / 2;
      const elCenterY = highlightedElementRect.top + highlightedElementRect.height / 2;

      // Try to position chat above the highlighted element
      const aboveY = highlightedElementRect.top - chatHeight - CHAT_PADDING;

      // Try to position chat to the right of the highlighted element
      const rightX = highlightedElementRect.right + CHAT_PADDING;

      // Try to position chat to the left of the highlighted element (but after sidebar)
      const leftX = highlightedElementRect.left - chatWidth - CHAT_PADDING;

      // Decision logic: prefer above, then right, then bottom-right default
      if (aboveY >= minY) {
        // Can fit above - center horizontally relative to element
        y = aboveY;
        x = Math.max(minX, Math.min(maxX, elCenterX - chatWidth / 2));
      } else if (rightX + chatWidth <= vw - CHAT_PADDING) {
        // Can fit to the right
        x = rightX;
        y = Math.max(minY, Math.min(maxY, elCenterY - chatHeight / 2));
      } else if (leftX >= minX) {
        // Can fit to the left (after sidebar)
        x = leftX;
        y = Math.max(minY, Math.min(maxY, elCenterY - chatHeight / 2));
      } else {
        // Default to bottom-right, but try not to overlap
        // If element is in bottom-right, move chat to top-right
        if (elCenterY > vh / 2 && elCenterX > vw / 2) {
          y = minY;
        }
      }
    }

    // Ensure within bounds
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));

    return { x, y, width: chatWidth, height: chatHeight };
  }, [chatPosition.mode, highlightedElementRect]);

  // Get current target position
  const targetPos = useMemo(() => getSmartPosition(), [getSmartPosition]);

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
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      x: vw / 2 - 50,
      y: vh / 2 - 100,
      width: 100,
      height: 50,
      opacity: 0,
      scale: 0.8,
    };
  }, [originRect]);

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

  // Watch for route changes and switch to side mode
  useEffect(() => {
    if (!isOpen) return;

    const page = pathname?.split("/")[1] || "";

    // Move to side mode when navigating away from initial centered view
    if (chatPosition.mode === "center" && page) {
      setChatPosition({ mode: "side" });
    }
  }, [pathname, isOpen]);

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

    // Move to side mode before navigation
    setChatPosition({ mode: "side" });

    await new Promise(resolve => setTimeout(resolve, 150));

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
      console.log('AI Response:', {
        message: data.message,
        toolResults: data.toolResults,
        toolCount: data.toolResults?.length || 0,
      });

      if (data.toolResults && data.toolResults.length > 0) {
        for (const result of data.toolResults) {
          console.log('Processing tool result:', {
            tool: result.tool,
            success: result.success,
            uiComponentType: result.uiComponent?.type,
            props: result.uiComponent?.props,
            data: result.data,
          });

          const props = result.uiComponent?.props;

          // Handle navigation from listContacts or navigateTo
          if (result.uiComponent?.type === "navigation" && props?.path) {
            console.log('=== NAVIGATION TRIGGERED ===');
            console.log('Path:', props.path);
            console.log('Current pathname:', pathname);

            try {
              await handleNavigation(
                props.path,
                props.path.split("/")[1] || "dashboard"
              );
              console.log('Navigation completed successfully');
            } catch (navError) {
              console.error('Navigation failed:', navError);
            }
          }

          // Handle navigateTo prop from other tools (createRule, createContact, etc.)
          if (props?.navigateTo) {
            const page = props.navigateTo.split("/")[1] || "dashboard";
            const highlightType = result.uiComponent?.type === "ruleCard" ? "rule"
              : result.uiComponent?.type === "contactCard" ? "contact"
              : result.uiComponent?.type === "groupCard" ? "group"
              : result.uiComponent?.type === "userCard" ? "user"
              : undefined;

            console.log('=== NAVIGATE TO (from tool result) ===');
            console.log('Target:', props.navigateTo);

            try {
              await handleNavigation(
                props.navigateTo,
                page,
                props.highlightId,
                highlightType
              );
            } catch (navError) {
              console.error('Navigation (navigateTo) failed:', navError);
            }
          }
        }
      } else {
        console.log('No tool results in response - AI may not have used a tool');
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
      setChatPosition({ mode: "side" });
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

          {/* Chat panel - using smart positioning */}
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
