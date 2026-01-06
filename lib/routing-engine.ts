import { db } from "./db";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import safeEval from "safe-eval";
import { calendarService } from "./calendar/calendar-service";

// Types
type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  leadSource: string | null;
  industry: string | null;
  country: string | null;
  companySize: string | null;
};

type Condition = {
  field: string;
  operator: string;
  value: string;
};

type TimeConstraint = {
  days: number[]; // 0-6 (Sunday-Saturday)
  hours: { start: number; end: number }; // 0-23
  timezone: string;
};

type RoutingContext = {
  datetime?: Date;
  timezone?: string;
  leadScore?: number;
};

// ============================================================================
// Condition Evaluation
// ============================================================================

type ConditionResult = {
  condition: Condition;
  matched: boolean;
  actualValue: string | null;
};

function evaluateCondition(contact: Contact, condition: Condition): boolean {
  const rawFieldValue = contact[condition.field as keyof Contact];
  const fieldValue = (rawFieldValue || "").toString().toLowerCase();
  const conditionValue = condition.value.toLowerCase();

  switch (condition.operator) {
    case "equals":
      return fieldValue === conditionValue;
    case "notEquals":
      return fieldValue !== conditionValue;
    case "contains":
      return fieldValue.includes(conditionValue);
    case "notContains":
      return !fieldValue.includes(conditionValue);
    case "startsWith":
      return fieldValue.startsWith(conditionValue);
    case "isBlank":
      return !rawFieldValue || rawFieldValue === "";
    case "isPresent":
      return !!rawFieldValue && rawFieldValue !== "";
    case "greaterThan":
      return parseFloat(fieldValue) > parseFloat(conditionValue);
    case "lessThan":
      return parseFloat(fieldValue) < parseFloat(conditionValue);
    default:
      return false;
  }
}

// Enhanced version that returns details about each condition
function evaluateConditionWithDetails(contact: Contact, condition: Condition): ConditionResult {
  const rawFieldValue = contact[condition.field as keyof Contact];
  const matched = evaluateCondition(contact, condition);
  return {
    condition,
    matched,
    actualValue: rawFieldValue?.toString() || null,
  };
}

function evaluateRule(
  contact: Contact,
  conditions: Condition[],
  conditionLogic: string = "AND"
): boolean {
  if (conditionLogic === "OR") {
    // At least one condition must match
    return conditions.some((condition) => evaluateCondition(contact, condition));
  }
  // Default: All conditions must match (AND logic)
  return conditions.every((condition) => evaluateCondition(contact, condition));
}

function evaluateCustomExpression(
  contact: Contact,
  expression: string,
  context: RoutingContext
): boolean {
  try {
    const safeContext = {
      contact,
      leadScore: context.leadScore || 0,
      currentTime: context.datetime || new Date(),
    };
    return safeEval(expression, safeContext);
  } catch (error) {
    console.error("Error evaluating custom expression:", error);
    return false;
  }
}

function evaluateTimeConstraints(
  timeConstraints: TimeConstraint | null,
  datetime: Date
): boolean {
  if (!timeConstraints) return true;

  const { days, hours, timezone } = timeConstraints;

  // Convert current time to rule's timezone
  const zonedDate = toZonedTime(datetime, timezone);
  const dayOfWeek = zonedDate.getDay(); // 0-6
  const hourOfDay = zonedDate.getHours(); // 0-23

  // Check day of week
  if (!days.includes(dayOfWeek)) {
    return false;
  }

  // Check time of day
  if (hourOfDay < hours.start || hourOfDay >= hours.end) {
    return false;
  }

  return true;
}

// ============================================================================
// Availability Checking
// ============================================================================

async function isUserAvailableNow(
  userId: string,
  datetime: Date = new Date()
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      availability: { where: { isActive: true } },
      timeOff: true,
    },
  });

  if (!user || user.status !== "active") {
    return false;
  }

  // Check time off
  const isOnTimeOff = user.timeOff.some((timeOff) =>
    isWithinInterval(datetime, {
      start: new Date(timeOff.startDate),
      end: new Date(timeOff.endDate),
    })
  );

  if (isOnTimeOff) {
    return false;
  }

  // If no availability schedule set, assume always available
  if (user.availability.length === 0) {
    return true;
  }

  // Check if current time falls within user's working hours
  const userTimezone = user.timezone || "America/New_York";
  const zonedDate = toZonedTime(datetime, userTimezone);
  const dayOfWeek = zonedDate.getDay();
  const timeString = `${zonedDate.getHours().toString().padStart(2, "0")}:${zonedDate.getMinutes().toString().padStart(2, "0")}`;

  const hasMatchingAvailability = user.availability.some((avail) => {
    if (avail.dayOfWeek !== dayOfWeek) return false;
    return timeString >= avail.startTime && timeString <= avail.endTime;
  });

  return hasMatchingAvailability;
}

