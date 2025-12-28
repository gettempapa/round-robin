"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Users as UsersIcon,
  Pencil,
  Trash2,
  UserPlus,
  X,
  Zap,
  ArrowRight,
  Workflow
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
};

type GroupMember = {
  id: string;
  userId: string;
  weight: number;
  user: User;
};

type Rule = {
  id: string;
  name: string;
  isActive: boolean;
  ruleset: {
    id: string;
    name: string;
  };
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  distributionMode: string;
  isActive: boolean;
  members: GroupMember[];
  rules: Rule[];
  _count: {
    rules: number;
    assignments: number;
  };
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    distributionMode: "equal",
    isActive: true,
  });

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      toast.error("Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.filter((u: User) => u.status === "active"));
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : "/api/groups";
      const method = editingGroup ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingGroup ? "Group updated" : "Group created");
        setOpen(false);
        resetForm();
        fetchGroups();
      }
    } catch (error) {
      toast.error("Failed to save group");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const response = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Group deleted");
        fetchGroups();
      }
    } catch (error) {
      toast.error("Failed to delete group");
    }
  };

  const addMember = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success("Member added");
        fetchGroups();
      }
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  const removeMember = async (groupId: string, userId: string) => {
    try {
      const response = await fetch(
        `/api/groups/${groupId}/members?userId=${userId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Member removed");
        fetchGroups();
      }
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const openEditDialog = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      distributionMode: group.distributionMode,
      isActive: group.isActive,
    });
    setOpen(true);
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: "",
      description: "",
      distributionMode: "equal",
      isActive: true,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const availableUsers = (group: Group) => {
    const memberIds = group.members.map((m) => m.userId);
    return users.filter((u) => !memberIds.includes(u.id));
  };

  const getUtilization = (group: Group) => {
    if (group.members.length === 0) return 0;
    const assignmentsPerMember = group._count.assignments / group.members.length;
    return Math.min((assignmentsPerMember / 10) * 100, 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage routing teams and prospect distribution
            </p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-3.5 w-3.5" />
                New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGroup ? "Edit Team" : "Create New Team"}
                </DialogTitle>
                <DialogDescription>
                  {editingGroup
                    ? "Update team settings"
                    : "Create a new routing team for prospect distribution"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="e.g., Enterprise USA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="distributionMode">Distribution Mode</Label>
                    <Select
                      value={formData.distributionMode}
                      onValueChange={(value) =>
                        setFormData({ ...formData, distributionMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">Equal Rotation</SelectItem>
                        <SelectItem value="weighted">Weighted Distribution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit">
                    {editingGroup ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-3 text-xs text-muted-foreground">Loading teams...</p>
          </div>
        ) : groups.length === 0 ? (
          <Card className="border border-primary/20">
            <CardContent className="text-center py-12">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-primary/20 text-primary mb-2 border border-primary/30">
                <UsersIcon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold">No teams yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first routing team to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const utilization = getUtilization(group);

              return (
                <Card
                  key={group.id}
                  className="group relative overflow-hidden border bg-gradient-to-br from-card via-card to-muted/10 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    group.isActive
                      ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500'
                      : 'bg-gradient-to-r from-muted via-muted-foreground to-muted'
                  }`} />

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">{group.name}</CardTitle>
                          <Badge
                            variant={group.isActive ? "default" : "secondary"}
                            className={`text-[10px] px-1.5 py-0 ${
                              group.isActive
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : ''
                            }`}
                          >
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {group.description || "No description"}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openEditDialog(group)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(group.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-blue-500/10 to-background p-3">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl -translate-y-8 translate-x-8" />
                        <div className="relative">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Zap className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Capacity</span>
                          </div>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {Math.round(utilization)}%
                          </div>
                          <Progress value={utilization} className="h-1 mt-2" />
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-500/10 to-background p-3">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl -translate-y-8 translate-x-8" />
                        <div className="relative">
                          <div className="flex items-center gap-1.5 mb-1">
                            <ArrowRight className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Routed</span>
                          </div>
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {group._count.assignments}
                          </div>
                          <div className="text-[9px] text-muted-foreground mt-1">
                            total assignments
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Workflow className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Routing Rules</span>
                        </div>
                      </div>
                      {group.rules.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                          No rules assigned
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {group.rules.slice(0, 2).map((rule) => (
                            <div
                              key={rule.id}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-gradient-to-br from-primary/5 to-background text-xs"
                            >
                              <div className={`h-1.5 w-1.5 rounded-full ${
                                rule.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'
                              }`} />
                              <span className="flex-1 font-medium truncate">{rule.name}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            </div>
                          ))}
                          {group.rules.length > 2 && (
                            <div className="text-[10px] text-muted-foreground text-center pt-1">
                              +{group.rules.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            Team ({group.members.length})
                          </span>
                        </div>
                        <Dialog
                          open={managingGroupId === group.id}
                          onOpenChange={(o) => setManagingGroupId(o ? group.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Member to {group.name}</DialogTitle>
                              <DialogDescription>
                                Select users to add to this team
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                              {availableUsers(group).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  All active users are already in this team
                                </p>
                              ) : (
                                availableUsers(group).map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                          {getInitials(user.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="text-sm font-medium">{user.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {user.email}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        addMember(group.id, user.id);
                                        setManagingGroupId(null);
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {group.members.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                          No members yet
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {group.members.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(member.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {member.user.name}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeMember(group.id, member.userId)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {group.members.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center pt-1">
                              +{group.members.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
