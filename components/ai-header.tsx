"use client";

import { useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, TrendingUp } from "lucide-react";
import { useAI } from "./ai-context";

export function AIHeader() {
  const { query, setQuery, executeQuery, isProcessing, setOriginRect } = useAI();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Capture the input's position for chat entry animation
  const captureOriginRect = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOriginRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [setOriginRect]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      captureOriginRect();
      executeQuery(query);
    }
  };

  // Also capture on focus click for when user clicks input to open chat
  const handleFocus = () => {
    captureOriginRect();
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
      <div className="flex h-16 items-center gap-4 px-8">
        {/* AI Input */}
        <div className="flex-1 max-w-3xl" ref={containerRef}>
          <form onSubmit={handleSubmit} className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-600">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-blue-600">AI</span>
            </div>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleFocus}
              disabled={isProcessing}
              placeholder={isProcessing ? "AI is processing..." : "Ask me anything..."}
              className="h-11 pl-20 pr-24 text-sm border-2 border-blue-500/20 focus:border-blue-500/50 bg-background/50 font-medium placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 disabled:opacity-70 relative z-10"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
              <Badge variant="secondary" className="text-xs font-mono bg-muted border-0 hidden sm:flex">
                ⌘K
              </Badge>
              <button
                type="submit"
                disabled={!query.trim() || isProcessing}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                {isProcessing ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">AI Active</span>
          </div>
          <Badge variant="secondary" className="hidden md:flex text-xs font-mono">
            <TrendingUp className="h-3 w-3 mr-1" />
            94% accuracy
          </Badge>
        </div>
      </div>
    </div>
  );
}
