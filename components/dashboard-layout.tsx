import { Sidebar } from "./sidebar";
import { AIHeader } from "./ai-header";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AIHeader />
        <main className="relative flex-1 overflow-y-auto">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

          <div className="relative min-h-full">
            <div className="mx-auto max-w-7xl px-4 py-4">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
