"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Zap, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAI } from "./ai-context";

const suggestions = [
  "Create contact for john@acme.com",
  "Show unassigned contacts",
  "Route all enterprise leads to sales team",
  "Who has the most assignments this week?",
];

export function AIHeader() {
  const { query, setQuery, executeQuery, isProcessing } = useAI();
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeQuery(query);
    }
  };

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Update dropdown position when focused
  useEffect(() => {
    if (focused && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [focused]);

  return (
    <>
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
        <div className="flex h-16 items-center gap-4 px-8">
          {/* AI Input - Takes center stage */}
          <div className="flex-1 max-w-3xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-violet-600">AI</span>
              </div>
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                disabled={isProcessing}
                placeholder={isProcessing ? "AI is processing..." : "Ask me anything • Create contacts • Analyze performance • Route leads • Find duplicates..."}
                className="h-11 pl-20 pr-24 text-sm border-2 border-violet-500/20 focus:border-violet-500/50 bg-background/50 font-medium placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/30 disabled:opacity-70 relative z-10"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                <Badge variant="secondary" className="text-xs font-mono bg-muted border-0 hidden sm:flex">
                  ⌘K
                </Badge>
                <button
                  type="submit"
                  disabled={!query.trim() || isProcessing}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors"
                >
                  {isProcessing ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
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

      {/* Suggestions dropdown - Fixed positioned to be above everything */}
      {focused && !query && (
        <div
          className="fixed z-[300] rounded-lg border-2 border-violet-500/20 bg-background shadow-2xl"
          style={{
            top: `${dropdownPosition.top + 8}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <div className="p-3 border-b border-violet-500/10">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-3 w-3 text-violet-500" />
              Quick Actions
            </div>
          </div>
          <div className="p-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFocused(false);
                  executeQuery(suggestion);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-violet-950/10 text-left group transition-colors"
              >
                <span className="text-sm font-medium">{suggestion}</span>
                <Sparkles className="h-3.5 w-3.5 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-violet-500/10 bg-violet-950/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Powered by Claude AI • Natural language processing</span>
              <Badge variant="secondary" className="bg-violet-950/30 text-violet-400 border-violet-500/30 text-xs">
                Always learning
              </Badge>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
