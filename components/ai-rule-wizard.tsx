"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  Edit2,
  Users,
  Filter,
  Target,
  AlertCircle,
  ChevronRight,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type RuleSuggestion = {
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  conditionLogic: string;
  groupId?: string;
  groupName?: string;
  confidence: number;
  explanation: string;
};

type Contact = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  leadSource: string | null;
  industry: string | null;
  country: string | null;
  companySize: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: Array<{ id: string; name: string }>;
  onRuleCreated: () => void;
  initialPrompt?: string | null;
};

export function AIRuleWizard({ open, onOpenChange, groups, onRuleCreated, initialPrompt }: Props) {
  const [step, setStep] = useState(1);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<RuleSuggestion | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [filteredGroups, setFilteredGroups] = useState<typeof groups>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Matching contacts state
  const [matchingContacts, setMatchingContacts] = useState<Contact[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [createdRuleId, setCreatedRuleId] = useState<string | null>(null);
  const [showEnrollSuccess, setShowEnrollSuccess] = useState(false);

  // Handle initial prompt from URL/AI chat
  useEffect(() => {
    if (open && initialPrompt && step === 1) {
      setUserInput(initialPrompt);
    }
  }, [open, initialPrompt, step]);

  const handleAnalyze = async () => {
    if (!userInput.trim()) {
      toast.error("Please describe what you want to route");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ai/interpret-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          availableGroups: groups,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuggestion(result.suggestion);
        setEditedName(result.suggestion.name);
        setSelectedGroupId(result.suggestion.groupId || "");
        setStep(2);

        // Load matching contacts
        loadMatchingContacts(result.suggestion.conditions, result.suggestion.conditionLogic);
      } else {
        toast.error("Failed to analyze your request");
      }
    } catch (error) {
      toast.error("Failed to analyze your request");
    } finally {
      setLoading(false);
    }
  };

  const loadMatchingContacts = async (conditions: any[], conditionLogic: string) => {
    setLoadingMatches(true);
    try {
      const response = await fetch("/api/rules/preview-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions, conditionLogic }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Matching contacts response:", data);
        setMatchingContacts(data.contacts || []);
        setMatchCount(data.count || 0);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Preview matches API error:", errorData);
      }
    } catch (error) {
      console.error("Failed to load matching contacts:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleEnrollMatches = async (ruleId: string) => {
    if (!selectedGroupId || matchingContacts.length === 0) return;

    setEnrolling(true);
    try {
      const contactIds = matchingContacts.map((c) => c.id);
      const response = await fetch("/api/rules/enroll-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId,
          contactIds,
          groupId: selectedGroupId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Enrolled ${data.enrolled} existing contacts`);
        setShowEnrollSuccess(true);
        setTimeout(() => {
          handleClose();
          onRuleCreated();
        }, 1500);
      } else {
        toast.error("Failed to enroll contacts");
      }
    } catch (error) {
      toast.error("Failed to enroll contacts");
    } finally {
      setEnrolling(false);
    }
  };

  const handleCreateRule = async () => {
    if (!suggestion || !selectedGroupId) {
      toast.error("Please select a group");
      return;
    }

    setLoading(true);

    try {
      // Ensure we have a ruleset to associate the rule with
      let rulesetId: string | null = null;
      const rulesetsRes = await fetch("/api/rulesets");
      const rulesets = await rulesetsRes.json();

      if (rulesets.length === 0) {
        // Create a default ruleset
        const newRulesetRes = await fetch("/api/rulesets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Default Routing", description: "Primary routing rules" }),
        });
        const newRuleset = await newRulesetRes.json();
        rulesetId = newRuleset.id;
      } else {
        rulesetId = rulesets[0].id;
      }

      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedName || suggestion.name,
          description: suggestion.description,
          groupId: selectedGroupId,
          rulesetId,
          conditions: suggestion.conditions,
          conditionLogic: suggestion.conditionLogic,
        }),
      });

      if (response.ok) {
        const rule = await response.json();
        setCreatedRuleId(rule.id);

        // Show success message
        if (matchCount > 0) {
          toast.success("Rule created successfully!");
          // Don't close - show enrollment option
        } else {
          toast.success("Rule created successfully!");
          handleClose();
          onRuleCreated();
        }
      } else {
        toast.error("Failed to create rule");
      }
    } catch (error) {
      toast.error("Failed to create rule");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setUserInput("");
    setSuggestion(null);
    setSelectedGroupId("");
    setEditingName(false);
    setEditedName("");
    setMatchingContacts([]);
    setMatchCount(0);
    setShowMatches(false);
    setCreatedRuleId(null);
    setShowEnrollSuccess(false);
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep(1);
    setSuggestion(null);
    setEditingName(false);
    setMatchingContacts([]);
    setShowMatches(false);
  };

  // Smart autocomplete logic
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserInput(value);

    // Detect patterns like "assign to", "route to", "send to"
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Match patterns like "to [partial]" or "team [partial]"
    const match = textBeforeCursor.match(/(to|team|group)\s+(\w*)$/i);

    if (match) {
      const searchTerm = match[2].toLowerCase();
      const filtered = groups.filter((g) =>
        g.name.toLowerCase().includes(searchTerm)
      );

      if (filtered.length > 0) {
        setFilteredGroups(filtered);
        setSelectedIndex(0);
        setShowAutocomplete(true);

        // Position the autocomplete dropdown
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const { top, left, height } = textarea.getBoundingClientRect();
          setAutocompletePosition({
            top: height + 4,
            left: 0,
          });
        }
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredGroups.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredGroups.length) % filteredGroups.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertGroup(filteredGroups[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
    }
  };

  const insertGroup = (group: { id: string; name: string }) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBefore = userInput.slice(0, cursorPos);
    const textAfter = userInput.slice(cursorPos);

    // Replace the partial text with the group name
    const match = textBefore.match(/(to|team|group)\s+(\w*)$/i);
    if (match) {
      const beforeMatch = textBefore.slice(0, -match[0].length);
      const newText = `${beforeMatch}${match[1]} ${group.name}${textAfter}`;
      setUserInput(newText);

      // Set cursor position after the inserted group name
      setTimeout(() => {
        const newCursorPos = beforeMatch.length + match[1].length + group.name.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }

    setShowAutocomplete(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-emerald-600 dark:text-emerald-400";
    if (confidence >= 0.6) return "text-amber-600 dark:text-amber-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High Confidence";
    if (confidence >= 0.6) return "Medium Confidence";
    return "Low Confidence";
  };

  const getOperatorLabel = (operator: string) => {
    const operatorLabels: Record<string, string> = {
      equals: "is",
      notEquals: "is not",
      contains: "contains",
      notContains: "does not contain",
      startsWith: "starts with",
      isBlank: "is blank",
      isPresent: "is present",
      greaterThan: "greater than",
      lessThan: "less than",
    };
    return operatorLabels[operator] || operator;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[min(1400px,95vw)] w-full max-h-[92vh] overflow-hidden p-0 modern-scrollbar flex flex-col">
        <div className="flex-1 overflow-y-auto modern-scrollbar">
          <div className="p-10 space-y-8">
            <DialogHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-semibold">Rule Builder</DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    Describe your routing requirement
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center gap-3 py-4">
              <div className={`flex items-center gap-3 ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 ${step >= 1 ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                  {step > 1 ? <Check className="h-4 w-4" /> : "1"}
                </div>
                <span className="text-sm font-medium">Define</span>
              </div>
              <div className={`h-px flex-1 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
              <div className={`flex items-center gap-3 ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 ${step >= 2 ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                  2
                </div>
                <span className="text-sm font-medium">Review</span>
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label htmlFor="description" className="text-base font-medium">
                    Routing Requirement
                  </Label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      id="description"
                      placeholder="Describe the routing logic you need (e.g., Route inbound leads from the pricing page who work at companies with 500+ employees to the enterprise team)"
                      value={userInput}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="w-full min-h-[140px] rounded-lg border border-input bg-background px-4 py-3 text-base resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      disabled={loading}
                    />

                    {/* Autocomplete Dropdown */}
                    {showAutocomplete && (
                      <div
                        className="absolute z-50 w-full max-w-xs bg-background border border-border rounded-lg shadow-lg overflow-hidden"
                        style={{
                          top: autocompletePosition.top,
                          left: autocompletePosition.left,
                        }}
                      >
                        <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                          Available groups
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredGroups.map((group, idx) => (
                            <button
                              key={group.id}
                              onClick={() => insertGroup(group)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                                idx === selectedIndex ? "bg-muted" : ""
                              }`}
                            >
                              {group.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: Type "to" or "team" to see available groups
                  </p>
                </div>

                <Card className="border border-border/50 bg-muted/30">
                  <CardContent className="pt-5 pb-5">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Example patterns:</p>
                      <div className="grid gap-2">
                        {[
                          "Route inbound leads from the pricing page who work at companies with 500+ employees to the enterprise team",
                          "Send demo requests from healthcare or finance companies to the vertical specialists team",
                          "Route all leads from the UK, Ireland, and Germany to the EMEA sales team",
                          "Assign Google Ads leads from the 'Enterprise Q1 Campaign' to the outbound SDR group",
                        ].map((example, idx) => (
                          <button
                            key={idx}
                            onClick={() => setUserInput(example)}
                            className="text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 p-3 rounded-md transition-colors border border-transparent hover:border-border/50"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 2 && suggestion && (
              <div className="space-y-8 pb-24">
                {/* Confidence Indicator */}
                <div className="flex items-center justify-between py-4 border-b">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Interpretation</h3>
                    <p className="text-base">{suggestion.explanation}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-semibold tabular-nums ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getConfidenceLabel(suggestion.confidence)}
                    </div>
                  </div>
                </div>

                {suggestion.confidence < 0.8 && (
                  <div className="flex items-start gap-3 text-sm bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Confidence below 80%. Please review the interpretation carefully.
                    </p>
                  </div>
                )}

                {/* Matching Contacts Preview */}
                {loadingMatches ? (
                  <Card className="border border-border/50 bg-muted/20">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Checking for existing contacts...</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : matchCount > 0 ? (
                  <Card className="border border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{matchCount} Existing Contacts Match</h3>
                            <p className="text-sm text-muted-foreground">
                              {showMatches ? "Showing matching contacts" : "These contacts meet the criteria"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMatches(!showMatches)}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          {showMatches ? "Hide" : "View"} Contacts
                        </Button>
                      </div>

                      {showMatches && (
                        <div className="mt-4 border rounded-lg overflow-hidden bg-background">
                          <div className="max-h-80 overflow-y-auto modern-scrollbar">
                            {/* Table Header */}
                            <div className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b">
                              <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-3">Name</div>
                                <div className="col-span-3">Company</div>
                                <div className="col-span-3">Email</div>
                                <div className="col-span-2">Lead Source</div>
                                <div className="col-span-1">Size</div>
                              </div>
                            </div>
                            {/* Table Body */}
                            <div>
                              {matchingContacts.map((contact, idx) => (
                                <div
                                  key={contact.id}
                                  className={`grid grid-cols-12 gap-3 px-4 py-3 text-sm border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                                  }`}
                                >
                                  <div className="col-span-3 font-medium truncate">{contact.name}</div>
                                  <div className="col-span-3 text-muted-foreground truncate">
                                    {contact.company || <span className="italic text-muted-foreground/50">—</span>}
                                  </div>
                                  <div className="col-span-3 text-muted-foreground truncate">
                                    {contact.email || <span className="italic text-muted-foreground/50">—</span>}
                                  </div>
                                  <div className="col-span-2">
                                    {contact.leadSource ? (
                                      <Badge variant="outline" className="text-xs">
                                        {contact.leadSource}
                                      </Badge>
                                    ) : (
                                      <span className="italic text-muted-foreground/50 text-xs">—</span>
                                    )}
                                  </div>
                                  <div className="col-span-1">
                                    {contact.companySize ? (
                                      <Badge variant="secondary" className="text-xs">
                                        {contact.companySize}
                                      </Badge>
                                    ) : (
                                      <span className="italic text-muted-foreground/50 text-xs">—</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border/50 bg-muted/10">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/20">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">No Existing Contacts Match</h3>
                          <p className="text-sm text-muted-foreground">
                            This rule will only apply to new contacts going forward
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Visual Rule Flow */}
                <div className="relative">
                  {/* Connection Line */}
                  <div className="absolute top-[72px] left-[calc(33.333%)] right-[calc(33.333%)] h-px bg-gradient-to-r from-border via-primary/50 to-border" />

                  <div className="grid grid-cols-3 gap-8">
                    {/* Conditions */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">Conditions</h4>
                          <p className="text-xs text-muted-foreground">Match criteria</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {suggestion.conditions.map((condition, idx) => (
                          <div key={idx}>
                            {idx > 0 && (
                              <div className="flex justify-center my-2">
                                <Badge variant="outline" className="text-xs font-mono px-2 py-0.5">
                                  {suggestion.conditionLogic}
                                </Badge>
                              </div>
                            )}
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border/50">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {condition.field}
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">{getOperatorLabel(condition.operator)}</span>
                                {condition.operator !== "isBlank" && condition.operator !== "isPresent" && (
                                  <>
                                    {" "}
                                    <span className="font-medium text-foreground">{condition.value}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-start justify-center pt-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">THEN</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">Assignment</h4>
                          <p className="text-xs text-muted-foreground">Target group</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                          <Label htmlFor="group" className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
                            Assign To
                          </Label>
                          <select
                            id="group"
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                          >
                            <option value="">Select group...</option>
                            {groups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedGroupId && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                            <span>Group selected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rule Details */}
                <div className="space-y-6 pt-6 border-t">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-muted-foreground">Rule Name</Label>
                      {!editingName && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingName(true)}
                          className="h-7 text-xs"
                        >
                          <Edit2 className="h-3 w-3 mr-1.5" />
                          Edit
                        </Button>
                      )}
                    </div>
                    {editingName ? (
                      <div className="flex gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => setEditingName(false)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="font-semibold text-lg">{editedName}</p>
                    )}
                  </div>

                  {suggestion.description && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                      <p className="text-sm mt-2">
                        {suggestion.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t bg-background/95 backdrop-blur-sm p-6">
          {createdRuleId && matchCount > 0 ? (
            // Show enrollment options after rule creation
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">Rule created successfully!</span>
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleClose();
                    onRuleCreated();
                  }}
                  className="text-sm"
                  disabled={enrolling}
                >
                  Skip for now
                </Button>
                <Button
                  onClick={() => handleEnrollMatches(createdRuleId)}
                  disabled={enrolling || showEnrollSuccess}
                  className="px-6"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : showEnrollSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Enrolled!
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Enroll {matchCount} Existing Contact{matchCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Show normal create flow
            <div className="flex justify-between items-center">
              {step === 1 ? (
                <>
                  <Button variant="ghost" onClick={handleClose} className="text-sm">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    disabled={loading || !userInput.trim()}
                    className="px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleBack} className="text-sm">
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateRule}
                    disabled={loading || !selectedGroupId}
                    className="px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Create Rule
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
