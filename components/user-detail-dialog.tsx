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
import { Mail, User as UserIcon, TrendingUp, Users } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  status: string;
  capacity: number | null;
  _count: {
    groupMemberships: number;
    assignments: number;
  };
};

interface UserDetailDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({ userId, open, onOpenChange }: UserDetailDialogProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId && open) {
      fetchUser();
    }
  }, [userId, open]);

  const fetchUser = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error("Failed to fetch user", error);
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
      <DialogContent className="max-w-lg border-2 border-primary/30 bg-gradient-to-br from-card to-muted/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">User Details</DialogTitle>
          <DialogDescription>View user information and activity</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={user.status === "active" ? "default" : "secondary"}>
                    {user.status}
                  </Badge>
                  {user.capacity && (
                    <Badge variant="outline">{user.capacity} leads/day</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">Email</div>
                  <div className="text-sm font-medium text-foreground">{user.email}</div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{user._count.groupMemberships}</div>
                    <div className="text-xs font-medium text-muted-foreground">Groups</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{user._count.assignments}</div>
                    <div className="text-xs font-medium text-muted-foreground">Assignments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            User not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
