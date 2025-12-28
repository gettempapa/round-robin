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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, TrendingUp, Workflow } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
};

type GroupMember = {
  id: string;
  userId: string;
  weight: number;
  user: User;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  distributionMode: string;
  isActive: boolean;
  members: GroupMember[];
  _count: {
    rules: number;
    assignments: number;
  };
};

interface GroupDetailDialogProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserClick?: (userId: string) => void;
}

export function GroupDetailDialog({ groupId, open, onOpenChange, onUserClick }: GroupDetailDialogProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (groupId && open) {
      fetchGroup();
    }
  }, [groupId, open]);

  const fetchGroup = async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data);
      }
    } catch (error) {
      console.error("Failed to fetch group", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-2 border-primary/30 bg-gradient-to-br from-card to-muted/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Group Details</DialogTitle>
          <DialogDescription>View round robin group information</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          </div>
        ) : group ? (
          <div className="space-y-6">
            {/* Group Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={group.isActive ? "default" : "secondary"}>
                    {group.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {group.distributionMode} Distribution
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{group._count.rules}</div>
                    <div className="text-xs font-medium text-muted-foreground">Active Rules</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{group._count.assignments}</div>
                    <div className="text-xs font-medium text-muted-foreground">Total Routed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h4 className="text-lg font-bold text-foreground">Members ({group.members.length})</h4>
              </div>

              {group.members.length === 0 ? (
                <div className="text-center py-8 rounded-xl border-2 border-primary/20 bg-muted/20">
                  <p className="text-sm text-muted-foreground">No members in this group</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {group.members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => onUserClick?.(member.userId)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] group"
                    >
                      <Avatar className="h-10 w-10 border-2 border-primary/30 group-hover:border-primary/50 transition-colors">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-bold">
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {member.user.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.user.email}</div>
                      </div>
                      {group.distributionMode === "weighted" && (
                        <Badge variant="outline">Weight: {member.weight}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Group not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
