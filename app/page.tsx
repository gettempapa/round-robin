"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Contact, Workflow, TrendingUp, Sparkles, Command, ArrowRight, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { useAI } from "@/components/ai-context";
import { useEffect, useState } from "react";

export default function Home() {
  const { executeQuery } = useAI();
  const [stats, setStats] = useState([
    { name: "Contacts", value: 0, icon: Contact, description: "in database", href: "/contacts", change: "+12%" },
    { name: "Users", value: 0, icon: Users, description: "team members", href: "/users", change: "+2" },
    { name: "Groups", value: 0, icon: TrendingUp, description: "active groups", href: "/groups", change: "3 active" },
    { name: "Rules", value: 0, icon: Workflow, description: "routing rules", href: "/rules", change: "0 enabled" },
  ]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);

  useEffect(() => {
    // Fetch stats
    Promise.all([
      fetch("/api/contacts").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/groups").then(r => r.json()),
      fetch("/api/rules").then(r => r.json()),
      fetch("/api/activity").then(r => r.json()).catch(() => []),
    ]).then(([contacts, users, groups, rules, activity]) => {
      setStats([
        { name: "Contacts", value: contacts.length || 0, icon: Contact, description: "in database", href: "/contacts", change: "+12%" },
        { name: "Users", value: users.length || 0, icon: Users, description: "team members", href: "/users", change: "+2" },
        { name: "Groups", value: groups.length || 0, icon: TrendingUp, description: "active groups", href: "/groups", change: "3 active" },
        { name: "Rules", value: rules.filter((r: any) => r.isActive).length || 0, icon: Workflow, description: "routing rules", href: "/rules", change: `${rules.filter((r: any) => r.isActive).length} enabled` },
      ]);
      setRecentAssignments(activity.slice(0, 5));
    });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Overview
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time routing intelligence • Last updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 md:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.name} href={stat.href} className="block group">
              <Card className="hover:border-primary/50 transition-all hover:shadow-sm border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">{stat.change}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-semibold tracking-tight font-mono-tabular">{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-medium">{stat.name}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* AI Insights Banner */}
        <div className="rounded border bg-card p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted border">
              <Sparkles className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">AI Analysis Complete</h3>
                <Badge variant="secondary" className="text-xs">
                  Just now
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  onClick={() => executeQuery("Create a routing rule for 15 unrouted high-value enterprise leads")}
                  className="flex items-start gap-2 rounded border border-dashed p-2.5 text-left hover:bg-muted/50 transition-all group cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium group-hover:text-foreground transition-colors">15 unrouted high-value leads</div>
                    <div className="text-xs text-muted-foreground">Create enterprise rule</div>
                  </div>
                </button>
                <button
                  onClick={() => executeQuery("Rebalance the Sales team - John has 40% more assignments than others")}
                  className="flex items-start gap-2 rounded border border-dashed p-2.5 text-left hover:bg-muted/50 transition-all group cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium group-hover:text-foreground transition-colors">Load imbalance detected</div>
                    <div className="text-xs text-muted-foreground">Rebalance Sales team</div>
                  </div>
                </button>
                <button
                  onClick={() => executeQuery("Review and merge 3 duplicate contacts with similar emails and company names")}
                  className="flex items-start gap-2 rounded border border-dashed p-2.5 text-left hover:bg-muted/50 transition-all group cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium group-hover:text-foreground transition-colors">3 duplicate contacts found</div>
                    <div className="text-xs text-muted-foreground">Review and merge</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Recent Activity */}
          <Card className="border">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
                <Link href="/activity" className="text-xs text-muted-foreground hover:text-foreground">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentAssignments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y">
                  {recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {assignment.contact.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          → {assignment.user.name} • {assignment.group.name}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono shrink-0">
                        {new Date(assignment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
