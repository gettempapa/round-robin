"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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

type Props = {
  contacts: Contact[];
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job Title" },
  { key: "leadSource", label: "Lead Source" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "companySize", label: "Company Size" },
];

export function MergeWizard({ contacts, open, onClose, onComplete }: Props) {
  const [masterContactId, setMasterContactId] = useState<string>("");
  const [fieldPreferences, setFieldPreferences] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);

  // Auto-select the suggested master contact
  useEffect(() => {
    if (contacts.length > 0) {
      const suggested = suggestMasterContact(contacts);
      setMasterContactId(suggested.id);

      // Initialize field preferences with master contact
      const prefs: Record<string, string> = {};
      for (const field of FIELDS) {
        prefs[field.key] = suggested.id;
      }
      setFieldPreferences(prefs);
    }
  }, [contacts]);

  const suggestMasterContact = (contacts: Contact[]): Contact => {
    let bestContact = contacts[0];
    let bestScore = 0;

    for (const contact of contacts) {
      let score = 0;

      // Add points for each filled field
      if (contact.email) score += 10;
      if (contact.phone) score += 5;
      if (contact.company) score += 5;
      if (contact.jobTitle) score += 3;
      if (contact.industry) score += 2;
      if (contact.country) score += 2;
      if (contact.companySize) score += 2;
      if (contact.leadSource) score += 1;

      // Bonus for being older (first in system)
      const daysSinceCreated =
        (Date.now() - new Date(contact.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += daysSinceCreated * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestContact = contact;
      }
    }

    return bestContact;
  };

  const handleMerge = async () => {
    if (!masterContactId) {
      toast.error("Please select a master contact");
      return;
    }

    setMerging(true);

    try {
      const duplicateContactIds = contacts
        .filter((c) => c.id !== masterContactId)
        .map((c) => c.id);

      const response = await fetch("/api/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterContactId,
          duplicateContactIds,
          fieldPreferences,
        }),
      });

      if (response.ok) {
        toast.success("Contacts merged successfully!");
        onComplete();
      } else {
        toast.error("Failed to merge contacts");
      }
    } catch (error) {
      toast.error("Failed to merge contacts");
    } finally {
      setMerging(false);
    }
  };

  const handleFieldChange = (field: string, contactId: string) => {
    setFieldPreferences({
      ...fieldPreferences,
      [field]: contactId,
    });
  };

  const getFieldValue = (contact: Contact, field: string): string => {
    const value = contact[field as keyof Contact];
    return value ? String(value) : "";
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
    <Dialog open={open} onOpenChange={(o) => !merging && o === false && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto modern-scrollbar p-0">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Merge Duplicate Contacts</DialogTitle>
            <DialogDescription className="text-sm">
              Select the master contact to keep and choose which fields to use from each duplicate
            </DialogDescription>
          </DialogHeader>

          {/* Master Contact Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Master Contact (to keep)
            </h3>
            <div className="grid gap-2">
              {contacts.map((contact) => {
                const isSelected = masterContactId === contact.id;
                const isSuggested = suggestMasterContact(contacts).id === contact.id;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setMasterContactId(contact.id)}
                    className={`relative p-3 rounded-lg border transition-all text-left ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm truncate">{contact.name}</div>
                          {isSelected && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs px-1.5 py-0">
                              <Check className="h-3 w-3 mr-1" />
                              Master
                            </Badge>
                          )}
                          {isSuggested && !isSelected && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              <Star className="h-3 w-3 mr-1" />
                              Suggested
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {contact.email && <div>{contact.email}</div>}
                          {contact.company && <div>{contact.company}</div>}
                          {contact.phone && <div>{contact.phone}</div>}
                        </div>
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          {countFilledFields(contact)} fields • {new Date(contact.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Choose Field Values
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-2 border-b flex items-center gap-3 font-medium text-xs">
                <div className="w-32">Field</div>
                {contacts.map((contact, idx) => (
                  <div key={contact.id} className="flex-1 text-center">
                    Contact {idx + 1}
                    {masterContactId === contact.id && (
                      <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                        Master
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="p-2 border-b last:border-b-0 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="w-32 font-medium text-xs">{field.label}</div>
                  {contacts.map((contact) => {
                    const value = getFieldValue(contact, field.key);
                    const isSelected = fieldPreferences[field.key] === contact.id;

                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleFieldChange(field.key, contact.id)}
                        disabled={!value}
                        className={`flex-1 text-center p-1.5 rounded-md border transition-all text-xs ${
                          !value
                            ? "text-muted-foreground/40 border-transparent cursor-not-allowed"
                            : isSelected
                            ? "border-emerald-500 bg-emerald-500/5 font-medium"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        {value || "—"}
                        {isSelected && value && (
                          <Check className="inline-block h-3 w-3 ml-1 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t bg-muted/30 p-4">
          <div className="flex justify-between items-center w-full">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={merging}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleMerge} disabled={merging || !masterContactId}>
              {merging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  Merge Contacts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
