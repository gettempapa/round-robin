"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Plus,
  MessageSquare,
  X,
  Bot,
  ChevronUp,
  ChevronDown,
  User,
  Users,
  Building2,
  Mail,
  Phone,
  Globe,
  Briefcase,
  ArrowRight,
  Check,
  AlertCircle,
  Filter,
  Layers,
  Edit2,
  Zap,
  UserPlus,
  BarChart3,
  Hash,
  AtSign,
  Command,
  History,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { renderToolComponent } from "@/components/ai-chat-components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============ TYPES ============

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
  intent?: DetectedIntent;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

type DetectedIntent = {
  type: "create_contact" | "assign_contact" | "create_rule" | "list_data" | "get_stats" | "navigate" | "general";
  confidence: number;
  entities: Record<string, string>;
  preview?: ActionPreview;
};

type ActionPreview = {
  title: string;
  description: string;
  type: "contact" | "assignment" | "rule" | "navigation" | "query";
  data: any;
  affectedCount?: number;
};

type Suggestion = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: "quick_action" | "entity" | "example";
};

type WizardMode = {
  type: "create_contact" | "create_rule" | "bulk_assign" | null;
  step: number;
  data: any;
};

type AIChatProps = {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
};

// ============ INTENT DETECTION ============

const detectIntent = (text: string): DetectedIntent | null => {
  const lowerText = text.toLowerCase();

  // Create contact patterns
  if (/create|add|new/.test(lowerText) && /contact|lead|person/.test(lowerText)) {
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const nameMatch = text.match(/(?:named?|called?|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    const companyMatch = text.match(/(?:at|from|company)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:with|who|$))/i);

    return {
      type: "create_contact",
      confidence: 0.85,
      entities: {
        email: emailMatch?.[0] || "",
        name: nameMatch?.[1] || "",
        company: companyMatch?.[1] || "",
      },
      preview: {
        title: "Create New Contact",
        description: "Add a new contact to your database",
        type: "contact",
        data: {
          name: nameMatch?.[1] || "New Contact",
          email: emailMatch?.[0] || "",
          company: companyMatch?.[1] || "",
        },
      },
    };
  }

  // Assign contact patterns
  if (/assign|route|send/.test(lowerText) && /to\s+\w+/.test(lowerText)) {
    const groupMatch = text.match(/to\s+(?:the\s+)?([A-Za-z\s]+?)(?:\s+team|\s+group|$)/i);

    return {
      type: "assign_contact",
      confidence: 0.75,
      entities: {
        group: groupMatch?.[1]?.trim() || "",
      },
    };
  }

  // Create rule patterns
  if (/create|add|new|set up/.test(lowerText) && /rule|routing|automation/.test(lowerText)) {
    return {
      type: "create_rule",
      confidence: 0.8,
      entities: {},
    };
  }

  // List/show patterns
  if (/show|list|get|find|search/.test(lowerText) && /contact|lead|user|group|rule/.test(lowerText)) {
    return {
      type: "list_data",
      confidence: 0.9,
      entities: {},
    };
  }

  // Stats patterns
  if (/stats|statistics|performance|analytics|how many|count/.test(lowerText)) {
    return {
      type: "get_stats",
      confidence: 0.85,
      entities: {},
    };
  }

  return null;
};

// ============ MAIN COMPONENT ============

