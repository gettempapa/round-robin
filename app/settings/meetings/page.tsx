"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Clock, CheckCircle, XCircle, Bell } from "lucide-react";

interface MeetingType {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  color: string | null;
  isActive: boolean;
  _count: { bookings: number };
}

interface MeetingOutcome {
  id: string;
  name: string;
  description: string | null;
  isPositive: boolean;
  isActive: boolean;
  _count: { bookings: number };
}

interface ReminderConfig {
  id: string;
  name: string;
  minutesBefore: number;
  emailSubject: string;
  isActive: boolean;
  _count: { reminders: number };
}

export default function MeetingsSettingsPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [outcomes, setOutcomes] = useState<MeetingOutcome[]>([]);
  const [reminderConfigs, setReminderConfigs] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [editingOutcome, setEditingOutcome] = useState<MeetingOutcome | null>(null);
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null);

  // Form states
  const [typeName, setTypeName] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [typeDuration, setTypeDuration] = useState(30);
  const [typeColor, setTypeColor] = useState("#6366f1");
  const [typeActive, setTypeActive] = useState(true);

  const [outcomeName, setOutcomeName] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [outcomePositive, setOutcomePositive] = useState(true);
  const [outcomeActive, setOutcomeActive] = useState(true);

  const [reminderName, setReminderName] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(1440);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderActive, setReminderActive] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [typesRes, outcomesRes, remindersRes] = await Promise.all([
        fetch("/api/meeting-types"),
        fetch("/api/meeting-outcomes"),
        fetch("/api/reminder-configs"),
      ]);

      const typesData = await typesRes.json();
      const outcomesData = await outcomesRes.json();
      const remindersData = await remindersRes.json();

      setMeetingTypes(typesData.meetingTypes || []);
      setOutcomes(outcomesData.outcomes || []);
      setReminderConfigs(remindersData.configs || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Meeting Types handlers
  const openTypeDialog = (type?: MeetingType) => {
    if (type) {
      setEditingType(type);
      setTypeName(type.name);
      setTypeDescription(type.description || "");
      setTypeDuration(type.duration);
      setTypeColor(type.color || "#6366f1");
      setTypeActive(type.isActive);
    } else {
      setEditingType(null);
      setTypeName("");
      setTypeDescription("");
      setTypeDuration(30);
      setTypeColor("#6366f1");
      setTypeActive(true);
    }
    setTypeDialogOpen(true);
  };

  const saveType = async () => {
    setSaving(true);
    try {
      const body = {
        name: typeName,
        description: typeDescription || null,
        duration: typeDuration,
        color: typeColor,
        isActive: typeActive,
      };

      const url = editingType
        ? `/api/meeting-types/${editingType.id}`
        : "/api/meeting-types";
      const method = editingType ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingType ? "Meeting type updated" : "Meeting type created");
      setTypeDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error("Failed to save meeting type:", error);
      toast.error("Failed to save meeting type");
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting type?")) return;

    try {
      const response = await fetch(`/api/meeting-types/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Meeting type deleted");
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete meeting type");
    }
  };

  // Outcomes handlers
  const openOutcomeDialog = (outcome?: MeetingOutcome) => {
    if (outcome) {
      setEditingOutcome(outcome);
      setOutcomeName(outcome.name);
      setOutcomeDescription(outcome.description || "");
      setOutcomePositive(outcome.isPositive);
      setOutcomeActive(outcome.isActive);
    } else {
      setEditingOutcome(null);
      setOutcomeName("");
      setOutcomeDescription("");
      setOutcomePositive(true);
      setOutcomeActive(true);
    }
    setOutcomeDialogOpen(true);
  };

  const saveOutcome = async () => {
    setSaving(true);
    try {
      const body = {
        name: outcomeName,
        description: outcomeDescription || null,
        isPositive: outcomePositive,
        isActive: outcomeActive,
      };

      const url = editingOutcome
        ? `/api/meeting-outcomes/${editingOutcome.id}`
        : "/api/meeting-outcomes";
      const method = editingOutcome ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success(editingOutcome ? "Outcome updated" : "Outcome created");
      setOutcomeDialogOpen(false);
      fetchAll();
    } catch (error) {
      console.error("Failed to save outcome:", error);
      toast.error("Failed to save outcome");
    } finally {
      setSaving(false);
    }
  };

  const deleteOutcome = async (id: string) => {
    if (!confirm("Are you sure you want to delete this outcome?")) return;

    try {
      const response = await fetch(`/api/meeting-outcomes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Outcome deleted");
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete outcome");
    }
  };

  // Reminder handlers
  const openReminderDialog = (config?: ReminderConfig) => {
    if (config) {
      setEditingReminder(config);
      setReminderName(config.name);
      setReminderMinutes(config.minutesBefore);
      setReminderSubject(config.emailSubject);
      setReminderActive(config.isActive);
    } else {
      setEditingReminder(null);
      setReminderName("");
      setReminderMinutes(1440);
      setReminderSubject("Reminder: Your upcoming meeting");
      setReminderActive(true);
    }
    setReminderDialogOpen(true);
  };

  const saveReminder = async () => {
    setSaving(true);
    try {
      const body = {
        name: reminderName,
        minutesBefore: reminderMinutes,
        emailSubject: reminderSubject,
        isActive: reminderActive,
      };

      const url = editingReminder
        ? `/api/reminder-configs/${editingReminder.id}`
        : "/api/reminder-configs";
      const method = editingReminder ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(editingReminder ? "Reminder updated" : "Reminder created");
      setReminderDialogOpen(false);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || "Failed to save reminder");
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reminder configuration?")) return;

    try {
      const response = await fetch(`/api/reminder-configs/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Reminder deleted");
      fetchAll();
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? "s" : ""} before`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""} before`;
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""} before`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meeting Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure meeting types, outcomes, and reminder schedules
          </p>
        </div>

        <Tabs defaultValue="types">
          <TabsList>
            <TabsTrigger value="types">Meeting Types</TabsTrigger>
            <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>

          {/* Meeting Types Tab */}
          <TabsContent value="types" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Meeting Types</CardTitle>
                  <CardDescription>
                    Define different types of meetings with default durations
                  </CardDescription>
                </div>
                <Button onClick={() => openTypeDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetingTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No meeting types configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      meetingTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: type.color || "#6366f1" }}
                              />
                              <span className="font-medium">{type.name}</span>
                            </div>
                            {type.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {type.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{type.duration} min</TableCell>
                          <TableCell>{type._count.bookings}</TableCell>
                          <TableCell>
                            <Badge variant={type.isActive ? "default" : "secondary"}>
                              {type.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openTypeDialog(type)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteType(type.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outcomes Tab */}
          <TabsContent value="outcomes" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Meeting Outcomes</CardTitle>
                  <CardDescription>
                    Track meeting results with positive/negative outcomes
                  </CardDescription>
                </div>
                <Button onClick={() => openOutcomeDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Outcome
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Meetings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outcomes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No outcomes configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      outcomes.map((outcome) => (
                        <TableRow key={outcome.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {outcome.isPositive ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{outcome.name}</span>
                            </div>
                            {outcome.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {outcome.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={outcome.isPositive ? "default" : "destructive"}>
                              {outcome.isPositive ? "Positive" : "Negative"}
                            </Badge>
                          </TableCell>
                          <TableCell>{outcome._count.bookings}</TableCell>
                          <TableCell>
                            <Badge variant={outcome.isActive ? "default" : "secondary"}>
                              {outcome.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openOutcomeDialog(outcome)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteOutcome(outcome.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Reminder Schedule</CardTitle>
                  <CardDescription>
                    Configure when email reminders are sent to prospects
                  </CardDescription>
                </div>
                <Button onClick={() => openReminderDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reminder
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Timing</TableHead>
                      <TableHead>Email Subject</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminderConfigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No reminder configurations. Add one to start sending automated reminders.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reminderConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{config.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatMinutes(config.minutesBefore)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {config.emailSubject}
                          </TableCell>
                          <TableCell>{config._count.reminders}</TableCell>
                          <TableCell>
                            <Badge variant={config.isActive ? "default" : "secondary"}>
                              {config.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openReminderDialog(config)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteReminder(config.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Meeting Type Dialog */}
        <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit Meeting Type" : "Add Meeting Type"}
              </DialogTitle>
              <DialogDescription>
                Configure a meeting type with default duration and color
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Discovery Call"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="Brief description..."
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={typeDuration}
                    onChange={(e) => setTypeDuration(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={typeColor}
                    onChange={(e) => setTypeColor(e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={typeActive} onCheckedChange={setTypeActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveType} disabled={!typeName || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Outcome Dialog */}
        <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOutcome ? "Edit Outcome" : "Add Outcome"}
              </DialogTitle>
              <DialogDescription>
                Define a meeting outcome for tracking results
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., Qualified Lead"
                  value={outcomeName}
                  onChange={(e) => setOutcomeName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="Brief description..."
                  value={outcomeDescription}
                  onChange={(e) => setOutcomeDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Positive Outcome</Label>
                  <p className="text-sm text-muted-foreground">
                    Used for analytics and reporting
                  </p>
                </div>
                <Switch checked={outcomePositive} onCheckedChange={setOutcomePositive} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={outcomeActive} onCheckedChange={setOutcomeActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOutcomeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveOutcome} disabled={!outcomeName || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reminder Dialog */}
        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingReminder ? "Edit Reminder" : "Add Reminder"}
              </DialogTitle>
              <DialogDescription>
                Configure when to send email reminders to prospects
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g., 24 Hour Reminder"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Send reminder before meeting (minutes)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={reminderMinutes === 15 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReminderMinutes(15)}
                  >
                    15 min
                  </Button>
                  <Button
                    type="button"
                    variant={reminderMinutes === 60 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReminderMinutes(60)}
                  >
                    1 hour
                  </Button>
                  <Button
                    type="button"
                    variant={reminderMinutes === 120 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReminderMinutes(120)}
                  >
                    2 hours
                  </Button>
                  <Button
                    type="button"
                    variant={reminderMinutes === 1440 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReminderMinutes(1440)}
                  >
                    24 hours
                  </Button>
                </div>
                <Input
                  type="number"
                  min={5}
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(parseInt(e.target.value) || 60)}
                  className="mt-2"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input
                  placeholder="Reminder: Your upcoming meeting"
                  value={reminderSubject}
                  onChange={(e) => setReminderSubject(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={reminderActive} onCheckedChange={setReminderActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveReminder} disabled={!reminderName || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
