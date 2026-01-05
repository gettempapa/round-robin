"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Workflow, Pencil, Trash2, Power, PowerOff, ChevronRight, Sparkles, UserPlus, RefreshCw, FileText, Webhook, Hand, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AIRuleWizard } from "@/components/ai-rule-wizard";
import { GroupDetailDialog } from "@/components/group-detail-dialog";

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
};

const TRIGGER_TYPES = [
  {
    value: "contact_created",
    label: "New Contact",
    icon: UserPlus,
    description: "When a new contact is created",
    color: "emerald" // green for new/creation
  },
  {
    value: "contact_updated",
    label: "Contact Updated",
    icon: RefreshCw,
    description: "When contact fields are modified",
    color: "blue" // blue for updates
  },
  {
    value: "form_submitted",
    label: "Form Submission",
    icon: FileText,
    description: "When a form is submitted",
    color: "blue" // blue for forms
  },
  {
    value: "api_webhook",
    label: "API / Webhook",
    icon: Webhook,
    description: "External API or webhook trigger",
    color: "orange" // orange for external/API
  },
  {
    value: "manual",
    label: "Manual Assignment",
    icon: Hand,
    description: "Manually triggered routing",
    color: "amber" // amber for manual actions
  },
];

const CONTACT_FIELDS = [
  { value: "leadSource", label: "Lead Source" },
  { value: "industry", label: "Industry" },
  { value: "country", label: "Country" },
  { value: "companySize", label: "Company Size" },
  { value: "company", label: "Company" },
];

const OPERATORS = [
  { value: "equals", label: "is" },
  { value: "notEquals", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "notContains", label: "does not contain" },
  { value: "startsWith", label: "starts with" },
  { value: "isBlank", label: "is blank" },
  { value: "isPresent", label: "is present" },
  { value: "greaterThan", label: "greater than" },
  { value: "lessThan", label: "less than" },
];

