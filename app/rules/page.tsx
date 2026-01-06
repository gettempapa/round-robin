"use client";

import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Sparkles,
  UserPlus,
  RefreshCw,
  FileText,
  Webhook,
  Hand,
  Layers,
  Zap,
  Target,
  ArrowRight,
  Users as UsersIcon,
  Settings,
  X
} from "lucide-react";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AIRuleWizard } from "@/components/ai-rule-wizard";
import { GroupDetailDialog } from "@/components/group-detail-dialog";
import { useAI } from "@/components/ai-context";
import { ROUTING_FIELDS } from "@/lib/routing-context";

type Condition = {
  field: string;
  operator: string;
  value: string;
};

type Rule = {
  id: string;
  name: string;
  description: string | null;
  rulesetId: string;
  groupId: string;
  group: {
    id: string;
    name: string;
    members?: { user: { name: string } }[];
    _count?: { assignments: number };
  };
  priority: number;
  isActive: boolean;
  conditions: string;
};

type RulesetTrigger = {
  id: string;
  triggerType: string;
};

type Ruleset = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  rules: Rule[];
  triggers: RulesetTrigger[];
};

type Group = {
  id: string;
  name: string;
  members?: { user: { name: string } }[];
  rules?: Rule[];
  _count?: { assignments: number };
};

const TRIGGER_TYPES = [
  { value: "contact_created", label: "Record Created", icon: UserPlus, color: "emerald", description: "Triggers when a new lead, contact, or account is created" },
  { value: "contact_updated", label: "Record Updated", icon: RefreshCw, color: "blue", description: "Triggers when routing context changes" },
  { value: "form_submitted", label: "Form Submission", icon: FileText, color: "blue", description: "Triggers on inbound form submissions" },
  { value: "api_webhook", label: "API / Webhook", icon: Webhook, color: "orange", description: "Triggers from external API calls" },
  { value: "manual", label: "Manual Routing", icon: Hand, color: "amber", description: "Triggers on manual routing requests" },
];

const OPERATORS = [
  { value: "equals", label: "Equals", needsValue: true },
  { value: "notEquals", label: "Not Equals", needsValue: true },
  { value: "contains", label: "Contains", needsValue: true },
  { value: "startsWith", label: "Starts With", needsValue: true },
  { value: "greaterThan", label: "Greater Than", needsValue: true },
  { value: "lessThan", label: "Less Than", needsValue: true },
  { value: "isBlank", label: "Is Blank", needsValue: false },
  { value: "isPresent", label: "Is Present", needsValue: false },
];

