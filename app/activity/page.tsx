"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity as ActivityIcon, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { ContactDetailDialog } from "@/components/contact-detail-dialog";
import { UserDetailDialog } from "@/components/user-detail-dialog";
import { GroupDetailDialog } from "@/components/group-detail-dialog";
import { RuleDetailDialog } from "@/components/rule-detail-dialog";

type MatchedCondition = {
  condition: { field: string; operator: string; value: string };
  matched: boolean;
  actualValue: string | null;
};

type Assignment = {
  id: string;
  contactId: string;
  userId: string;
  groupId: string;
  method: string;
  ruleId: string | null;
  metadata: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string;
    company: string | null;
  };
  user: {
    id: string;
    name: string;
  };
  group: {
    id: string;
    name: string;
  };
};

type Rule = {
  id: string;
  name: string;
  conditions: string;
};

export default function ActivityPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rulesMap, setRulesMap] = useState<Map<string, Rule>>(new Map());
  const [loading, setLoading] = useState(true);
  const [viewingContactId, setViewingContactId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [viewingRuleId, setViewingRuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const response = await fetch("/api/activity");
      const data = await response.json();
      setAssignments(data.assignments || []);
      setRulesMap(new Map((data.rules || []).map((r: Rule) => [r.id, r])));
    } catch (error) {
      console.error("Failed to fetch activity", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Activity Log
          </h1>
          <p className="text-muted-foreground text-lg">
            Track all contact routing and assignments
          </p>
        </div>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm card-elevated">
          <CardHeader className="border-b-2 border-primary/20">
            <CardTitle className="text-xl font-bold">Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground font-medium">Loading activity...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-primary/20 text-primary mb-4 border-2 border-primary/30 shadow-sm">
                  <ActivityIcon className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No activity yet</h3>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Routing history will appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Method / Rule</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const rule = assignment.ruleId ? rulesMap.get(assignment.ruleId) : null;

                    // Try to get matched conditions from metadata (with actual values)
                    let matchedConditions: MatchedCondition[] = [];
                    let conditionLogic = "AND";
                    let metadataRuleName = null;

                    if (assignment.metadata) {
                      try {
                        const meta = JSON.parse(assignment.metadata);
                        if (meta.conditions && Array.isArray(meta.conditions)) {
                          matchedConditions = meta.conditions;
                        }
                        if (meta.conditionLogic) {
                          conditionLogic = meta.conditionLogic;
                        }
                        if (meta.matchedRule?.name) {
                          metadataRuleName = meta.matchedRule.name;
                        }
                      } catch {}
                    }

                    // Fallback to rule conditions if no metadata
                    let fallbackConditions: any[] = [];
                    if (matchedConditions.length === 0 && rule) {
                      try {
                        const parsed = JSON.parse(rule.conditions);
                        if (Array.isArray(parsed)) {
                          fallbackConditions = parsed;
                        }
                      } catch {}
                    }

                    const displayRuleName = metadataRuleName || rule?.name;

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => setViewingContactId(assignment.contact.id)}
                            className="text-left hover:underline hover:text-primary transition-colors"
                          >
                            {assignment.contact.name}
                          </button>
                        </TableCell>
                        <TableCell>{assignment.contact.company || "—"}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => setViewingUserId(assignment.userId)}
                            className="text-left hover:underline hover:text-primary transition-colors font-medium"
                          >
                            {assignment.user.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setViewingGroupId(assignment.groupId)}
                            className="text-left hover:underline hover:text-primary transition-colors font-medium"
                          >
                            {assignment.group.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant={
                                assignment.method === "auto" ? "default" : "secondary"
                              }
                            >
                              {assignment.method === "auto" ? "Auto-routed" : "Manual"}
                            </Badge>
                            {displayRuleName && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <button
                                  onClick={() => rule && setViewingRuleId(rule.id)}
                                  className="font-medium hover:text-primary hover:underline transition-colors"
                                >
                                  {displayRuleName}
                                </button>

                                {/* Show matched conditions with actual values */}
                                {matchedConditions.length > 0 && (
                                  <div className="mt-1.5 space-y-0.5">
                                    {matchedConditions.map((mc, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        {i > 0 && <span className="text-[10px] text-muted-foreground/60 mr-1">{conditionLogic}</span>}
                                        <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                        <span className="font-mono text-[11px]">
                                          {mc.condition.field} {mc.condition.operator} "{mc.condition.value}"
                                        </span>
                                        <span className="text-muted-foreground/60 text-[10px]">
                                          (was: {mc.actualValue || 'empty'})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Fallback: show rule conditions without actual values */}
                                {matchedConditions.length === 0 && fallbackConditions.length > 0 && (
                                  <div className="mt-1">
                                    Matched: {fallbackConditions.map((c, i) => (
                                      <span key={i}>
                                        {i > 0 && " AND "}
                                        <span className="font-mono">
                                          {c.field} {c.operator} "{c.value}"
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(assignment.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialogs */}
      <ContactDetailDialog
        contactId={viewingContactId}
        open={viewingContactId !== null}
        onOpenChange={(open) => !open && setViewingContactId(null)}
      />
      <UserDetailDialog
        userId={viewingUserId}
        open={viewingUserId !== null}
        onOpenChange={(open) => !open && setViewingUserId(null)}
      />
      <GroupDetailDialog
        groupId={viewingGroupId}
        open={viewingGroupId !== null}
        onOpenChange={(open) => !open && setViewingGroupId(null)}
        onUserClick={setViewingUserId}
      />
      <RuleDetailDialog
        ruleId={viewingRuleId}
        open={viewingRuleId !== null}
        onOpenChange={(open) => !open && setViewingRuleId(null)}
        onGroupClick={setViewingGroupId}
        onEditClick={(ruleId) => {
          setViewingRuleId(null);
          window.location.href = '/rules';
        }}
      />
    </DashboardLayout>
  );
}
