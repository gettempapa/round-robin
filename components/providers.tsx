"use client";

import { AIProvider } from "./ai-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AIProvider>{children}</AIProvider>;
}