export function AICommandChat({ isOpen, onClose, initialMessage }: AIChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<DetectedIntent | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [availableGroups, setAvailableGroups] = useState<{id: string; name: string}[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{id: string; name: string}[]>([]);
  const [wizardMode, setWizardMode] = useState<WizardMode>({ type: null, step: 1, data: {} });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Load data for autocomplete
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      fetch("/api/groups").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
    ]).then(([groups, users]) => {
      setAvailableGroups(groups);
      setAvailableUsers(users);
    }).catch(console.error);
  }, [isOpen]);

  // Load conversations from localStorage - only once on mount
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

  // Handle input change with intent detection and suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    if (value.length > 2) {
      const intent = detectIntent(value);
      setCurrentIntent(intent);

      // Generate contextual suggestions
      const newSuggestions: Suggestion[] = [];

      // Check for @ mention (users)
      const atMatch = value.match(/@(\w*)$/);
      if (atMatch) {
        const search = atMatch[1].toLowerCase();
        availableUsers
          .filter(u => u.name.toLowerCase().includes(search))
          .slice(0, 4)
          .forEach(user => {
            newSuggestions.push({
              id: `user-${user.id}`,
              label: user.name,
              description: "Team member",
              icon: <User className="h-4 w-4" />,
              action: () => {
                const newValue = value.replace(/@\w*$/, `@${user.name} `);
                setInput(newValue);
                setShowSuggestions(false);
              },
              category: "entity",
            });
          });
      }

      // Check for # mention (groups)
      const hashMatch = value.match(/#(\w*)$/);
      if (hashMatch) {
        const search = hashMatch[1].toLowerCase();
        availableGroups
          .filter(g => g.name.toLowerCase().includes(search))
          .slice(0, 4)
          .forEach(group => {
            newSuggestions.push({
              id: `group-${group.id}`,
              label: group.name,
              description: "Team/Group",
              icon: <Users className="h-4 w-4" />,
              action: () => {
                const newValue = value.replace(/#\w*$/, `#${group.name} `);
                setInput(newValue);
                setShowSuggestions(false);
              },
              category: "entity",
            });
          });
      }

      // Check for "to " pattern (routing to group)
      const toMatch = value.match(/\bto\s+(\w*)$/i);
      if (toMatch && !atMatch && !hashMatch) {
        const search = toMatch[1].toLowerCase();
        availableGroups
          .filter(g => g.name.toLowerCase().includes(search))
          .slice(0, 4)
          .forEach(group => {
            newSuggestions.push({
              id: `to-group-${group.id}`,
              label: group.name,
              description: "Route to this team",
              icon: <ArrowRight className="h-4 w-4" />,
              action: () => {
                const newValue = value.replace(/\bto\s+\w*$/i, `to ${group.name} `);
                setInput(newValue);
                setShowSuggestions(false);
              },
              category: "entity",
            });
          });
      }

      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setCurrentIntent(null);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        suggestions[selectedSuggestionIndex]?.action();
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    // Check if we should enter wizard mode for complex operations
    if (currentIntent && currentIntent.confidence >= 0.7) {
      if (currentIntent.type === "create_contact") {
        // Enter contact creation wizard
        setWizardMode({
          type: "create_contact",
          step: 1,
          data: {
            name: currentIntent.entities.name || "",
            email: currentIntent.entities.email || "",
            company: currentIntent.entities.company || "",
          },
        });
        setInput("");
        setCurrentIntent(null);
        return;
      }

      if (currentIntent.type === "create_rule") {
        // Redirect to AI Rule Wizard on the rules page with the prompt
        router.push(`/rules?aiWizard=true&prompt=${encodeURIComponent(input)}`);
        onClose();
        return;
      }
    }

    // If we have a high-confidence action intent, show preview first
    if (currentIntent && currentIntent.confidence >= 0.8 && currentIntent.preview && !showPreview) {
      setShowPreview(true);
      return;
    }

    await handleSendMessage(input);
    setShowPreview(false);
    setCurrentIntent(null);
  };

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

    if (!targetConvId) {
      await createNewConversation(message);
      return;
    }

    const userMessage = message || input;
    if (!userMessage.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
      intent: currentIntent || undefined,
    };

    // Get the current conversation history BEFORE updating state
    const currentConversation = conversations.find(c => c.id === targetConvId);
    const existingMessages = currentConversation?.messages || [];

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const updatedMessages = [...conv.messages, userMsg];
        const title = conv.messages.length === 0 ? userMessage.slice(0, 50) : conv.title;
        return { ...conv, messages: updatedMessages, updatedAt: new Date(), title };
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
          message: userMessage,
          conversationHistory: existingMessages
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleToolAction = (action: string, data: any) => {
    console.log("Tool action:", action, data);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Focus input
  useEffect(() => {
    if (isOpen && !isCollapsed) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isCollapsed]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-emerald-600 dark:text-emerald-400";
    if (confidence >= 0.6) return "text-amber-600 dark:text-amber-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const renderMessageContent = (message: Message) => {
    const hasToolResults = message.toolResults && message.toolResults.length > 0;

    return (
      <div className="space-y-3">
        {message.content && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        )}

        {hasToolResults && (
          <div className="space-y-2 mt-3">
            {message.toolResults!.map((result, idx) => {
              if (result.error) {
                return (
                  <div
                    key={idx}
                    className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded-md flex items-start gap-2"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {result.error}
                  </div>
                );
              }

              if (result.uiComponent) {
                return (
                  <div key={idx}>
                    {renderToolComponent(result.uiComponent, handleToolAction, onClose)}
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

  // Handle sending message from collapsed bar
  const handleCollapsedSend = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    setIsCollapsed(false);

    // Small delay to let the expanded view render
    await new Promise(resolve => setTimeout(resolve, 50));

    // If no active conversation, create one
    if (!activeConversationId || conversations.length === 0) {
      await createNewConversation(message);
    } else {
      // Add to existing conversation
      await handleSendMessage(message, activeConversationId);
    }
  };

  // ============ COLLAPSED VIEW ============
  if (isCollapsed) {
    const hasExistingChat = conversations.length > 0 && activeConversationId;

    return (
      <div className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-sm shadow-sm animate-in slide-in-from-top-2 duration-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Click to expand existing chat */}
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-600 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              {hasExistingChat && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {activeConversation?.title?.slice(0, 20)}...
                </span>
              )}
            </button>

            <div className="flex-1 flex items-center gap-2 max-w-2xl relative">
              <div className="relative flex-1">
                <Command className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim()) {
                        const msg = input;
                        setInput("");
                        handleCollapsedSend(msg);
                      } else {
                        // Just expand if no input
                        setIsCollapsed(false);
                      }
                    }
                  }}
                  onFocus={() => {
                    // If clicking into input with existing chat, could expand first
                    // But let's keep it simple - they can type and send
                  }}
                  placeholder={hasExistingChat ? "Continue chat or start new..." : "Start a new chat..."}
                  disabled={isProcessing}
                  className="w-full h-9 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button
                onClick={() => {
                  if (input.trim()) {
                    const msg = input;
                    setInput("");
                    handleCollapsedSend(msg);
                  } else {
                    setIsCollapsed(false);
                  }
                }}
                disabled={isProcessing}
                size="sm"
                className="h-9 px-3"
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => createNewConversation()} className="h-9">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(false)} className="h-9">
                {hasExistingChat ? "Open" : "Expand"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ EXPANDED VIEW ============
  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 animate-in fade-in-0 duration-200"
      onClick={() => setIsCollapsed(true)}
    >
      <div
        className="container mx-auto h-full flex flex-col items-center justify-start pt-8 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-4xl h-[calc(100vh-6rem)] flex flex-col bg-background border rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-foreground flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-background" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">RoundRobin AI</h2>
                  <p className="text-[11px] text-muted-foreground">Takes actions on your behalf</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {conversations.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <History className="h-4 w-4 mr-1.5" />
                      Recent
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {conversations.slice(0, 8).map((conv) => (
                      <DropdownMenuItem
                        key={conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                        className="flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{conv.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {conv.messages.length} messages · {conv.updatedAt.toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                    {conversations.length > 8 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-muted-foreground">
                          +{conversations.length - 8} more chats
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="sm" onClick={() => createNewConversation()}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Wizard Mode - takes over the full panel */}
            {wizardMode.type === "create_contact" && (
              <ContactCreationWizard
                wizardData={wizardMode.data}
                groups={availableGroups}
                onUpdate={(data) => setWizardMode(prev => ({ ...prev, data }))}
                onComplete={() => {
                  setWizardMode({ type: null, step: 1, data: {} });
                }}
                onCancel={() => {
                  setWizardMode({ type: null, step: 1, data: {} });
                }}
              />
            )}

            {/* Messages Column - only show when not in wizard mode */}
            {!wizardMode.type && (
            <>
            <div className={`flex-1 flex flex-col ${showPreview ? "border-r" : ""}`}>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <EmptyState onSend={handleSendMessage} />
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
                          <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-background" />
                          </div>
                        )}
                        <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end max-w-[75%]" : "max-w-[85%]"}`}>
                          <div className={`rounded-xl px-4 py-3 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {message.role === "assistant" ? renderMessageContent(message) : (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground px-1">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                        <div className="h-8 w-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-background" />
                        </div>
                        <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-3">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-2 w-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-2 w-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-sm text-muted-foreground">Working on it...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4 bg-background">
                <div className="relative">
                  {/* Intent indicator */}
                  {currentIntent && currentIntent.confidence >= 0.6 && (
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className={`${getConfidenceColor(currentIntent.confidence)} border-current`}>
                        <Zap className="h-3 w-3 mr-1" />
                        {currentIntent.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-muted-foreground">
                        {Math.round(currentIntent.confidence * 100)}% confident
                      </span>
                    </div>
                  )}

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg overflow-hidden z-10">
                      <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                        Suggestions (Tab to select)
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={suggestion.id}
                            onClick={suggestion.action}
                            className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted transition-colors ${
                              idx === selectedSuggestionIndex ? "bg-muted" : ""
                            }`}
                          >
                            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              {suggestion.icon}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{suggestion.label}</div>
                              <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me to do something... (@ for users, # for groups)"
                        disabled={isProcessing}
                        rows={1}
                        className="w-full min-h-[44px] max-h-32 rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        style={{ height: "auto" }}
                      />
                      <div className="absolute right-3 bottom-2.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
                      </div>
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!input.trim() || isProcessing}
                      className="h-11 px-4"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : showPreview ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Confirm
                        </>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && currentIntent?.preview && (
              <ActionPreviewPanel
                intent={currentIntent}
                onConfirm={handleSubmit}
                onCancel={() => {
                  setShowPreview(false);
                  setCurrentIntent(null);
                }}
                onEdit={() => {
                  setShowPreview(false);
                  inputRef.current?.focus();
                }}
              />
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ EMPTY STATE ============
function EmptyState({ onSend }: { onSend: (msg: string) => void }) {
  const quickActions = [
    {
      icon: <UserPlus className="h-5 w-5" />,
      label: "Create a contact",
      description: "Add a new lead to the system",
      prompt: "Create a new contact",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "View unassigned",
      description: "See leads awaiting assignment",
      prompt: "Show me unassigned contacts",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Team performance",
      description: "See assignment distribution",
      prompt: "Who has the most assignments this week?",
    },
    {
      icon: <Layers className="h-5 w-5" />,
      label: "Routing rules",
      description: "View active routing configuration",
      prompt: "Show me all routing rules",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-foreground flex items-center justify-center">
          <Bot className="h-8 w-8 text-background" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">What can I help you with?</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          I can take actions on your behalf - create contacts, assign leads,
          set up routing rules, and more.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSend(action.prompt)}
            className="group flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0 bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
              {action.icon}
            </div>
            <div>
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <AtSign className="h-3 w-3" /> mention users
        </span>
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" /> mention groups
        </span>
        <span className="flex items-center gap-1">
          <Command className="h-3 w-3" /> for commands
        </span>
      </div>
    </div>
  );
}

// ============ ACTION PREVIEW PANEL ============
function ActionPreviewPanel({
  intent,
  onConfirm,
  onCancel,
  onEdit,
}: {
  intent: DetectedIntent;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
}) {
  const preview = intent.preview!;

  return (
    <div className="w-80 bg-muted/30 border-l flex flex-col animate-in slide-in-from-right-4 duration-300">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Action Preview</h3>
          <Badge variant="outline" className="text-xs">
            {Math.round(intent.confidence * 100)}% match
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{preview.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Visual Preview based on type */}
        {preview.type === "contact" && (
          <ContactPreview data={preview.data} />
        )}
        {preview.type === "assignment" && (
          <AssignmentPreview data={preview.data} />
        )}
        {preview.type === "rule" && (
          <RulePreview data={preview.data} />
        )}
      </div>

      <div className="p-4 border-t bg-background space-y-2">
        <Button onClick={onConfirm} className="w-full">
          <Check className="h-4 w-4 mr-2" />
          Confirm Action
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit} className="flex-1">
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ PREVIEW COMPONENTS ============

function ContactPreview({ data }: { data: any }) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{data.name || "New Contact"}</h4>
            <p className="text-xs text-muted-foreground">Contact</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {data.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{data.email}</span>
            </div>
          )}
          {data.company && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{data.company}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{data.phone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentPreview({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">{data.contactName || "Contact"}</p>
            <p className="text-xs text-muted-foreground">Contact</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium">{data.groupName || "Group"}</p>
            <p className="text-xs text-muted-foreground">Team</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulePreview({ data }: { data: any }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Filter className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-sm">{data.name || "New Rule"}</h4>
            <p className="text-xs text-muted-foreground">Routing Rule</p>
          </div>
        </div>

        {data.conditions && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Conditions</p>
            {data.conditions.map((cond: any, idx: number) => (
              <div key={idx} className="bg-muted/50 rounded p-2 text-xs">
                {cond.field} {cond.operator} {cond.value}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ CONTACT CREATION WIZARD ============
function ContactCreationWizard({
  wizardData,
  groups,
  onUpdate,
  onComplete,
  onCancel,
}: {
  wizardData: any;
  groups: {id: string; name: string}[];
  onUpdate: (data: any) => void;
  onComplete: (data: any) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: wizardData.name || "",
    email: wizardData.email || "",
    company: wizardData.company || "",
    phone: "",
    leadSource: "",
    industry: "",
    companySize: "",
    assignToGroup: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdContact, setCreatedContact] = useState<any>(null);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          company: formData.company || null,
          phone: formData.phone || null,
          leadSource: formData.leadSource || null,
          industry: formData.industry || null,
          companySize: formData.companySize || null,
        }),
      });

      if (response.ok) {
        const contact = await response.json();
        setCreatedContact(contact);

        // If they want to assign, do that too
        if (formData.assignToGroup) {
          await fetch(`/api/contacts/${contact.id}/route-to-group`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: formData.assignToGroup }),
          });
        }

        setStep(3); // Success step
      }
    } catch (error) {
      console.error("Failed to create contact:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadSources = ["Website", "Referral", "Conference", "Cold Outreach", "Partner", "Advertising"];
  const industries = ["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", "Consulting"];
  const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-emerald-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Create Contact</h3>
            <p className="text-sm text-muted-foreground">Add a new lead to your database</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-3 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all ${
                step >= s
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Details" : s === 2 ? "Review" : "Done"}
              </span>
              {s < 3 && <div className={`w-8 h-px ${step > s ? "bg-emerald-500" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {step === 1 && (
          <div className="space-y-6 max-w-md mx-auto animate-in fade-in-0 slide-in-from-right-4 duration-300">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="John Doe"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Acme Inc"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Select value={formData.leadSource} onValueChange={(v) => updateField("leadSource", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((src) => (
                        <SelectItem key={src} value={src}>{src}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(v) => updateField("industry", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={formData.companySize} onValueChange={(v) => updateField("companySize", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => (
                      <SelectItem key={size} value={size}>{size} employees</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {groups.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="assignToGroup">Assign to Team (optional)</Label>
                  <Select value={formData.assignToGroup} onValueChange={(v) => updateField("assignToGroup", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team to assign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-md mx-auto animate-in fade-in-0 slide-in-from-right-4 duration-300">
            <Card className="border-emerald-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{formData.name || "New Contact"}</h4>
                    <p className="text-sm text-muted-foreground">{formData.company || "No company"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.email}</span>
                    </div>
                  )}
                  {formData.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.phone}</span>
                    </div>
                  )}
                  {formData.leadSource && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>Source: {formData.leadSource}</span>
                    </div>
                  )}
                  {formData.industry && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.industry}</span>
                    </div>
                  )}
                  {formData.companySize && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.companySize} employees</span>
                    </div>
                  )}
                </div>

                {formData.assignToGroup && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <ArrowRight className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">
                        Will be assigned to <span className="font-medium">{groups.find(g => g.id === formData.assignToGroup)?.name}</span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && createdContact && (
          <div className="max-w-md mx-auto text-center animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Contact Created!</h3>
            <p className="text-muted-foreground mb-6">
              {createdContact.name} has been added to your database
              {formData.assignToGroup && " and assigned to the selected team"}.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => onComplete(createdContact)}>
                Done
              </Button>
              <Button onClick={() => {
                setStep(1);
                setFormData({
                  name: "",
                  email: "",
                  company: "",
                  phone: "",
                  leadSource: "",
                  industry: "",
                  companySize: "",
                  assignToGroup: "",
                });
                setCreatedContact(null);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Create Another
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {step < 3 && (
        <div className="border-t p-4 bg-background flex justify-between">
          <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(1)}>
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={step === 1 ? () => setStep(2) : handleCreate}
            disabled={!formData.name.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : step === 1 ? (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Create Contact
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
