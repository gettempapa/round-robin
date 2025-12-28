"use client";

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
}: {
  contact: ContactData;
  isNew?: boolean;
  expanded?: boolean;
  showAssignments?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <Card className={`${isNew ? "border-green-500 bg-green-500/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback className="text-sm bg-muted">
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
              <h4 className="font-semibold truncate">{contact.name}</h4>
              {isNew && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  New
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Mail className="h-3 w-3" />
              <span className="truncate">{contact.email}</span>
            </div>

            {contact.company && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Building2 className="h-3 w-3" />
                <span>{contact.company}</span>
              </div>
            )}

            {expanded && (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {contact.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.leadSource && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    <span>Source: {contact.leadSource}</span>
                  </div>
                )}
                {(contact.country || contact.state) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {[contact.state, contact.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {showAssignments && contact.assignments && contact.assignments.length > 0 && (
              <div className="mt-3 p-2 bg-muted/50 rounded-md">
                <p className="text-xs font-medium mb-1">Assigned to:</p>
                {contact.assignments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    <span>{a.user?.name}</span>
                    {a.group && (
                      <>
                        <span className="text-muted-foreground">via</span>
                        <Badge variant="outline" className="text-xs">
                          {a.group.name}
                        </Badge>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {actions && actions.length > 0 && (
            <div className="flex gap-1">
              {actions.includes("view") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/contacts?id=${contact.id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
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
}: {
  contacts: ContactData[];
  total: number;
  filter?: string;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {contacts.length} of {total} contacts
          </span>
          {filter && filter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {filter}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contacts")}
        >
          View all
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            showAssignments
            actions={actions}
            onAction={onAction}
          />
        ))}
      </div>

      {total > contacts.length && (
        <p className="text-xs text-muted-foreground text-center">
          +{total - contacts.length} more contacts
        </p>
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
}: {
  user: UserData;
  isNew?: boolean;
  showStats?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <Card className={`${isNew ? "border-green-500 bg-green-500/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback className="text-sm bg-muted">
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
              <h4 className="font-semibold truncate">{user.name}</h4>
              {isNew && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  New
                </Badge>
              )}
              {!user.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </div>

            {showStats && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  <span>{user.totalAssignments || 0} total</span>
                </div>
                {user.weeklyAssignments !== undefined && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{user.weeklyAssignments} this week</span>
                  </div>
                )}
              </div>
            )}

            {user.memberships && user.memberships.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {user.memberships.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {m.group.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {actions && actions.includes("view") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/users?id=${user.id}`)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
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
}: {
  users: UserData[];
  showStats?: boolean;
  actions?: string[];
  onAction?: (action: string, data: any) => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{users.length} team members</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/users")}>
          View all
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            showStats={showStats}
            actions={actions}
            onAction={onAction}
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

// ============ COMPONENT RENDERER ============

export function renderToolComponent(
  component: { type: string; props: any },
  onAction?: (action: string, data: any) => void,
  onNavigate?: () => void
) {
  const { type, props } = component;

  switch (type) {
    case "contactCard":
      return <ContactCard {...props} onAction={onAction} />;
    case "contactList":
      return <ContactList {...props} onAction={onAction} />;
    case "userCard":
      return <UserCard {...props} onAction={onAction} />;
    case "userList":
      return <UserList {...props} onAction={onAction} />;
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
      return <NavigationButton {...props} onNavigate={onNavigate} />;
    case "confirmation":
      return <ConfirmationPrompt {...props} onAction={onAction} />;
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
