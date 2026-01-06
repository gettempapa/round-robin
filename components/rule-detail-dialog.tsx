"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { getRoutingFieldLabel } from "@/lib/routing-context";

type Condition = {
  field: string;
  operator: string;
  value: string;
};

type Rule = {
  id: string;
  name: string;
  description: string | null;
  groupId: string;
  group: {
    id: string;
    name: string;
  };
  priority: number;
  isActive: boolean;
  conditions: string;
};

interface RuleDetailDialogProps {
  ruleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupClick?: (groupId: string) => void;
  onEditClick?: (ruleId: string) => void;
}

export function RuleDetailDialog({ ruleId, open, onOpenChange, onGroupClick, onEditClick }: RuleDetailDialogProps) {
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ruleId && open) {
      fetchRule();
    }
  }, [ruleId, open]);

  const fetchRule = async () => {
    if (!ruleId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/rules/${ruleId}`);
      if (response.ok) {
        const data = await response.json();
        setRule(data);
      }
    } catch (error) {
      console.error("Failed to fetch rule", error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  let parsedConditions: Condition[] = [];
  if (rule) {
    try {
      const parsed = JSON.parse(rule.conditions);
      if (Array.isArray(parsed)) {
        parsedConditions = parsed;
      }
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-2 border-primary/30 bg-gradient-to-br from-card to-muted/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Rule Details</DialogTitle>
          <DialogDescription>View routing rule configuration</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          </div>
        ) : rule ? (
          <div className="space-y-6">
            {/* Rule Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-foreground">{rule.name}</h3>
                <Badge variant={rule.isActive ? "default" : "secondary"}>
                  {rule.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">Priority {rule.priority}</Badge>
              </div>
              {rule.description && (
                <p className="text-sm text-muted-foreground">{rule.description}</p>
              )}
            </div>

            {/* Flow Diagram */}
            <div className="rounded-xl bg-gradient-to-br from-muted/50 via-muted/30 to-background/50 p-6 border-2 border-primary/30">
              <div className="flex items-start gap-6">
                {/* Conditions */}
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                    When Conditions Match
                  </div>
                  <div className="space-y-3">
                    {parsedConditions.map((condition, index) => (
                      <div key={index}>
                        <button
                          onClick={() => onEditClick?.(rule.id)}
                          className="w-full group relative"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/50 rounded-xl opacity-0 group-hover:opacity-100 blur transition duration-300" />

                          <div className="relative rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-primary/15 to-background shadow-lg transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-xl group-hover:scale-[1.02]">
                            <div className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-primary/20 rounded-lg px-3 py-1.5 border border-primary/30">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                  <div className="text-xs font-bold text-primary uppercase tracking-wider">
                                    {getRoutingFieldLabel(condition.field)}
                                  </div>
                                </div>

                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/20 border border-primary/40">
                                  <div className="text-base font-bold text-primary">
                                    {condition.operator === 'equals' ? '=' : condition.operator === 'contains' ? '⊃' : condition.operator === 'startsWith' ? '^' : condition.operator === 'greaterThan' ? '>' : condition.operator === 'lessThan' ? '<' : condition.operator}
                                  </div>
                                </div>

                                <div className="flex-1 rounded-lg bg-background/80 border-2 border-primary/30 px-4 py-1.5">
                                  <div className="text-sm font-bold text-foreground truncate">
                                    {condition.value}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>

                        {index < parsedConditions.length - 1 && (
                          <div className="flex flex-col items-center my-2">
                            <div className="w-px h-3 bg-gradient-to-b from-primary/60 to-transparent" />
                            <Badge variant="outline" className="bg-primary/20 border-primary/30 text-primary">
                              AND
                            </Badge>
                            <div className="w-px h-3 bg-gradient-to-b from-transparent to-primary/60" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/30 border-2 border-primary/50 shadow-xl">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Destination */}
                <div className="flex-1 flex items-center">
                  <button
                    onClick={() => onGroupClick?.(rule.groupId)}
                    className="w-full group relative"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-primary/50 to-primary/40 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition duration-300" />

                    <div className="relative rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/25 via-primary/20 to-background shadow-xl transition-all duration-300 group-hover:border-primary/70 group-hover:shadow-2xl group-hover:scale-[1.02]">
                      <div className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/40 to-primary/30 border-2 border-primary/50">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">
                              Routes to
                            </div>
                            <div className="text-base font-bold text-foreground">
                              {rule.group.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Rule not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