export default function RulesPage() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [rulesetDialogOpen, setRulesetDialogOpen] = useState(false);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [selectedRulesetId, setSelectedRulesetId] = useState<string | null>(null);
  const [managingTriggersRulesetId, setManagingTriggersRulesetId] = useState<string | null>(null);
  const [rulesetFormData, setRulesetFormData] = useState({
    name: "",
    description: "",
  });
  const [ruleFormData, setRuleFormData] = useState({
    name: "",
    description: "",
    groupId: "",
  });
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "leadSource", operator: "equals", value: "" },
  ]);

  useEffect(() => {
    fetchRulesets();
    fetchGroups();
  }, []);

  const fetchRulesets = async () => {
    try {
      const response = await fetch("/api/rulesets");
      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        toast.error("Failed to fetch rulesets");
        setRulesets([]);
        return;
      }

      setRulesets(data);
      if (data.length > 0 && !selectedRulesetId) {
        setSelectedRulesetId(data[0].id);
      }
    } catch (error) {
      toast.error("Failed to fetch rulesets");
      setRulesets([]);
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

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRulesetId) {
      toast.error("No ruleset selected");
      return;
    }

    // Filter out conditions with empty values, unless they're operators that don't need values
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
        fetchRulesets();
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
        fetchRulesets();
        setSelectedRulesetId(newRuleset.id);
      }
    } catch (error) {
      toast.error("Failed to create ruleset");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Rule deleted");
        fetchRulesets();
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
        fetchRulesets();
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
    setRuleFormData({
      name: "",
      description: "",
      groupId: "",
    });
    setConditions([{ field: "leadSource", operator: "equals", value: "" }]);
  };

  const resetRulesetForm = () => {
    setRulesetFormData({
      name: "",
      description: "",
    });
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "leadSource", operator: "equals", value: "" },
    ]);
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;

    // Clear value when switching to operators that don't need a value
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
        // Remove trigger
        const response = await fetch(`/api/rulesets/${rulesetId}/triggers/${triggerType}`, {
          method: "DELETE",
        });
        if (response.ok) {
          toast.success("Trigger disconnected");
          fetchRulesets();
        }
      } else {
        // Add trigger
        const response = await fetch(`/api/rulesets/${rulesetId}/triggers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggerType }),
        });
        if (response.ok) {
          toast.success("Trigger connected");
          fetchRulesets();
        }
      }
    } catch (error) {
      toast.error("Failed to update trigger");
    }
  };

  const selectedRuleset = rulesets.find(r => r.id === selectedRulesetId);
  const managingTriggersRuleset = rulesets.find(r => r.id === managingTriggersRulesetId);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Routing Rules
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage rulesets and triggers for intelligent contact routing
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
              AI Wizard
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
                  <DialogTitle>
                    {editingRule ? "Edit Rule" : "Create New Rule"}
                  </DialogTitle>
                  <DialogDescription>
                    Define conditions that automatically route contacts to a group
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRuleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        value={ruleFormData.name}
                        onChange={(e) =>
                          setRuleFormData({ ...ruleFormData, name: e.target.value })
                        }
                        required
                        placeholder="e.g., Route enterprise leads"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={ruleFormData.description}
                        onChange={(e) =>
                          setRuleFormData({ ...ruleFormData, description: e.target.value })
                        }
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">IF Conditions (All must match)</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Condition
                        </Button>
                      </div>

                      {conditions.map((condition, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={condition.field}
                            onValueChange={(value) => updateCondition(index, "field", value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACT_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(index, "operator", value)}
                          >
                            <SelectTrigger className="w-[140px]">
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

                          {condition.operator !== "isBlank" && condition.operator !== "isPresent" && (
                            <Input
                              value={condition.value}
                              onChange={(e) => updateCondition(index, "value", e.target.value)}
                              placeholder="Value"
                              className="flex-1"
                            />
                          )}

                          {conditions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label htmlFor="groupId">THEN Route to Group</Label>
                      <Select
                        value={ruleFormData.groupId}
                        onValueChange={(value) =>
                          setRuleFormData({ ...ruleFormData, groupId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
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
                  <DialogFooter className="mt-6">
                    <Button type="submit">
                      {editingRule ? "Update Rule" : "Create Rule"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Ruleset Dialog */}
        <Dialog open={rulesetDialogOpen} onOpenChange={(o) => { setRulesetDialogOpen(o); if (!o) resetRulesetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Ruleset</DialogTitle>
              <DialogDescription>
                Create a collection of rules that work together
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRulesetSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rulesetName">Ruleset Name</Label>
                  <Input
                    id="rulesetName"
                    value={rulesetFormData.name}
                    onChange={(e) =>
                      setRulesetFormData({ ...rulesetFormData, name: e.target.value })
                    }
                    required
                    placeholder="e.g., Enterprise Routing"
                  />
                </div>
                <div>
                  <Label htmlFor="rulesetDescription">Description</Label>
                  <Input
                    id="rulesetDescription"
                    value={rulesetFormData.description}
                    onChange={(e) =>
                      setRulesetFormData({ ...rulesetFormData, description: e.target.value })
                    }
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

        {/* Trigger Management Dialog */}
        <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Triggers</DialogTitle>
              <DialogDescription>
                Connect or disconnect triggers for "{managingTriggersRuleset?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {TRIGGER_TYPES.map((trigger) => {
                const Icon = trigger.icon;
                const colorClass = trigger.color;
                const isConnected = managingTriggersRuleset?.triggers.some(
                  t => t.triggerType === trigger.value
                ) || false;

                return (
                  <div
                    key={trigger.value}
                    className={`flex items-center justify-between p-4 border-2 rounded-xl bg-gradient-to-br ${
                      isConnected
                        ? colorClass === 'emerald' ? 'border-emerald-500/30 from-emerald-500/10 to-card' :
                          colorClass === 'blue' ? 'border-blue-500/30 from-blue-500/10 to-card' :
                          colorClass === 'blue' ? 'border-blue-500/30 from-blue-500/10 to-card' :
                          colorClass === 'orange' ? 'border-orange-500/30 from-orange-500/10 to-card' :
                          'border-amber-500/30 from-amber-500/10 to-card'
                        : 'border-muted/20 from-card to-muted/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                        isConnected
                          ? colorClass === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                            colorClass === 'blue' ? 'bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                            colorClass === 'blue' ? 'bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                            colorClass === 'orange' ? 'bg-orange-500/20 border-orange-500/30 text-orange-600 dark:text-orange-400' :
                            'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-muted/20 border-muted/30 text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{trigger.label}</div>
                        <div className="text-xs text-muted-foreground">{trigger.description}</div>
                      </div>
                    </div>
                    <Button
                      variant={isConnected ? "destructive" : "default"}
                      size="sm"
                      onClick={() => managingTriggersRulesetId && toggleTrigger(managingTriggersRulesetId, trigger.value, isConnected)}
                    >
                      {isConnected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-3 text-xs text-muted-foreground">Loading rulesets...</p>
          </div>
        ) : rulesets.length === 0 ? (
          <Card className="border border-primary/20 bg-gradient-to-br from-card to-muted/20">
            <CardContent className="text-center py-12">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-primary/20 text-primary mb-2 border border-primary/30">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No rulesets yet</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first ruleset to organize routing rules
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={selectedRulesetId || undefined} onValueChange={setSelectedRulesetId} className="space-y-4">
            <TabsList className="h-auto p-0.5 bg-muted/50 border border-primary/20">
              {rulesets.map((ruleset) => (
                <TabsTrigger
                  key={ruleset.id}
                  value={ruleset.id}
                  className="flex-col gap-0.5 py-2 px-3 data-[state=active]:bg-primary/10 data-[state=active]:border data-[state=active]:border-primary/30"
                >
                  <span className="text-xs font-bold">{ruleset.name}</span>
                  <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0">
                    {ruleset.rules.length} {ruleset.rules.length === 1 ? 'rule' : 'rules'}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {rulesets.map((ruleset) => (
              <TabsContent key={ruleset.id} value={ruleset.id} className="space-y-4">
                {/* Triggers Section */}
                <Card className="border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5">
                  <CardHeader className="pb-2 pt-3 px-4 border-b border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Workflow className="h-4 w-4 text-primary" />
                          Connected Triggers
                        </CardTitle>
                        <CardDescription className="mt-0.5 text-[11px]">
                          Events that run this ruleset
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border border-primary/30 text-xs"
                        onClick={() => {
                          setManagingTriggersRulesetId(ruleset.id);
                          setTriggerDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3 px-4">
                    {ruleset.triggers.length === 0 ? (
                      <div className="text-center py-3 text-[11px] text-muted-foreground">
                        No triggers connected. Click "Manage" to add some.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {ruleset.triggers.map((trigger) => {
                          const triggerConfig = TRIGGER_TYPES.find(t => t.value === trigger.triggerType);
                          if (!triggerConfig) return null;
                          const Icon = triggerConfig.icon;
                          const colorClass = triggerConfig.color;

                          return (
                            <div
                              key={trigger.id}
                              className={`p-2 border rounded-lg bg-gradient-to-br text-center ${
                                colorClass === 'emerald' ? 'border-emerald-500/30 from-emerald-500/20 to-background' :
                                colorClass === 'blue' ? 'border-blue-500/30 from-blue-500/20 to-background' :
                                colorClass === 'blue' ? 'border-blue-500/30 from-blue-500/20 to-background' :
                                colorClass === 'orange' ? 'border-orange-500/30 from-orange-500/20 to-background' :
                                'border-amber-500/30 from-amber-500/20 to-background'
                              }`}
                            >
                              <div className={`flex h-8 w-8 mx-auto items-center justify-center rounded border mb-1 ${
                                colorClass === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                                colorClass === 'blue' ? 'bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                                colorClass === 'blue' ? 'bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                                colorClass === 'orange' ? 'bg-orange-500/20 border-orange-500/30 text-orange-600 dark:text-orange-400' :
                                'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400'
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="text-[10px] font-bold text-foreground">{triggerConfig.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rules Waterfall */}
                {ruleset.rules.length === 0 ? (
                  <Card className="border border-primary/20 bg-gradient-to-br from-card to-muted/20">
                    <CardContent className="text-center py-8">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-primary/20 text-primary mb-2 border border-primary/30">
                        <Workflow className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">No rules in this ruleset</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create your first rule to start routing
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="relative max-w-4xl mx-auto">
                    {/* Flow indicator */}
                    <div className="flex items-center gap-3 mb-6 pl-4">
                      <div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-primary rounded-full"></div>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-primary/20 border border-emerald-500/30">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Cascade: Check rules in order until match found</div>
                      </div>
                    </div>

                    {/* Rules Waterfall */}
                    <div className="relative space-y-0">
                      {/* Vertical flow line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/40 via-primary/30 to-muted/20"></div>

                      {ruleset.rules.map((rule, ruleIndex) => {
                        let parsedConditions: Condition[] = [];
                        try {
                          const parsed = JSON.parse(rule.conditions);
                          if (Array.isArray(parsed)) {
                            parsedConditions = parsed;
                          }
                        } catch {}

                        const isActive = rule.isActive;

                        return (
                          <div key={rule.id} className="relative" style={{ paddingLeft: `${ruleIndex * 16}px` }}>
                            {/* Connection node on flow line */}
                            <div className={`absolute left-4 top-6 h-3 w-3 rounded-full border-2 z-10 ${
                              isActive
                                ? 'bg-emerald-500 border-emerald-500/50 shadow-lg shadow-emerald-500/50'
                                : 'bg-red-500/60 border-red-500/30'
                            }`} style={{ left: `${16 - (ruleIndex * 16)}px` }}></div>

                            {/* Horizontal branch line */}
                            <div className={`absolute left-4 top-7 h-0.5 ${
                              isActive ? 'bg-emerald-500/40' : 'bg-red-500/30'
                            }`} style={{
                              left: `${16 - (ruleIndex * 16)}px`,
                              width: `${24 + (ruleIndex * 16)}px`
                            }}></div>

                            {/* Rule Card */}
                            <Card className={`ml-10 border bg-gradient-to-br backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
                              isActive
                                ? 'border-emerald-500/30 from-card to-emerald-500/5'
                                : 'border-red-500/30 from-card to-red-500/5 opacity-60'
                            }`}>
                              <CardHeader className="pb-2 pt-3 px-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    {/* Priority Badge Circle */}
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm ${
                                      isActive
                                        ? 'bg-gradient-to-br from-emerald-500/40 to-emerald-500/30 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-red-500/20 border-red-500/30 text-red-600/60 dark:text-red-400/60'
                                    }`}>
                                      <div className="text-sm font-bold">{rule.priority}</div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <CardTitle className={`text-sm font-bold ${!isActive ? 'line-through' : ''}`}>{rule.name}</CardTitle>
                                        <Badge variant={rule.isActive ? "default" : "destructive"} className={`text-[10px] px-1.5 py-0 ${
                                          rule.isActive
                                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                            : "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
                                        }`}>
                                          {rule.isActive ? "✓" : "✗"}
                                        </Badge>
                                      </div>
                                      {rule.description && (
                                        <CardDescription className="mt-0.5 text-xs">
                                          {rule.description}
                                        </CardDescription>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-0.5 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => toggleRuleStatus(rule)}
                                    >
                                      {rule.isActive ? (
                                        <PowerOff className="h-3.5 w-3.5" />
                                      ) : (
                                        <Power className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => openEditRuleDialog(rule)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleDeleteRule(rule.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className={`p-3 ${
                                isActive
                                  ? 'bg-gradient-to-br from-muted/30 via-muted/20 to-background/50'
                                  : 'bg-gradient-to-br from-muted/20 via-muted/10 to-background/50'
                              }`}>
                                <div className="flex items-center gap-3">
                                  {/* Left: Check conditions */}
                                  <div className="flex-1">
                                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 ${
                                      isActive ? 'text-primary/60' : 'text-muted-foreground/60'
                                    }`}>
                                      Check
                                    </div>
                                    <div className="space-y-1">
                                      {parsedConditions.map((condition, index) => (
                                        <div key={index}>
                                          <button
                                            onClick={() => openEditRuleDialog(rule)}
                                            className="w-full group relative cursor-pointer"
                                          >
                                            <div className={`relative rounded-lg border backdrop-blur-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01] ${
                                              isActive
                                                ? 'border-primary/30 bg-gradient-to-br from-primary/15 to-background group-hover:border-primary/50'
                                                : 'border-muted/30 bg-gradient-to-br from-muted/15 to-background'
                                            }`}>
                                              <div className="p-2">
                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                  <div className={`rounded px-2 py-0.5 border font-semibold ${
                                                    isActive
                                                      ? 'bg-primary/15 border-primary/30 text-primary'
                                                      : 'bg-muted/15 border-muted/30 text-muted-foreground'
                                                  }`}>
                                                    {CONTACT_FIELDS.find((f) => f.value === condition.field)?.label || condition.field}
                                                  </div>
                                                  <div className={`flex items-center justify-center w-5 h-5 rounded border text-[10px] font-bold ${
                                                    isActive
                                                      ? 'bg-primary/20 border-primary/30 text-primary'
                                                      : 'bg-muted/15 border-muted/30 text-muted-foreground'
                                                  }`}>
                                                    {condition.operator === 'equals' ? '=' : condition.operator === 'contains' ? '⊃' : condition.operator === 'startsWith' ? '^' : condition.operator === 'greaterThan' ? '>' : condition.operator === 'lessThan' ? '<' : '?'}
                                                  </div>
                                                  <div className={`flex-1 rounded border px-2 py-0.5 font-semibold truncate ${
                                                    isActive
                                                      ? 'bg-background/80 border-primary/30 text-foreground'
                                                      : 'bg-background/60 border-muted/30 text-muted-foreground'
                                                  }`}>
                                                    {condition.value}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </button>
                                          {index < parsedConditions.length - 1 && (
                                            <div className="flex justify-center my-0.5">
                                              <span className={`text-[9px] font-bold ${
                                                isActive ? 'text-primary/60' : 'text-muted-foreground/60'
                                              }`}>
                                                AND
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Center: Arrow */}
                                  <div className="flex items-center pt-4">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border ${
                                      isActive
                                        ? 'bg-primary/20 border-primary/40 text-primary'
                                        : 'bg-muted/15 border-muted/30 text-muted-foreground'
                                    }`}>
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </div>
                                  </div>

                                  {/* Right: Route to */}
                                  <div className="flex-1">
                                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 ${
                                      isActive ? 'text-primary/60' : 'text-muted-foreground/60'
                                    }`}>
                                      Route to
                                    </div>
                                    <button
                                      onClick={() => setViewingGroupId(rule.groupId)}
                                      className="w-full group relative cursor-pointer"
                                    >
                                      <div className={`relative rounded-lg border backdrop-blur-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.01] ${
                                        isActive
                                          ? 'border-primary/40 bg-gradient-to-br from-primary/20 to-background group-hover:border-primary/60'
                                          : 'border-muted/40 bg-gradient-to-br from-muted/15 to-background'
                                      }`}>
                                        <div className="p-2">
                                          <div className="flex items-center gap-2">
                                            <div className={`flex h-7 w-7 items-center justify-center rounded border ${
                                              isActive
                                                ? 'bg-primary/20 border-primary/40 text-primary'
                                                : 'bg-muted/15 border-muted/30 text-muted-foreground'
                                            }`}>
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-current">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            </div>
                                            <div className="flex-1 text-left">
                                              <div className={`text-xs font-bold transition-colors ${
                                                isActive
                                                  ? 'text-foreground group-hover:text-primary'
                                                  : 'text-muted-foreground'
                                              }`}>
                                                {rule.group.name}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Waterfall connector to next rule */}
                            {ruleIndex < ruleset.rules.length - 1 && (
                              <div className="flex items-center gap-2 py-2 ml-10" style={{ paddingLeft: `${16 + ruleIndex * 16}px` }}>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isActive
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                    : 'text-red-600/60 dark:text-red-400/60 bg-red-500/10 border-red-500/30'
                                }`}>
                                  {isActive ? 'No match? Try next ↓' : 'Skipped ↓'}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Fallback indicator */}
                    <div className="flex items-center gap-3 mt-6 ml-10 pl-4">
                      <div className="relative bg-gradient-to-br from-muted/30 to-background border border-muted/40 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-muted/30 border border-muted/40">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            No match = unassigned
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* AI Rule Wizard */}
        <AIRuleWizard
          open={aiWizardOpen}
          onOpenChange={setAiWizardOpen}
          groups={groups}
          onRuleCreated={fetchRulesets}
        />
      </div>

      {/* Group Detail Dialog */}
      <GroupDetailDialog
        groupId={viewingGroupId}
        open={viewingGroupId !== null}
        onOpenChange={(open) => !open && setViewingGroupId(null)}
      />
    </DashboardLayout>
  );
}
