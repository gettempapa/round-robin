"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Command, ArrowRight, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

const suggestions = [
  { text: "Create a new contact for Acme Corp", action: "create-contact", icon: "✨" },
  { text: "Show me all contacts from last week", action: "filter-contacts", icon: "🔍" },
  { text: "Set up a rule for enterprise leads", action: "create-rule", icon: "⚡" },
  { text: "Route this contact to the sales team", action: "route-contact", icon: "🎯" },
  { text: "Show me group performance metrics", action: "analytics", icon: "📊" },
];

export function AICommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSuggestion = (action: string) => {
    // Handle different actions
    switch (action) {
      case "create-contact":
        router.push("/contacts");
        break;
      case "create-rule":
        router.push("/rules");
        break;
      case "analytics":
        router.push("/analytics");
        break;
      default:
        break;
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      {/* Floating AI Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/50 transition-all hover:scale-110 hover:shadow-violet-500/70 border border-violet-400/30"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Command Bar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 border-violet-500/30 bg-gradient-to-b from-background via-background to-violet-950/5">
          {/* Header with AI indicator */}
          <div className="flex items-center gap-3 border-b border-violet-500/20 bg-violet-950/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">AI Assistant</div>
              <div className="text-xs text-muted-foreground">Ask anything or give commands</div>
            </div>
            <Badge variant="secondary" className="bg-violet-950/30 text-violet-300 border-violet-500/30 text-xs font-mono">
              <Command className="h-3 w-3 mr-1" />K
            </Badge>
          </div>

          {/* Input */}
          <div className="p-4 border-b border-violet-500/10">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or ask a question..."
                className="h-12 pl-4 pr-12 text-base border-violet-500/20 focus:border-violet-500/50 bg-background/50"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Zap className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="p-2 max-h-96 overflow-y-auto">
            {query === "" ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Suggestions
                </div>
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(suggestion.action)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-violet-950/20 text-left group transition-colors"
                  >
                    <span className="text-lg">{suggestion.icon}</span>
                    <span className="flex-1 text-sm">{suggestion.text}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-violet-500 animate-pulse" />
                AI is analyzing your request...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-violet-500/10 bg-violet-950/5 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex gap-4">
              <div>
                <Badge variant="secondary" className="mr-1 text-xs font-mono">↵</Badge>
                Execute
              </div>
              <div>
                <Badge variant="secondary" className="mr-1 text-xs font-mono">Esc</Badge>
                Close
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Powered by</span>
              <Badge variant="secondary" className="bg-violet-950/30 text-violet-400 border-violet-500/30 text-xs font-semibold">
                Claude AI
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
