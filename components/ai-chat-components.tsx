"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Users,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Workflow,
  Clock,
  AlertCircle,
  Plus,
  UserPlus,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Types for the UI components
type ContactData = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  leadSource?: string | null;
  industry?: string | null;
  companySize?: string | null;
  country?: string | null;
  state?: string | null;
  createdAt?: string;
  assignments?: Array<{
    user?: { id: string; name: string; email: string };
    group?: { id: string; name: string };
    status?: string;
  }>;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  dailyCapacity?: number | null;
  weeklyCapacity?: number | null;
  totalAssignments?: number;
  weeklyAssignments?: number;
  memberships?: Array<{ group: { id: string; name: string } }>;
};

type GroupData = {
  id: string;
  name: string;
  description?: string | null;
  distributionMode?: string;
  isActive?: boolean;
  members?: Array<{ user: { id: string; name: string; email: string } }>;
  _count?: { assignments: number; rules: number };
};

type RuleData = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  conditions: string;
  group?: { id: string; name: string };
  priority?: number;
  matchCount?: number;
};

// ============ CONTACT COMPONENTS ============

export function ContactCard({
  contact,
  isNew,
  expanded,
  showAssignments,
  actions,
  onAction,
  onClose,
}: {
  contact: ContactData;
  isNew?: boolean;
  expanded?: boolean;
  showAssignments?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
  onClose?: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/contacts/${contact.id}`);
    onClose?.();
  };

  return (
    <Card
      className={`${isNew ? "border-green-500 bg-green-500/5" : ""} cursor-pointer hover:bg-muted/50 transition-colors`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border shrink-0">
            <AvatarFallback className="text-xs bg-muted">
              {contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium truncate">{contact.name}</h4>
              {isNew && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] px-1">
                  New
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
          </div>

          {contact.company && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px] hidden sm:block">
              {contact.company}
            </span>
          )}

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ContactList({
  contacts,
  total,
  filter,
  actions,
  onAction,
  onClose,
}: {
  contacts: ContactData[];
  total: number;
  filter?: string;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
  onClose?: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{contacts.length} of {total} contacts</span>
        {filter && filter !== "all" && (
          <Badge variant="secondary" className="text-[10px]">
            {filter}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            actions={actions}
            onAction={onAction}
            onClose={onClose}
          />
        ))}
      </div>

      {total > contacts.length && (
        <button
          onClick={() => {
            router.push("/contacts");
            onClose?.();
          }}
          className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2 transition-colors"
        >
          +{total - contacts.length} more contacts
        </button>
      )}
    </div>
  );
}

// ============ USER COMPONENTS ============

export function UserCard({
  user,
  isNew,
  showStats,
  actions,
  onAction,
  onClose,
}: {
  user: UserData;
  isNew?: boolean;
  showStats?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
  onClose?: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/users`);
    onClose?.();
  };

  return (
    <Card
      className={`${isNew ? "border-green-500 bg-green-500/5" : ""} cursor-pointer hover:bg-muted/50 transition-colors`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border shrink-0">
            <AvatarFallback className="text-xs bg-muted">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium truncate">{user.name}</h4>
              {!user.isActive && (
                <Badge variant="secondary" className="text-[10px] px-1">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          {showStats && (
            <div className="text-right text-xs text-muted-foreground shrink-0">
              <div>{user.totalAssignments || 0} total</div>
              <div>{user.weeklyAssignments || 0} this week</div>
            </div>
          )}

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export function UserList({
  users,
  showStats,
  actions,
  onAction,
  onClose,
}: {
  users: UserData[];
  showStats?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        {users.length} team members
      </div>

      <div className="space-y-1.5">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            showStats={showStats}
            actions={actions}
            onAction={onAction}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

// ============ GROUP COMPONENTS ============

export function GroupCard({
  group,
  isNew,
  actions,
  onAction,
}: {
  group: GroupData;
  isNew?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <Card className={`${isNew ? "border-green-500 bg-green-500/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{group.name}</h4>
              {isNew && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  New
                </Badge>
              )}
            </div>

            {group.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {group.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{group.members?.length || 0} members</span>
              <span>{group._count?.assignments || 0} assignments</span>
              <Badge variant="outline" className="text-xs">
                {group.distributionMode || "equal"}
              </Badge>
            </div>

            {group.members && group.members.length > 0 && (
              <div className="flex -space-x-2 mt-2">
                {group.members.slice(0, 5).map((m, i) => (
                  <Avatar key={i} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {m.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {group.members.length > 5 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                    +{group.members.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>

          {actions && actions.includes("view") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/groups?id=${group.id}`)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function GroupList({
  groups,
  actions,
  onAction,
}: {
  groups: GroupData[];
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{groups.length} groups</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/groups")}>
          View all
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            actions={actions}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ============ RULE COMPONENTS ============

export function RuleCard({
  rule,
  isNew,
  actions,
  onAction,
}: {
  rule: RuleData;
  isNew?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  let conditions: any[] = [];
  try {
    conditions = JSON.parse(rule.conditions);
  } catch {
    conditions = [];
  }

  return (
    <Card className={`${isNew ? "border-green-500 bg-green-500/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-md flex items-center justify-center ${
              rule.isActive ? "bg-green-500/10" : "bg-muted"
            }`}
          >
            <Workflow
              className={`h-5 w-5 ${
                rule.isActive ? "text-green-600" : "text-muted-foreground"
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{rule.name}</h4>
              {isNew && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  New
                </Badge>
              )}
              <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                {rule.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {rule.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {rule.description}
              </p>
            )}

            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Routes to: </span>
              <Badge variant="outline">{rule.group?.name || "Unknown"}</Badge>
            </div>

            {conditions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {conditions.slice(0, 3).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {c.field} {c.operator} {c.value}
                  </Badge>
                ))}
                {conditions.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{conditions.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {rule.matchCount !== undefined && (
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>{rule.matchCount} matches</span>
              </div>
            )}
          </div>

          {actions && actions.includes("view") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/rules?id=${rule.id}`)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RuleList({
  rules,
  actions,
  onAction,
}: {
  rules: RuleData[];
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{rules.length} rules</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/rules")}>
          View all
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            actions={actions}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ============ ASSIGNMENT COMPONENTS ============

export function AssignmentCard({
  assignment,
  isNew,
  method,
}: {
  assignment: any;
  isNew?: boolean;
  method?: string;
}) {
  return (
    <Card className={`${isNew ? "border-green-500 bg-green-500/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm mb-3">
          {isNew && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          <span className="font-medium">Assignment {isNew ? "Created" : ""}</span>
          {method && (
            <Badge variant="outline" className="text-xs">
              {method}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="text-xs">
                {assignment.contact?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{assignment.contact?.name}</p>
              <p className="text-xs text-muted-foreground">
                {assignment.contact?.email}
              </p>
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground" />

          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="text-xs">
                {assignment.user?.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{assignment.user?.name}</p>
              {assignment.group && (
                <Badge variant="outline" className="text-xs mt-0.5">
                  {assignment.group.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReassignmentCard({
  assignment,
  fromUser,
  toUser,
  reason,
}: {
  assignment: any;
  fromUser: any;
  toUser: any;
  reason?: string;
}) {
  return (
    <Card className="border-blue-500 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm mb-3">
          <ArrowRight className="h-4 w-4 text-blue-600" />
          <span className="font-medium">Contact Reassigned</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border opacity-50">
              <AvatarFallback className="text-xs">{fromUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground line-through">
              {fromUser?.name}
            </span>
          </div>

          <ArrowRight className="h-4 w-4 text-blue-600" />

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="text-xs">{toUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{toUser?.name}</span>
          </div>
        </div>

        {reason && (
          <p className="text-xs text-muted-foreground mt-2">Reason: {reason}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============ STATS COMPONENTS ============

export function StatsChart({
  stats,
  chartType,
}: {
  stats: any;
  chartType?: "bar" | "pie";
}) {
  const router = useRouter();
  const data = stats.data || [];
  const maxCount = Math.max(...data.map((d: any) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Assignments by {stats.type?.replace("by", "") || "Category"}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {stats.timeframe}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 5).map((item: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">{item.count}</span>
            </div>
            <Progress value={(item.count / maxCount) * 100} className="h-2" />
          </div>
        ))}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total assignments</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => router.push("/activity")}
        >
          View full activity
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ============ NOTIFICATION COMPONENT ============

export function Notification({
  type,
  message,
}: {
  type: "success" | "error" | "info";
  message: string;
}) {
  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    error: <XCircle className="h-4 w-4 text-red-600" />,
    info: <AlertCircle className="h-4 w-4 text-blue-600" />,
  };

  const styles = {
    success: "border-green-500 bg-green-500/5",
    error: "border-red-500 bg-red-500/5",
    info: "border-blue-500 bg-blue-500/5",
  };

  return (
    <Card className={styles[type]}>
      <CardContent className="p-3 flex items-center gap-2">
        {icons[type]}
        <span className="text-sm">{message}</span>
      </CardContent>
    </Card>
  );
}

// ============ NAVIGATION COMPONENT ============

export function NavigationButton({
  path,
  label,
  onNavigate,
}: {
  path: string;
  label: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="w-full justify-between"
      onClick={() => {
        router.push(path);
        onNavigate?.();
      }}
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4" />
    </Button>
  );
}

// ============ CONFIRMATION COMPONENT ============

export function ConfirmationPrompt({
  action,
  details,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  action: string;
  details?: any;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  return (
    <Card className="border-amber-500 bg-amber-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium">Confirm Action</p>
            <p className="text-sm text-muted-foreground mt-1">{action}</p>
          </div>
        </div>

        {details && (
          <div className="bg-muted/50 rounded-md p-2 text-sm">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
            {cancelText || "Cancel"}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            {confirmText || "Confirm"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ RULE CONFIRMATION ============

export function RuleConfirmation({
  name,
  description,
  groupName,
  groupId,
  conditions,
  conditionLogic,
  onAction,
  onClose,
}: {
  name: string;
  description: string;
  groupName: string;
  groupId: string;
  conditions: Array<{ field: string; operator: string; value: string }>;
  conditionLogic: string;
  onAction?: (action: string, data: any) => void;
  onClose?: () => void;
}) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [created, setCreated] = React.useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      // Call the API to create the rule with confirmed: true
      const response = await fetch("/api/ai/confirm-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          groupId,
          conditions,
          conditionLogic,
        }),
      });

      if (response.ok) {
        setCreated(true);
        // Optionally refresh or navigate
        setTimeout(() => {
          if (onClose) onClose();
          router.push("/rules");
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to create rule:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (created) {
    return (
      <Card className="border-green-500 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-700">Rule Created!</h4>
              <p className="text-sm text-muted-foreground">
                {name} is now active and routing to {groupName}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500/50 bg-blue-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base">Confirm New Rule</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{name}</span>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Preview
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="text-xs text-muted-foreground uppercase font-medium">
            Conditions ({conditionLogic})
          </div>
          <div className="flex flex-wrap gap-1">
            {conditions.map((c, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-mono">
                {c.field} {c.operator} &quot;{c.value}&quot;
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Routes to:</span>
          <Badge>{groupName}</Badge>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onClose?.()}
            className="flex-1"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Create Rule
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ COMPONENT RENDERER ============

export function renderToolComponent(
  component: { type: string; props: any },
  onAction?: (action: string, data: any) => void,
  onClose?: () => void
) {
  const { type, props } = component;

  switch (type) {
    case "contactCard":
      return <ContactCard {...props} onAction={onAction} onClose={onClose} />;
    case "contactList":
      return <ContactList {...props} onAction={onAction} onClose={onClose} />;
    case "userCard":
      return <UserCard {...props} onAction={onAction} onClose={onClose} />;
    case "userList":
      return <UserList {...props} onAction={onAction} onClose={onClose} />;
    case "groupCard":
      return <GroupCard {...props} onAction={onAction} />;
    case "groupList":
      return <GroupList {...props} onAction={onAction} />;
    case "ruleCard":
      return <RuleCard {...props} onAction={onAction} />;
    case "ruleList":
      return <RuleList {...props} onAction={onAction} />;
    case "assignmentCard":
      return <AssignmentCard {...props} />;
    case "reassignmentCard":
      return <ReassignmentCard {...props} />;
    case "statsChart":
      return <StatsChart {...props} />;
    case "notification":
      return <Notification {...props} />;
    case "navigation":
      return <NavigationButton {...props} onNavigate={onClose} />;
    case "confirmation":
      return <ConfirmationPrompt {...props} onAction={onAction} />;
    case "ruleConfirmation":
      return <RuleConfirmation {...props} onAction={onAction} onClose={onClose} />;
    default:
      return (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground">
              Unknown component: {type}
            </p>
          </CardContent>
        </Card>
      );
  }
}
