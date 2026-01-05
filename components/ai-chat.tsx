"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Wand2,
  Plus,
  MessageSquare,
  Trash2,
  ChevronUp,
  ChevronRight,
  User,
  Users,
  Workflow,
  Layers,
  X,
  Bot,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export function AIChat({ isOpen, onClose, initialMessage }: AIChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const collapsedInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Load conversations from localStorage on mount
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("ai-conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  // Handle initial message
  useEffect(() => {
    if (isOpen && initialMessage && conversations.length === 0) {
      createNewConversation(initialMessage);
    }
  }, [isOpen, initialMessage]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (isCollapsed) {
          collapsedInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, isCollapsed]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

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
    setIsCollapsed(false);

    if (firstMessage) {
      await handleSendMessage(firstMessage, newConv.id);
    }
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSendMessage = async (message: string, conversationId?: string) => {
    const targetConvId = conversationId || activeConversationId;
    if (!targetConvId) return;

    const userMessage = message || input;
    if (!userMessage.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const updatedMessages = [...conv.messages, userMsg];
        const title = conv.messages.length === 0 ? userMessage.slice(0, 50) : conv.title;
        return {
          ...conv,
          messages: updatedMessages,
          updatedAt: new Date(),
          title
        };
      }
      return conv;
    }));

    setInput("");
    setIsProcessing(true);

    try {
      const conversation = conversations.find(c => c.id === targetConvId);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversation?.messages || []
        }),
      });

      const data = await response.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "Done!",
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
      setTimeout(() => {
        if (isCollapsed) {
          collapsedInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleToolAction = (action: string, data: any) => {
    console.log("Tool action:", action, data);
  };

  const renderMessageContent = (message: Message) => {
    const hasToolResults = message.toolResults && message.toolResults.length > 0;

    return (
      <div className="space-y-3">
        {/* Text content */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        )}

        {/* Tool result UI components */}
        {hasToolResults && (
          <div className="space-y-2 mt-3">
            {message.toolResults!.map((result, idx) => {
              if (result.error) {
                return (
                  <div
                    key={idx}
                    className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded-md"
                  >
                    Error: {result.error}
                  </div>
                );
              }

              if (result.uiComponent) {
                return (
                  <div key={idx}>
                    {renderToolComponent(
                      result.uiComponent,
                      handleToolAction,
                      onClose
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  // Collapsed top bar view with tabs and input
  if (isCollapsed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 border-b bg-background shadow-sm animate-in slide-in-from-top-2 duration-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Agent indicator */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            {/* Conversation tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {conversations.slice(0, 4).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    activeConversationId === conv.id
                      ? "bg-muted font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[120px] truncate">{conv.title}</span>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>

            {/* Quick input */}
            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 max-w-2xl">
              <Input
                ref={collapsedInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI to do something..."
                disabled={isProcessing || !activeConversation}
                className="h-9"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isProcessing || !activeConversation}
                size="sm"
                className="h-9 px-3"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => createNewConversation()}
                className="h-9"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(false)}
                className="h-9"
              >
                Expand
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded chat view
  return (
    <div
      className="fixed inset-0 z-50 bg-background/20 animate-in fade-in-0 duration-200"
      onClick={() => setIsCollapsed(true)}
    >
      <div
        className="container mx-auto h-full flex flex-col items-center justify-start pt-12 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-3xl h-[calc(100vh-8rem)] flex flex-col bg-background border rounded-lg shadow-2xl animate-in slide-in-from-top-4 duration-300">
          {/* Header with tabs */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              {/* Agent indicator */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    RoundRobin AI
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Agent
                    </Badge>
                  </h2>
                </div>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border" />

              {/* Conversation tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {conversations.slice(0, 4).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors shrink-0 ${
                      activeConversationId === conv.id
                        ? "bg-muted font-medium"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="max-w-[100px] truncate">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => createNewConversation()}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    RoundRobin AI Agent
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    I can take actions on your behalf - create contacts, assign leads,
                    set up routing rules, and more. Just tell me what you need.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  <Button
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start"
                    onClick={() =>
                      handleSendMessage("Show me unassigned contacts")
                    }
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">Unassigned contacts</p>
                      <p className="text-xs text-muted-foreground">
                        View leads awaiting assignment
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start"
                    onClick={() =>
                      handleSendMessage("Create a contact for demo@example.com named Demo User")
                    }
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">Create a contact</p>
                      <p className="text-xs text-muted-foreground">
                        Add a new lead to the system
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start"
                    onClick={() =>
                      handleSendMessage("Who has the most assignments this week?")
                    }
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">Team performance</p>
                      <p className="text-xs text-muted-foreground">
                        See assignment distribution
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start"
                    onClick={() =>
                      handleSendMessage("Show me all routing rules")
                    }
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">Routing rules</p>
                      <p className="text-xs text-muted-foreground">
                        View active routing configuration
                      </p>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {activeConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`flex flex-col gap-2 ${
                        message.role === "user" ? "items-end max-w-[75%]" : "max-w-[85%]"
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {message.role === "assistant"
                          ? renderMessageContent(message)
                          : (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {message.content}
                              </p>
                            )}
                      </div>
                      <span className="text-xs text-muted-foreground px-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarFallback className="text-xs">You</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex gap-4 animate-in fade-in-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Working on it...
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            {!activeConversation ? (
              <Button
                onClick={() => createNewConversation()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start a conversation
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to do something..."
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
