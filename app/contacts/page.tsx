"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Contact as ContactIcon, Send, MoreVertical, Users, Workflow, Copy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ContactDetailDialog } from "@/components/contact-detail-dialog";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAI } from "@/components/ai-context";

type Assignment = {
  id: string;
  user: {
    name: string;
  };
  group: {
    name: string;
  };
  method: string;
};

type Contact = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  leadSource: string | null;
  assignments: Assignment[];
};

type Group = {
  id: string;
  name: string;
};

export default function ContactsPage() {
  const { executeQuery } = useAI();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [routingContactId, setRoutingContactId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [viewingContactId, setViewingContactId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    leadSource: "",
    industry: "",
    country: "",
    companySize: "",
  });

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts");
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      toast.error("Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      const data = await response.json();
      setGroups(data.filter((g: any) => g.isActive));
    } catch (error) {
      toast.error("Failed to fetch groups");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const contact = await response.json();

        // Check if auto-routing happened
        if (contact.autoRouted) {
          toast.success("Contact created and auto-routed!");
        } else {
          toast.success("Contact created");
          // Optionally ask if they want to route it manually
          if (groups.length > 0) {
            setRoutingContactId(contact.id);
          }
        }

        setOpen(false);
        resetForm();
        fetchContacts();
      }
    } catch (error) {
      toast.error("Failed to create contact");
    }
  };

  const handleRouteToGroup = async () => {
    if (!routingContactId || !selectedGroupId) return;

    try {
      const response = await fetch(
        `/api/contacts/${routingContactId}/route-to-group`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: selectedGroupId, method: "manual" }),
        }
      );

      if (response.ok) {
        const assignment = await response.json();
        toast.success(
          `Contact routed to ${assignment.user.name} in ${assignment.group.name}`
        );
        setRoutingContactId(null);
        setSelectedGroupId("");
        fetchContacts();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to route contact");
      }
    } catch (error) {
      toast.error("Failed to route contact");
    }
  };

  const handleTriggerWorkflow = async (contactId: string) => {
    try {
      const response = await fetch(`/api/webhooks/trigger-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Workflow triggered successfully");
        // Optionally show webhook URL or other details
        if (result.webhookUrl) {
          console.log("Webhook URL:", result.webhookUrl);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to trigger workflow");
      }
    } catch (error) {
      toast.error("Failed to trigger workflow");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      leadSource: "",
      industry: "",
      country: "",
      companySize: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* AI Inline Suggestion */}
        {contacts.filter(c => c.assignments.length === 0).length > 0 && (
          <div className="rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-950/10 to-transparent p-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  AI detected {contacts.filter(c => c.assignments.length === 0).length} unassigned contacts
                </p>
                <p className="text-xs text-muted-foreground">
                  Would you like to auto-route them based on existing rules?
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-violet-500/30 hover:bg-violet-950/10 shrink-0"
                onClick={() => executeQuery(`Auto-route ${contacts.filter(c => c.assignments.length === 0).length} unassigned contacts based on existing routing rules`)}
              >
                Auto-route all
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Contacts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {contacts.length} total
              <span className="text-muted-foreground/50">•</span>
              {contacts.filter(c => c.assignments.length > 0).length} assigned
              <span className="text-muted-foreground/50">•</span>
              {contacts.filter(c => c.assignments.length === 0).length} unassigned
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/contacts/duplicates">
              <Button variant="outline" size="sm">
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Duplicates
              </Button>
            </Link>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Create a new contact. You can route it to a group after creation.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        value={formData.jobTitle}
                        onChange={(e) =>
                          setFormData({ ...formData, jobTitle: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="leadSource">Lead Source</Label>
                      <Input
                        id="leadSource"
                        value={formData.leadSource}
                        onChange={(e) =>
                          setFormData({ ...formData, leadSource: e.target.value })
                        }
                        placeholder="e.g., Website, Referral"
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) =>
                          setFormData({ ...formData, industry: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="companySize">Company Size</Label>
                      <Input
                        id="companySize"
                        value={formData.companySize}
                        onChange={(e) =>
                          setFormData({ ...formData, companySize: e.target.value })
                        }
                        placeholder="e.g., 1-10, 50-100"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit">Create Contact</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Route to Group Dialog */}
        <Dialog
          open={routingContactId !== null}
          onOpenChange={(o) => !o && setRoutingContactId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign to Team</DialogTitle>
              <DialogDescription>
                Select a team for round-robin assignment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group">Select Group</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRoutingContactId(null)}
              >
                Skip
              </Button>
              <Button onClick={handleRouteToGroup} disabled={!selectedGroupId}>
                <Users className="mr-2 h-4 w-4" />
                Assign Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base font-medium">All Contacts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                <p className="mt-3 text-sm">Loading contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-muted text-muted-foreground mb-3">
                  <ContactIcon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-medium text-foreground">No contacts yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Get started by adding your first contact
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Lead Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => setViewingContactId(contact.id)}
                          className="text-left hover:underline hover:text-primary transition-colors"
                        >
                          {contact.name}
                        </button>
                      </TableCell>
                      <TableCell>{contact.email || "—"}</TableCell>
                      <TableCell>{contact.company || "—"}</TableCell>
                      <TableCell>{contact.leadSource || "—"}</TableCell>
                      <TableCell>
                        {contact.assignments.length > 0 ? (
                          <Badge>
                            Assigned to {contact.assignments[0].user.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not routed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {contact.assignments.length === 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                                <span className="ml-2">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => setRoutingContactId(contact.id)}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Assign to Team
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleTriggerWorkflow(contact.id)}
                              >
                                <Workflow className="mr-2 h-4 w-4" />
                                Trigger Workflow
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Detail Dialog */}
      <ContactDetailDialog
        contactId={viewingContactId}
        open={viewingContactId !== null}
        onOpenChange={(open) => !open && setViewingContactId(null)}
      />
    </DashboardLayout>
  );
}
