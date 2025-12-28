"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, MapPin, Calendar, TrendingUp, User, Users, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { UserDetailDialog } from "@/components/user-detail-dialog";
import { GroupDetailDialog } from "@/components/group-detail-dialog";
import { RuleDetailDialog } from "@/components/rule-detail-dialog";

type Assignment = {
  id: string;
  userId: string;
  groupId: string;
  ruleId: string | null;
  method: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  group: {
    id: string;
    name: string;
  };
  rule?: {
    id: string;
    name: string;
    conditions: string;
  } | null;
};

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  leadSource: string | null;
  industry: string | null;
  country: string | null;
  companySize: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: Assignment[];
};

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [contactId, setContactId] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [viewingRuleId, setViewingRuleId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      setContactId(p.id);
      fetchContact(p.id);
    });
  }, []);

  const fetchContact = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contacts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setContact(data);
      }
    } catch (error) {
      console.error("Failed to fetch contact", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contact) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Contact not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  const currentAssignment = contact.assignments[0];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/contacts')}
            className="border-2 border-primary/30"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 space-y-2">
            <div className="relative inline-block">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                {contact.name}
              </h1>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-transparent rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              {currentAssignment ? (
                <Badge variant="default" className="gap-1">
                  <Users className="h-3 w-3" />
                  Assigned to {currentAssignment.user.name}
                </Badge>
              ) : (
                <Badge variant="outline">Not routed</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact Details Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Primary Info Card */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm card-elevated">
            <CardHeader className="border-b-2 border-primary/30">
              <CardTitle className="text-xl font-bold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">Email</div>
                  <div className="text-sm font-medium text-foreground">{contact.email}</div>
                </div>
              </div>

              {contact.phone && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Phone</div>
                    <div className="text-sm font-medium text-foreground">{contact.phone}</div>
                  </div>
                </div>
              )}

              {contact.company && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Company</div>
                    <div className="text-sm font-medium text-foreground">{contact.company}</div>
                  </div>
                </div>
              )}

              {contact.jobTitle && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Job Title</div>
                    <div className="text-sm font-medium text-foreground">{contact.jobTitle}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details Card */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm card-elevated">
            <CardHeader className="border-b-2 border-primary/30">
              <CardTitle className="text-xl font-bold">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {contact.leadSource && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Lead Source</div>
                    <div className="text-sm font-medium text-foreground">{contact.leadSource}</div>
                  </div>
                </div>
              )}

              {contact.industry && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Industry</div>
                    <div className="text-sm font-medium text-foreground">{contact.industry}</div>
                  </div>
                </div>
              )}

              {contact.country && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Country</div>
                    <div className="text-sm font-medium text-foreground">{contact.country}</div>
                  </div>
                </div>
              )}

              {contact.companySize && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider">Company Size</div>
                    <div className="text-sm font-medium text-foreground">{contact.companySize}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">Created</div>
                  <div className="text-sm font-medium text-foreground">
                    {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">Last Updated</div>
                  <div className="text-sm font-medium text-foreground">
                    {formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routing History */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm card-elevated">
          <CardHeader className="border-b-2 border-primary/30">
            <CardTitle className="text-xl font-bold">Routing History</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {contact.assignments.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary/20 text-primary mb-4 border-2 border-primary/30">
                  <Workflow className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No routing history</h3>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  This contact hasn't been routed yet
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Method / Rule</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <button
                          onClick={() => setViewingUserId(assignment.userId)}
                          className="font-medium hover:underline hover:text-primary transition-colors"
                        >
                          {assignment.user.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => setViewingGroupId(assignment.groupId)}
                          className="font-medium hover:underline hover:text-primary transition-colors"
                        >
                          {assignment.group.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={assignment.method === "auto" ? "default" : "secondary"}>
                            {assignment.method === "auto" ? "Auto-routed" : "Manual"}
                          </Badge>
                          {assignment.rule && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <button
                                onClick={() => setViewingRuleId(assignment.rule!.id)}
                                className="font-medium hover:text-primary hover:underline transition-colors"
                              >
                                {assignment.rule.name}
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(assignment.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialogs */}
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
          router.push('/rules');
        }}
      />
    </DashboardLayout>
  );
}
