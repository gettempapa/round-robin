"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MergeWizard } from "@/components/merge-wizard";

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
};

export default function DuplicatesPage() {
  const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [mergingGroup, setMergingGroup] = useState<Contact[] | null>(null);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      const response = await fetch("/api/contacts/detect-duplicates");
      const data = await response.json();

      if (response.ok) {
        setDuplicateGroups(data.duplicateGroups || []);
      } else {
        toast.error("Failed to load duplicates");
      }
    } catch (error) {
      toast.error("Failed to load duplicates");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectDuplicates = async () => {
    setDetecting(true);

    try {
      const response = await fetch("/api/contacts/detect-duplicates", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Found ${data.duplicateGroups} duplicate groups (${data.totalDuplicates} contacts)`
        );
        fetchDuplicates();
      } else {
        toast.error("Failed to detect duplicates");
      }
    } catch (error) {
      toast.error("Failed to detect duplicates");
    } finally {
      setDetecting(false);
    }
  };

  const handleMergeComplete = () => {
    setMergingGroup(null);
    fetchDuplicates();
  };

  const getContactLabel = (contact: Contact) => {
    const parts = [contact.name];
    if (contact.company) parts.push(contact.company);
    if (contact.email) parts.push(contact.email);
    return parts.join(" • ");
  };

  const countFilledFields = (contact: Contact) => {
    let count = 0;
    if (contact.email) count++;
    if (contact.phone) count++;
    if (contact.company) count++;
    if (contact.jobTitle) count++;
    if (contact.industry) count++;
    if (contact.country) count++;
    if (contact.companySize) count++;
    if (contact.leadSource) count++;
    return count;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Duplicate Contacts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and merge duplicate contacts to keep your data clean
            </p>
          </div>
          <Button
            onClick={handleDetectDuplicates}
            disabled={detecting}
            size="sm"
          >
            {detecting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan for Duplicates
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-3 text-sm text-muted-foreground">
              Loading duplicates...
            </p>
          </div>
        ) : duplicateGroups.length === 0 ? (
          <Card className="border bg-emerald-500/5">
            <CardContent className="text-center py-12">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-3">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-medium text-foreground">No Duplicates Found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your contact database is clean! Click "Scan for Duplicates" to check again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-sm">
                  Found {duplicateGroups.length} duplicate groups ({duplicateGroups.reduce((sum, g) => sum + g.length, 0)} total contacts)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review each group and merge to consolidate your data
                </p>
              </div>
            </div>

            {duplicateGroups.map((group, groupIndex) => (
              <Card
                key={groupIndex}
                className="border"
              >
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Duplicate Group {groupIndex + 1}
                      <Badge variant="outline" className="text-xs">{group.length} contacts</Badge>
                    </CardTitle>
                    <Button
                      onClick={() => setMergingGroup(group)}
                      size="sm"
                    >
                      Review & Merge
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {group.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-md border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{getContactLabel(contact)}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {countFilledFields(contact)} fields • {new Date(contact.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-4">
                          {contact.email && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              Email
                            </Badge>
                          )}
                          {contact.phone && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              Phone
                            </Badge>
                          )}
                          {contact.company && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              Company
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {mergingGroup && (
        <MergeWizard
          contacts={mergingGroup}
          open={!!mergingGroup}
          onClose={() => setMergingGroup(null)}
          onComplete={handleMergeComplete}
        />
      )}
    </DashboardLayout>
  );
}