async function hasCapacityRemaining(
  userId: string,
  period: "daily" | "weekly" = "daily"
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  const capacityLimit = period === "daily" ? user.dailyCapacity : user.weeklyCapacity;

  // If no capacity limit set, assume unlimited
  if (!capacityLimit) return true;

  // Count assignments in the period
  const since =
    period === "daily" ? startOfDay(new Date()) : startOfDay(subDays(new Date(), 7));

  const assignmentCount = await db.assignment.count({
    where: {
      userId,
      createdAt: {
        gte: since,
      },
    },
  });

  return assignmentCount < capacityLimit;
}

// ============================================================================
// Performance Metrics
// ============================================================================

async function getPerformanceMultiplier(userId: string): Promise<number> {
  // Get user's performance metrics from last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);

  const metrics = await db.userPerformanceMetric.findMany({
    where: {
      userId,
      date: {
        gte: thirtyDaysAgo,
      },
    },
  });

  if (metrics.length === 0) return 1.0; // No data, neutral multiplier

  // Calculate average conversion rate
  const totalAssignments = metrics.reduce((sum, m) => sum + m.assignmentCount, 0);
  const totalConversions = metrics.reduce((sum, m) => sum + m.conversionCount, 0);

  if (totalAssignments === 0) return 1.0;

  const conversionRate = totalConversions / totalAssignments;

  // High performers (>30% conversion) get 0.8x (receive more leads)
  // Average performers (15-30%) get 1.0x
  // Low performers (<15%) get 1.2x (receive fewer leads)
  if (conversionRate > 0.3) return 0.8;
  if (conversionRate < 0.15) return 1.2;
  return 1.0;
}

// ============================================================================
// Smart Round Robin Selection
// ============================================================================

export async function getNextUserInGroup(
  groupId: string,
  context: RoutingContext = {}
): Promise<any> {
  const group = await db.roundRobinGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: {
          user: {
            status: "active",
          },
        },
        include: {
          user: {
            include: {
              availability: true,
              timeOff: true,
            },
          },
        },
      },
    },
  });

  if (!group || group.members.length === 0) {
    throw new Error("No active members in group");
  }

  // Filter eligible members based on availability and capacity
  // Note: Calendar check removed - we now use shared calendar fallback for users without their own
  const eligibleMembers = [];
  const datetime = context.datetime || new Date();

  for (const member of group.members) {
    const isAvailable = await isUserAvailableNow(member.user.id, datetime);
    const hasCapacity = await hasCapacityRemaining(member.user.id, "daily");

    if (isAvailable && hasCapacity) {
      eligibleMembers.push(member);
    }
  }

  // If no one is available, fall back to all active members
  // (better to assign to someone than to fail)
  const membersToConsider = eligibleMembers.length > 0 ? eligibleMembers : group.members;

  if (membersToConsider.length === 0) {
    throw new Error("No eligible members in group");
  }

  // Get assignment counts and performance multipliers for each member
  const memberScores = await Promise.all(
    membersToConsider.map(async (member) => {
      const count = await db.assignment.count({
        where: {
          userId: member.userId,
          groupId: groupId,
        },
      });

      const performanceMultiplier = await getPerformanceMultiplier(member.userId);

      // Calculate effective count
      let effectiveCount = count;

      if (group.distributionMode === "weighted") {
        effectiveCount = count / member.weight;
      }

      // Apply performance multiplier
      effectiveCount = effectiveCount * performanceMultiplier;

      return {
        member,
        count,
        effectiveCount,
      };
    })
  );

  // Sort by effective count (ascending) - lowest gets the lead
  memberScores.sort((a, b) => a.effectiveCount - b.effectiveCount);

  return memberScores[0].member.user;
}

// ============================================================================
// Auto-Routing with Advanced Features
// ============================================================================

