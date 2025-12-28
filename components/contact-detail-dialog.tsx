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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { Mail, Phone, Building, User, Calendar, ArrowRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

type Assignment = {
  id: string;
  method: string;
  ruleId: string | null;
  createdAt: string;
  user: {
    name: string;
  };
  group: {
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
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  leadSource: string | null;
  industry: string | null;
  country: string | null;
  companySize: string | null;
  createdAt: string;
  assignments: Assignment[];
};

type ContactDetailDialogProps = {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContactDetailDialog({
  contactId,
  open,
  onOpenChange,
}: ContactDetailDialogProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (contactId && open) {
      setLoading(true);
      fetch(`/api/contacts/${contactId}`)
        .then((res) => res.json())
        .then((data) => {
          setContact(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [contactId, open]);

  if (!contact && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-primary/30 bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{contact?.name || "Loading..."}</DialogTitle>
              <DialogDescription>
                Contact details and routing history
              </DialogDescription>
            </div>
            {contact && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/contacts/${contact.id}`);
                }}
                className="gap-2 border-2 border-primary/30"
              >
                View Full Page
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : contact ? (
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.company}</span>
                  </div>
                )}
                {contact.jobTitle && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.jobTitle}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {contact.leadSource && (
                  <div>
                    <div className="text-xs text-muted-foreground">Lead Source</div>
                    <div className="text-sm font-medium">{contact.leadSource}</div>
                  </div>
                )}
                {contact.industry && (
                  <div>
                    <div className="text-xs text-muted-foreground">Industry</div>
                    <div className="text-sm font-medium">{contact.industry}</div>
                  </div>
                )}
                {contact.country && (
                  <div>
                    <div className="text-xs text-muted-foreground">Country</div>
                    <div className="text-sm font-medium">{contact.country}</div>
                  </div>
                )}
                {contact.companySize && (
                  <div>
                    <div className="text-xs text-muted-foreground">Company Size</div>
                    <div className="text-sm font-medium">{contact.companySize}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Created {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Routing History */}
            <div>
              <h3 className="font-semibold mb-3">
                Routing History ({contact.assignments.length})
              </h3>
              {contact.assignments.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No routing history yet
                </div>
              ) : (
                <div className="space-y-4">
                  {contact.assignments.map((assignment, index) => {
                    let conditions: any[] = [];
                    if (assignment.rule) {
                      try {
                        const parsed = JSON.parse(assignment.rule.conditions);
                        if (Array.isArray(parsed)) {
                          conditions = parsed;
                        }
                      } catch {}
                    }

                    return (
                      <div
                        key={assignment.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                assignment.method === "auto" ? "default" : "secondary"
                              }
                            >
                              {assignment.method === "auto" ? "Auto-routed" : "Manual"}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="outline">Current</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(assignment.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Assigned to</span>
                          <span className="font-medium">{assignment.user.name}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">in</span>
                          <Badge variant="outline">{assignment.group.name}</Badge>
                        </div>

                        {assignment.rule && (
                          <div className="text-xs mt-2 p-2 bg-muted/50 rounded">
                            <div className="font-medium text-muted-foreground mb-1">
                              Rule: {assignment.rule.name}
                            </div>
                            {conditions.length > 0 && (
                              <div className="font-mono">
                                Matched: {conditions.map((c, i) => (
                                  <span key={i}>
                                    {i > 0 && " AND "}
                                    <span className="text-foreground">
                                      {c.field} {c.operator} "{c.value}"
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