function RulesPageContent() {
  const searchParams = useSearchParams();
  const { highlightElement } = useAI();
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [selectedRulesetId, setSelectedRulesetId] = useState<string | null>(null);
  const [rulesetDialogOpen, setRulesetDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [managingTriggersRulesetId, setManagingTriggersRulesetId] = useState<string | null>(null);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "leadSource", operator: "equals", value: "" },
  ]);
  const [ruleFormData, setRuleFormData] = useState({
    name: "",
    description: "",
    groupId: "",
  });
  const [rulesetFormData, setRulesetFormData] = useState({
    name: "",
    description: "",
  });
  const [connections, setConnections] = useState<Array<{ruleId: string, groupId: string, from: {x: number, y: number}, to: {x: number, y: number}}>>([]);
  const ruleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  // TODO: Add real-time flow visualization - when a contact is routed, light up the specific trigger → rule → group path

  const unknownFields = Array.from(
    new Set(
      conditions
        .map((condition) => condition.field)
        .filter((field) => !ROUTING_FIELDS.some((routingField) => routingField.value === field))
    )
  );

  const fieldOptions = [
    ...ROUTING_FIELDS,
    ...unknownFields.map((field) => ({
      value: field,
      label: `${field} (legacy)`,
      description: "Legacy field",
    })),
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Check for URL parameters to auto-open AI wizard
  useEffect(() => {
    const shouldOpenWizard = searchParams.get("aiWizard") === "true";
    const prompt = searchParams.get("prompt");

    if (shouldOpenWizard && prompt && !loading) {
      setInitialPrompt(prompt);
      setAiWizardOpen(true);

      // Clear URL parameters after opening
      window.history.replaceState({}, "", "/rules");
    }
  }, [searchParams, loading]);

  // Scroll highlighted rule into view
  useEffect(() => {
    if (highlightElement?.type === 'rule' && highlightElement?.id) {
      const ruleEl = ruleRefs.current.get(highlightElement.id);
      if (ruleEl) {
        setTimeout(() => {
          ruleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [highlightElement]);

  useLayoutEffect(() => {
    if (!containerRef.current || loading) return;

    const calculateConnections = () => {
      const newConnections: Array<{ruleId: string, groupId: string, from: {x: number, y: number}, to: {x: number, y: number}}> = [];
      const containerRect = containerRef.current!.getBoundingClientRect();

      ruleRefs.current.forEach((ruleEl, ruleId) => {
        const rule = rulesets.flatMap(rs => rs.rules).find(r => r.id === ruleId);
        if (!rule) return;

        const groupEl = groupRefs.current.get(rule.groupId);
        if (!groupEl) return;

        const ruleRect = ruleEl.getBoundingClientRect();
        const groupRect = groupEl.getBoundingClientRect();

        newConnections.push({
          ruleId,
          groupId: rule.groupId,
          from: {
            x: ruleRect.right - containerRect.left + 4,
            y: ruleRect.top + ruleRect.height / 2 - containerRect.top
          },
          to: {
            x: groupRect.left - containerRect.left - 4,
            y: groupRect.top + groupRect.height / 2 - containerRect.top
          }
        });
      });

      setConnections(newConnections);
    };

    calculateConnections();
    window.addEventListener('resize', calculateConnections);
    return () => window.removeEventListener('resize', calculateConnections);
  }, [rulesets, groups, loading]);

  const fetchData = async () => {
    try {
      const [rulesetsRes, groupsRes] = await Promise.all([
        fetch("/api/rulesets"),
        fetch("/api/groups"),
      ]);
      const rulesetsData = await rulesetsRes.json();
      const groupsData = await groupsRes.json();
      setRulesets(rulesetsData);
      setGroups(groupsData);
      if (rulesetsData.length > 0 && !selectedRulesetId) {
        setSelectedRulesetId(rulesetsData[0].id);
      }
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validConditions = conditions.filter(
      (c) => c.value.trim() !== "" || c.operator === "isBlank" || c.operator === "isPresent"
    );
    if (validConditions.length === 0) {
      toast.error("Please add at least one condition");
      return;
    }

    try {
      const url = editingRule ? `/api/rules/${editingRule.id}` : "/api/rules";
      const method = editingRule ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ruleFormData,
          rulesetId: selectedRulesetId,
          conditions: validConditions,
        }),
      });

      if (response.ok) {
        toast.success(editingRule ? "Rule updated" : "Rule created");
        setRuleDialogOpen(false);
        resetRuleForm();
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to save rule");
    }
  };

  const handleRulesetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/rulesets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rulesetFormData),
      });

      if (response.ok) {
        const newRuleset = await response.json();
        toast.success("Ruleset created");
        setRulesetDialogOpen(false);
        resetRulesetForm();
        fetchData();
        setSelectedRulesetId(newRuleset.id);
      }
    } catch (error) {
      toast.error("Failed to create ruleset");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const response = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Rule deleted");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  const toggleRuleStatus = async (rule: Rule) => {
    try {
      const response = await fetch(`/api/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, isActive: !rule.isActive }),
      });

      if (response.ok) {
        toast.success(rule.isActive ? "Rule disabled" : "Rule enabled");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to update rule");
    }
  };

  const openEditRuleDialog = (rule: Rule) => {
    setEditingRule(rule);
    setRuleFormData({
      name: rule.name,
      description: rule.description || "",
      groupId: rule.groupId,
    });
    try {
      const parsedConditions = JSON.parse(rule.conditions);
      if (Array.isArray(parsedConditions) && parsedConditions.length > 0) {
        setConditions(parsedConditions);
      } else {
        setConditions([{ field: "leadSource", operator: "equals", value: "" }]);
      }
    } catch {
      setConditions([{ field: "leadSource", operator: "equals", value: "" }]);
    }
    setRuleDialogOpen(true);
  };

  const resetRuleForm = () => {
    setEditingRule(null);
    setRuleFormData({ name: "", description: "", groupId: "" });
    setConditions([{ field: "leadSource", operator: "equals", value: "" }]);
  };

  const resetRulesetForm = () => {
    setRulesetFormData({ name: "", description: "" });
  };

  const addCondition = () => {
    setConditions([...conditions, { field: "leadSource", operator: "equals", value: "" }]);
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    if (field === "operator" && (value === "isBlank" || value === "isPresent")) {
      newConditions[index].value = "";
    }
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const toggleTrigger = async (rulesetId: string, triggerType: string, isConnected: boolean) => {
    try {
      if (isConnected) {
        const response = await fetch(`/api/rulesets/${rulesetId}/triggers/${triggerType}`, {
          method: "DELETE",
        });
        if (response.ok) {
          toast.success("Trigger disconnected");
          fetchData();
        }
      } else {
        const response = await fetch(`/api/rulesets/${rulesetId}/triggers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggerType }),
        });
        if (response.ok) {
          toast.success("Trigger connected");
          fetchData();
        }
      }
    } catch (error) {
      toast.error("Failed to update trigger");
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getUtilization = (group: Group) => {
    if (!group.members || group.members.length === 0) return 0;
    const assignments = group._count?.assignments || 0;
    const assignmentsPerMember = assignments / group.members.length;
    return Math.min((assignmentsPerMember / 10) * 100, 100);
  };

  const activeTriggers = Array.from(
    new Set(rulesets.flatMap(rs => rs.triggers.map(t => t.triggerType)))
  );

  const managingTriggersRuleset = rulesets.find(r => r.id === managingTriggersRulesetId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Routing Studio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Object-agnostic rules for leads, contacts, and accounts
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRulesetDialogOpen(true)}
              className="border border-primary/30"
            >
              <Layers className="mr-2 h-3.5 w-3.5" />
              New Ruleset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiWizardOpen(true)}
              className="border border-blue-500/30 hover:border-blue-500/50"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-blue-500" />
              AI Builder
            </Button>
            <Dialog open={ruleDialogOpen} onOpenChange={(o) => { setRuleDialogOpen(o); if (!o) resetRuleForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!selectedRulesetId}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{editingRule ? "Edit Rule" : "Create New Rule"}</DialogTitle>
                  <DialogDescription>
                    {editingRule ? "Update rule settings" : "Create a rule that outputs the right routing group"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRuleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ruleName">Rule Name</Label>
                      <Input
                        id="ruleName"
                        value={ruleFormData.name}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                        required
                        placeholder="e.g., Route Enterprise Records"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ruleDescription">Description</Label>
                      <Input
                        id="ruleDescription"
                        value={ruleFormData.description}
                        onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destinationGroup">Routing Group</Label>
                      <Select
                        value={ruleFormData.groupId}
                        onValueChange={(value) => setRuleFormData({ ...ruleFormData, groupId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Conditions</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Condition
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Fields are normalized across Lead, Contact, and Account. Matching to existing accounts is automatic.
                      </p>
                      <div className="space-y-2">
                        {conditions.map((condition, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs">Field</Label>
                              <Select
                                value={condition.field}
                                onValueChange={(value) => updateCondition(index, "field", value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldOptions.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Operator</Label>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) => updateCondition(index, "operator", value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPERATORS.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {OPERATORS.find(op => op.value === condition.operator)?.needsValue && (
                              <div className="flex-1">
                                <Label className="text-xs">Value</Label>
                                <Input
                                  className="h-9"
                                  value={condition.value}
                                  onChange={(e) => updateCondition(index, "value", e.target.value)}
                                  placeholder="Enter value"
                                />
                              </div>
                            )}
                            {conditions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => removeCondition(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit">{editingRule ? "Update" : "Create"} Rule</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border border-primary/20 bg-gradient-to-r from-background via-muted/20 to-background">
          <CardContent className="pt-5 pb-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Routing Context</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    One ruleset for Lead, Contact, and Account records with normalized fields.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Match Intelligence</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-match to existing accounts so RevOps never worries about duplicates.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Target className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Output = Group</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rules return the recommended routing group. Ownership is handled elsewhere.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-3 text-xs text-muted-foreground">Loading flow...</p>
          </div>
        ) : (
          <div ref={containerRef} className="relative rounded-md border bg-grid-fine p-4 overflow-hidden">
            {/* SVG Overlay for connections */}
            <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{zIndex: 10}}>
              <defs>
                {/* Gradient for flow lines - sophisticated indigo */}
                <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="flow-gradient-selected" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                </linearGradient>
                {/* Glow filter */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {connections.map((conn, idx) => {
                const isSelected = selectedGroup?.id === conn.groupId;
                const dx = conn.to.x - conn.from.x;
                const dy = conn.to.y - conn.from.y;
                const controlPointOffset = Math.abs(dx) * 0.5;

                // Smooth Bezier curve with elegant flow
                const path = `M ${conn.from.x} ${conn.from.y} C ${conn.from.x + controlPointOffset} ${conn.from.y}, ${conn.to.x - controlPointOffset} ${conn.to.y}, ${conn.to.x} ${conn.to.y}`;

                return (
                  <g key={`${conn.ruleId}-${conn.groupId}-${idx}`}>
                    {/* Main gradient line */}
                    <path
                      d={path}
                      stroke={isSelected ? "url(#flow-gradient-selected)" : "url(#flow-gradient)"}
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      fill="none"
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                      style={{
                        filter: isSelected ? 'url(#glow)' : 'none'
                      }}
                    />
                    {/* Animated flow particles */}
                    <circle
                      r={isSelected ? "3" : "2"}
                      fill="hsl(var(--primary))"
                      className="transition-all duration-300"
                      style={{
                        filter: isSelected ? 'drop-shadow(0 0 3px hsl(var(--primary) / 0.5))' : 'none'
                      }}
                    >
                      <animateMotion
                        dur={isSelected ? "2s" : "3s"}
                        repeatCount="indefinite"
                        path={path}
                      />
                      <animate
                        attributeName="opacity"
                        values={isSelected ? "0.6;0.8;0.6" : "0.3;0.5;0.3"}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Second trailing particle for extra effect */}
                    <circle
                      r={isSelected ? "2" : "1.5"}
                      fill="hsl(var(--primary))"
                      className="transition-all duration-300"
                      style={{
                        opacity: isSelected ? 0.4 : 0.2,
                        filter: isSelected ? 'drop-shadow(0 0 2px hsl(var(--primary) / 0.3))' : 'none'
                      }}
                    >
                      <animateMotion
                        dur={isSelected ? "2s" : "3s"}
                        repeatCount="indefinite"
                        path={path}
                        begin="0.5s"
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>
            {/* Flow Canvas */}
            <div className="grid grid-cols-[minmax(180px,auto)_1fr_minmax(240px,auto)] gap-20 items-start relative" style={{zIndex: 2}}>
              {/* Column 1: Triggers */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-technical text-muted-foreground">
                    Triggers
                  </h2>
                </div>
                {activeTriggers.map((triggerType) => {
                  const config = TRIGGER_TYPES.find(t => t.value === triggerType);
                  if (!config) return null;
                  const Icon = config.icon;
                  const connectedRulesets = rulesets.filter(rs =>
                    rs.triggers.some(t => t.triggerType === triggerType)
                  );

                  return (
                    <div key={triggerType} className="group relative">
                      <div className="relative rounded border bg-card p-3 transition-all duration-200 hover:border-foreground/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted border">
                            <Icon className="h-5 w-5 text-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">{config.label}</div>
                            <div className="text-xs text-muted-foreground">
                              → {connectedRulesets.length} ruleset{connectedRulesets.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Column 2: Rulesets → Rules Flow */}
              <div className="space-y-6 min-h-[400px]">
                {rulesets.map((ruleset, rulesetIndex) => (
                  <div key={ruleset.id} className="relative">
                    <div className="relative rounded border bg-card p-4">

                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 border-2 border-primary/40">
                              <Layers className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-base font-bold">{ruleset.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {ruleset.rules.length} rule{ruleset.rules.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setManagingTriggersRulesetId(ruleset.id);
                                setTriggerDialogOpen(true);
                              }}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Triggers
                            </Button>
                            <Badge
                              variant={ruleset.isActive ? "default" : "secondary"}
                              className={ruleset.isActive ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''}
                            >
                              {ruleset.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {ruleset.rules
                            .sort((a, b) => a.priority - b.priority)
                            .map((rule, ruleIndex) => {
                              const group = groups.find(g => g.id === rule.groupId);
                              if (!group) return null;

                              return (
                                <div key={rule.id} className="relative">
                                  <div
                                    ref={(el) => {
                                      if (el) ruleRefs.current.set(rule.id, el);
                                      else ruleRefs.current.delete(rule.id);
                                    }}
                                    className={`relative flex items-center gap-3 p-3 rounded border transition-all duration-200 hover:shadow-sm cursor-pointer ${
                                      rule.isActive
                                        ? 'bg-card border-border hover:border-foreground/30'
                                        : 'bg-muted/20 border-muted/30 opacity-60'
                                    } ${
                                      highlightElement?.type === 'rule' && highlightElement?.id === rule.id
                                        ? 'ai-highlight'
                                        : ''
                                    }`}
                                    onClick={() => setSelectedGroup(group)}
                                  >
                                    <div className={`flex h-6 w-6 items-center justify-center rounded border text-xs font-bold shrink-0 ${
                                      rule.isActive
                                        ? 'bg-muted border text-foreground'
                                        : 'bg-muted/20 border-muted/30 text-muted-foreground'
                                    }`}>
                                      {rule.priority}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold truncate">{rule.name}</div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleRuleStatus(rule);
                                        }}
                                      >
                                        {rule.isActive ? (
                                          <PowerOff className="h-3 w-3" />
                                        ) : (
                                          <Power className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditRuleDialog(rule);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteRule(rule.id);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                      <div className="ml-2 flex items-center gap-1.5">
                                        <ArrowRight className={`h-3.5 w-3.5 ${rule.isActive ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />
                                        <span className={`text-xs font-mono truncate max-w-[120px] ${
                                          rule.isActive
                                            ? 'text-foreground'
                                            : 'text-muted-foreground'
                                        }`}>
                                          {group.name}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {ruleIndex < ruleset.rules.length - 1 && (
                                    <div className="flex items-center gap-2 py-1 pl-9">
                                      <div className="text-[10px] font-bold text-primary/60">
                                        ↓ No match? Try next
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    {rulesetIndex < rulesets.length - 1 && (
                      <div className="flex justify-center py-3">
                        <div className="h-8 w-0.5 bg-border" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Column 3: Teams */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-technical text-muted-foreground">
                    Teams
                  </h2>
                </div>
                {groups.map((group) => {
                  const utilization = getUtilization(group);
                  const isSelected = selectedGroup?.id === group.id;
                  const rulesPointingToThisGroup = rulesets.flatMap(rs => rs.rules).filter(r => r.groupId === group.id);

                  return (
                    <div
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`group relative cursor-pointer transition-all duration-300 ${
                        isSelected ? 'scale-105' : ''
                      }`}
                    >
                      <div
                        ref={(el) => {
                          if (el) groupRefs.current.set(group.id, el);
                          else groupRefs.current.delete(group.id);
                        }}
                        className={`relative rounded border p-4 bg-card transition-all duration-300 ${
                          isSelected
                            ? 'border-primary shadow-md'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
                          isSelected
                            ? 'bg-primary'
                            : 'bg-border'
                        }`} />

                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{group.name}</div>
                            {rulesPointingToThisGroup.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ← {rulesPointingToThisGroup.length} inbound
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="rounded border bg-muted/30 p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Zap className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[9px] font-semibold text-muted-foreground uppercase">Capacity</span>
                            </div>
                            <div className="text-lg font-bold">
                              {Math.round(utilization)}%
                            </div>
                          </div>

                          <div className="rounded border bg-muted/30 p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[9px] font-semibold text-muted-foreground uppercase">Routed</span>
                            </div>
                            <div className="text-lg font-bold">
                              {group._count?.assignments || 0}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="h-3 w-3 text-muted-foreground" />
                          <div className="flex -space-x-2">
                            {group.members?.slice(0, 4).map((member, i) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-[9px]">
                                  {getInitials(member.user.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {(group.members?.length || 0) > 4 && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold">
                                +{(group.members?.length || 0) - 4}
                              </div>
                            )}
                          </div>
                          {(!group.members || group.members.length === 0) && (
                            <span className="text-xs text-muted-foreground">No members</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dialogs */}
        <Dialog open={rulesetDialogOpen} onOpenChange={(o) => { setRulesetDialogOpen(o); if (!o) resetRulesetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Ruleset</DialogTitle>
              <DialogDescription>Create a collection of rules to organize your routing logic</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRulesetSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rulesetName">Name</Label>
                  <Input
                    id="rulesetName"
                    value={rulesetFormData.name}
                    onChange={(e) => setRulesetFormData({ ...rulesetFormData, name: e.target.value })}
                    required
                    placeholder="e.g., Enterprise Routing"
                  />
                </div>
                <div>
                  <Label htmlFor="rulesetDescription">Description</Label>
                  <Input
                    id="rulesetDescription"
                    value={rulesetFormData.description}
                    onChange={(e) => setRulesetFormData({ ...rulesetFormData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit">Create Ruleset</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Triggers for {managingTriggersRuleset?.name}</DialogTitle>
              <DialogDescription>Connect or disconnect triggers that will fire this ruleset</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {TRIGGER_TYPES.map((trigger) => {
                const Icon = trigger.icon;
                const isConnected = managingTriggersRuleset?.triggers.some(
                  (t) => t.triggerType === trigger.value
                ) || false;

                return (
                  <div
                    key={trigger.value}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                        trigger.color === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' :
                        trigger.color === 'blue' ? 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400' :
                        trigger.color === 'blue' ? 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400' :
                        trigger.color === 'orange' ? 'bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400' :
                        'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{trigger.label}</div>
                        <div className="text-xs text-muted-foreground">{trigger.description}</div>
                      </div>
                    </div>
                    <Button
                      variant={isConnected ? "destructive" : "default"}
                      size="sm"
                      onClick={() =>
                        toggleTrigger(managingTriggersRuleset!.id, trigger.value, isConnected)
                      }
                    >
                      {isConnected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {viewingGroupId && (
          <GroupDetailDialog
            groupId={viewingGroupId}
            open={!!viewingGroupId}
            onOpenChange={(open) => !open && setViewingGroupId(null)}
          />
        )}

        <AIRuleWizard
          open={aiWizardOpen}
          onOpenChange={(open) => {
            setAiWizardOpen(open);
            if (!open) {
              setInitialPrompt(null);
            }
          }}
          groups={groups}
          onRuleCreated={fetchData}
          initialPrompt={initialPrompt}
        />
      </div>
    </DashboardLayout>
  );
}

export default function RulesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-3 text-xs text-muted-foreground">Loading rules...</p>
        </div>
      </DashboardLayout>
    }>
      <RulesPageContent />
    </Suspense>
  );
}
