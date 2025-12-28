"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  UserCircle,
  Contact,
  Workflow,
  Activity,
  FileText,
  Settings,
  Calendar,
  Cloud,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Contacts", href: "/contacts", icon: Contact },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Rules", href: "/rules", icon: Workflow },
  { name: "Forms", href: "/forms", icon: FileText },
  { name: "Users", href: "/users", icon: UserCircle },
  { name: "Activity", href: "/activity", icon: Activity },
];

const integrations = [
  { name: "Salesforce", href: "/salesforce/opportunities", icon: Cloud },
];

const settings = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar/95 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <Workflow className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">RoundRobin</span>
            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wide">AI Native</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="flex items-center space-x-2.5">
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {/* Integrations Section */}
        <div className="pt-4">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Integrations
            </span>
          </div>
          {integrations.map((item) => {
            const isActive = pathname.startsWith(item.href.split('/').slice(0, 2).join('/'));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="flex items-center space-x-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Section */}
        <div className="pt-4">
          {settings.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="flex items-center space-x-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t px-5 py-3">
        <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-violet-950/10 to-transparent p-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <svg className="h-3 w-3 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            AI-Powered Routing
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            v2.0.0-alpha
          </p>
        </div>
      </div>
    </div>
  );
}