export async function autoRouteContact(
  contactId: string,
  context: RoutingContext = {}
): Promise<boolean> {
  try {
    // Get the contact
    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return false;
    }

    // Get all active rules ordered by priority
    const rules = await db.rule.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" },
      include: {
        group: true,
        fallbackGroup: true,
      },
    });

    const datetime = context.datetime || new Date();

    // Find the first matching rule
    for (const rule of rules) {
      try {
        // Evaluate time constraints
        let timeConstraints: TimeConstraint | null = null;
        if (rule.timeConstraints) {
          timeConstraints = JSON.parse(rule.timeConstraints) as TimeConstraint;
        }

        if (!evaluateTimeConstraints(timeConstraints, datetime)) {
          continue; // Rule doesn't apply at this time
        }

        // Evaluate custom expression if present
        if (rule.customExpression) {
          if (!evaluateCustomExpression(contact, rule.customExpression, context)) {
            continue;
          }
        }

        // Evaluate standard conditions
        // Handle cases where conditions might be over-stringified
        let conditions: Condition[];
        try {
          let parsed = JSON.parse(rule.conditions);
          // If it's a string, keep parsing until we get an array
          while (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
          conditions = parsed as Condition[];
        } catch (error) {
          console.error(`Error parsing conditions for rule ${rule.id}:`, error);
          continue;
        }

        if (!evaluateRule(contact, conditions, rule.conditionLogic)) {
          continue;
        }

        // Rule matches! Capture which conditions matched
        const matchedConditions = conditions.map(c => evaluateConditionWithDetails(contact, c));

        // Try to route to primary group
        let targetGroupId = rule.groupId;
        let user;
        let usedFallback = false;

        try {
          user = await getNextUserInGroup(targetGroupId, context);
        } catch (error) {
          // Primary group failed, try fallback
          if (rule.fallbackGroupId) {
            console.log(
              `Primary group unavailable, trying fallback for rule "${rule.name}"`
            );
            targetGroupId = rule.fallbackGroupId;
            user = await getNextUserInGroup(targetGroupId, context);
            usedFallback = true;
          } else {
            throw error;
          }
        }

        // Build routing metadata with matched conditions
        const routingMetadata = {
          matchedRule: {
            id: rule.id,
            name: rule.name,
            priority: rule.priority,
          },
          conditions: matchedConditions,
          conditionLogic: rule.conditionLogic || "AND",
          usedFallbackGroup: usedFallback,
          routedAt: new Date().toISOString(),
        };

        // Create assignment
        const assignment = await db.assignment.create({
          data: {
            contactId: contact.id,
            userId: user.id,
            groupId: targetGroupId,
            method: "auto",
            ruleId: rule.id,
            timezone: context.timezone,
            leadScore: context.leadScore,
            metadata: JSON.stringify(routingMetadata),
          },
        });

        // Update rule analytics
        await db.rule.update({
          where: { id: rule.id },
          data: {
            matchCount: {
              increment: 1,
            },
          },
        });

        console.log(
          `Auto-routed contact ${contact.name} to ${user.name} via rule "${rule.name}"`
        );
        return true;
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
        continue;
      }
    }

    // No matching rules
    return false;
  } catch (error) {
    console.error("Error in auto-routing:", error);
    return false;
  }
}

// ============================================================================
// Manual Routing (Enhanced)
// ============================================================================

export async function manualRouteToGroup(
  contactId: string,
  groupId: string,
  context: RoutingContext = {}
): Promise<any> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  const user = await getNextUserInGroup(groupId, context);

  const assignment = await db.assignment.create({
    data: {
      contactId: contact.id,
      userId: user.id,
      groupId: groupId,
      method: "manual",
      timezone: context.timezone,
      leadScore: context.leadScore,
    },
  });

  return { contact, user, assignment };
}

// ============================================================================
// Preview / Testing
// ============================================================================

export async function previewRouting(contactData: Contact): Promise<{
  matchedRule: any | null;
  targetGroup: any | null;
  targetUser: any | null;
  reason: string;
}> {
  const rules = await db.rule.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
    include: {
      group: true,
    },
  });

  const datetime = new Date();

  for (const rule of rules) {
    try {
      // Check time constraints
      let timeConstraints: TimeConstraint | null = null;
      if (rule.timeConstraints) {
        timeConstraints = JSON.parse(rule.timeConstraints) as TimeConstraint;
      }

      if (!evaluateTimeConstraints(timeConstraints, datetime)) {
        continue;
      }

      // Check custom expression
      if (rule.customExpression) {
        if (!evaluateCustomExpression(contactData, rule.customExpression, {})) {
          continue;
        }
      }

      // Check conditions
      // Handle cases where conditions might be over-stringified
      let conditions: Condition[];
      try {
        let parsed = JSON.parse(rule.conditions);
        // If it's a string, keep parsing until we get an array
        while (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        conditions = parsed as Condition[];
      } catch (error) {
        console.error(`Error parsing conditions for rule ${rule.id}:`, error);
        continue;
      }

      if (evaluateRule(contactData, conditions, rule.conditionLogic)) {
        // This rule would match!
        try {
          const user = await getNextUserInGroup(rule.groupId);
          return {
            matchedRule: rule,
            targetGroup: rule.group,
            targetUser: user,
            reason: `Matched rule "${rule.name}"`,
          };
        } catch (error) {
          return {
            matchedRule: rule,
            targetGroup: rule.group,
            targetUser: null,
            reason: `Would match rule "${rule.name}" but group has no available users`,
          };
        }
      }
    } catch (error) {
      continue;
    }
  }

  return {
    matchedRule: null,
    targetGroup: null,
    targetUser: null,
    reason: "No matching rules",
  };
}
