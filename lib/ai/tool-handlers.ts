// AI Agent Tool Handlers
// These execute the actual operations when Claude calls a tool

import { db } from "@/lib/db";
import { autoRouteContact, manualRouteToGroup } from "@/lib/routing-engine";

export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
  uiComponent?: {
    type: string;
    props: any;
  };
};

// Helper to format dates for display
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export async function executeToolCall(
  toolName: string,
  toolInput: any
): Promise<ToolResult> {
  try {
    switch (toolName) {
      // ============ CONTACT OPERATIONS ============
      case "createContact": {
        const contact = await db.contact.create({
          data: {
            name: toolInput.name,
            email: toolInput.email,
            company: toolInput.company || null,
            phone: toolInput.phone || null,
            leadSource: toolInput.leadSource || null,
            industry: toolInput.industry || null,
            companySize: toolInput.companySize || null,
            country: toolInput.country || null,
          },
        });

        return {
          success: true,
          data: contact,
          uiComponent: {
            type: "contactCard",
            props: {
              contact,
              isNew: true,
              actions: ["assign", "edit", "view"],
            },
          },
        };
      }

      case "updateContact": {
        const contact = await db.contact.update({
          where: { id: toolInput.contactId },
          data: toolInput.updates,
        });

        return {
          success: true,
          data: contact,
          uiComponent: {
            type: "contactCard",
            props: {
              contact,
              showChanges: true,
              changes: toolInput.updates,
            },
          },
        };
      }

      case "deleteContact": {
        // First get the contact for confirmation display
        const contact = await db.contact.findUnique({
          where: { id: toolInput.contactId },
        });

        if (!contact) {
          return { success: false, error: "Contact not found" };
        }

        await db.contact.delete({
          where: { id: toolInput.contactId },
        });

        return {
          success: true,
          data: { deleted: contact },
          uiComponent: {
            type: "notification",
            props: {
              type: "success",
              message: `Deleted contact: ${contact.name}`,
            },
          },
        };
      }

      case "getContact": {
        const contact = await db.contact.findUnique({
          where: { id: toolInput.contactId },
          include: {
            assignments: {
              include: {
                user: true,
                group: true,
              },
            },
          },
        });

        if (!contact) {
          return { success: false, error: "Contact not found" };
        }

        return {
          success: true,
          data: contact,
          uiComponent: {
            type: "contactCard",
            props: {
              contact,
              expanded: true,
              showAssignments: true,
              actions: ["assign", "edit", "view"],
            },
          },
        };
      }

      case "listContacts": {
        const { filter = "all", limit = 10, search } = toolInput;

        let whereClause: any = {};

        if (filter === "unassigned") {
          whereClause.assignments = { none: {} };
        } else if (filter === "assigned") {
          whereClause.assignments = { some: {} };
        } else if (filter === "recent") {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          whereClause.createdAt = { gte: weekAgo };
        }

        if (search) {
          whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ];
        }

        const contacts = await db.contact.findMany({
          where: whereClause,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            assignments: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                group: { select: { id: true, name: true } },
              },
            },
          },
        });

        const total = await db.contact.count({ where: whereClause });

        return {
          success: true,
          data: { contacts, total, showing: contacts.length },
          uiComponent: {
            type: "contactList",
            props: {
              contacts,
              total,
              filter,
              actions: ["assign", "view"],
            },
          },
        };
      }

      // ============ ASSIGNMENT OPERATIONS ============
      case "assignContact": {
        const { contactId, userId, groupId } = toolInput;

        // If a specific user is provided, create direct assignment
        if (userId && groupId) {
          const assignment = await db.assignment.create({
            data: {
              contactId,
              userId,
              groupId,
              method: "manual",
            },
            include: {
              contact: true,
              user: true,
              group: true,
            },
          });

          return {
            success: true,
            data: assignment,
            uiComponent: {
              type: "assignmentCard",
              props: {
                assignment,
                isNew: true,
              },
            },
          };
        }

        // Otherwise use routing engine
        if (groupId) {
          try {
            const result = await manualRouteToGroup(contactId, groupId);

            const assignment = await db.assignment.findFirst({
              where: { id: result.assignment.id },
              include: {
                contact: true,
                user: true,
                group: true,
              },
            });

            return {
              success: true,
              data: assignment,
              uiComponent: {
                type: "assignmentCard",
                props: {
                  assignment,
                  isNew: true,
                  method: "round-robin",
                },
              },
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : "Failed to route contact"
            };
          }
        }

        return { success: false, error: "Must specify either userId or groupId" };
      }

      case "reassignContact": {
        const { contactId, fromUserId, toUserId, reason } = toolInput;

        // Find the existing assignment
        const existingAssignment = await db.assignment.findFirst({
          where: { contactId, userId: fromUserId },
        });

        if (!existingAssignment) {
          return { success: false, error: "No existing assignment found" };
        }

        // Update the assignment
        const assignment = await db.assignment.update({
          where: { id: existingAssignment.id },
          data: {
            userId: toUserId,
            metadata: JSON.stringify({
              reassigned: true,
              previousUserId: fromUserId,
              reason: reason || "Manual reassignment",
              reassignedAt: new Date().toISOString(),
            }),
          },
          include: {
            contact: true,
            user: true,
            group: true,
          },
        });

        const fromUser = await db.user.findUnique({ where: { id: fromUserId } });
        const toUser = await db.user.findUnique({ where: { id: toUserId } });

        return {
          success: true,
          data: { assignment, fromUser, toUser },
          uiComponent: {
            type: "reassignmentCard",
            props: {
              assignment,
              fromUser,
              toUser,
              reason,
            },
          },
        };
      }

      // ============ RULE OPERATIONS ============
      case "createRule": {
        const { name, description, groupId, conditions, conditionLogic = "AND" } = toolInput;

        // Get or create a default ruleset
        let ruleset = await db.ruleset.findFirst({
          where: { isActive: true },
        });

        if (!ruleset) {
          ruleset = await db.ruleset.create({
            data: {
              name: "Default Ruleset",
              description: "Auto-created ruleset",
              isActive: true,
            },
          });
        }

        // Get max priority
        const maxPriority = await db.rule.aggregate({
          _max: { priority: true },
          where: { rulesetId: ruleset.id },
        });

        const rule = await db.rule.create({
          data: {
            name,
            description: description || null,
            groupId,
            rulesetId: ruleset.id,
            conditions: JSON.stringify(conditions),
            conditionLogic,
            priority: (maxPriority._max.priority || 0) + 1,
            isActive: true,
          },
          include: {
            group: true,
          },
        });

        return {
          success: true,
          data: rule,
          uiComponent: {
            type: "ruleCard",
            props: {
              rule,
              isNew: true,
              actions: ["toggle", "edit", "view"],
            },
          },
        };
      }

      case "toggleRule": {
        const rule = await db.rule.update({
          where: { id: toolInput.ruleId },
          data: { isActive: toolInput.isActive },
          include: { group: true },
        });

        return {
          success: true,
          data: rule,
          uiComponent: {
            type: "notification",
            props: {
              type: "success",
              message: `Rule "${rule.name}" is now ${rule.isActive ? "active" : "inactive"}`,
            },
          },
        };
      }

      case "deleteRule": {
        const rule = await db.rule.findUnique({
          where: { id: toolInput.ruleId },
        });

        if (!rule) {
          return { success: false, error: "Rule not found" };
        }

        await db.rule.delete({
          where: { id: toolInput.ruleId },
        });

        return {
          success: true,
          data: { deleted: rule },
          uiComponent: {
            type: "notification",
            props: {
              type: "success",
              message: `Deleted rule: ${rule.name}`,
            },
          },
        };
      }

      case "listRules": {
        const { rulesetId, activeOnly = false } = toolInput;

        const whereClause: any = {};
        if (rulesetId) whereClause.rulesetId = rulesetId;
        if (activeOnly) whereClause.isActive = true;

        const rules = await db.rule.findMany({
          where: whereClause,
          include: {
            group: true,
            ruleset: true,
          },
          orderBy: { priority: "asc" },
        });

        return {
          success: true,
          data: rules,
          uiComponent: {
            type: "ruleList",
            props: {
              rules,
              actions: ["toggle", "edit", "view"],
            },
          },
        };
      }

      // ============ GROUP OPERATIONS ============
      case "createGroup": {
        const group = await db.roundRobinGroup.create({
          data: {
            name: toolInput.name,
            description: toolInput.description || null,
            distributionMode: toolInput.distributionMode || "equal",
            isActive: true,
          },
        });

        return {
          success: true,
          data: group,
          uiComponent: {
            type: "groupCard",
            props: {
              group,
              isNew: true,
              actions: ["addMembers", "edit", "view"],
            },
          },
        };
      }

      case "addUserToGroup": {
        const { groupId, userId, weight } = toolInput;

        // Check if already a member
        const existing = await db.groupMember.findFirst({
          where: { groupId, userId },
        });

        if (existing) {
          return { success: false, error: "User is already a member of this group" };
        }

        const member = await db.groupMember.create({
          data: {
            groupId,
            userId,
            weight: weight || 1,
          },
          include: {
            user: true,
            group: true,
          },
        });

        return {
          success: true,
          data: member,
          uiComponent: {
            type: "notification",
            props: {
              type: "success",
              message: `Added ${member.user.name} to ${member.group.name}`,
            },
          },
        };
      }

      case "removeUserFromGroup": {
        const { groupId, userId } = toolInput;

        const member = await db.groupMember.findFirst({
          where: { groupId, userId },
          include: { user: true, group: true },
        });

        if (!member) {
          return { success: false, error: "User is not a member of this group" };
        }

        await db.groupMember.delete({
          where: { id: member.id },
        });

        return {
          success: true,
          data: { removed: member },
          uiComponent: {
            type: "notification",
            props: {
              type: "success",
              message: `Removed ${member.user.name} from ${member.group.name}`,
            },
          },
        };
      }

      case "listGroups": {
        const { includeMembers = true, includeStats = true } = toolInput;

        const groups = await db.roundRobinGroup.findMany({
          include: {
            members: includeMembers
              ? {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                }
              : false,
            _count: includeStats
              ? {
                  select: {
                    assignments: true,
                    rules: true,
                  },
                }
              : undefined,
          },
        });

        return {
          success: true,
          data: groups,
          uiComponent: {
            type: "groupList",
            props: {
              groups,
              actions: ["view", "edit", "addMembers"],
            },
          },
        };
      }

      // ============ USER OPERATIONS ============
      case "createUser": {
        const user = await db.user.create({
          data: {
            name: toolInput.name,
            email: toolInput.email,
            dailyCapacity: toolInput.dailyCapacity || null,
            weeklyCapacity: toolInput.weeklyCapacity || null,
            status: "active",
          },
        });

        return {
          success: true,
          data: user,
          uiComponent: {
            type: "userCard",
            props: {
              user,
              isNew: true,
              actions: ["addToGroup", "edit", "view"],
            },
          },
        };
      }

      case "updateUser": {
        const user = await db.user.update({
          where: { id: toolInput.userId },
          data: toolInput.updates,
        });

        return {
          success: true,
          data: user,
          uiComponent: {
            type: "userCard",
            props: {
              user,
              showChanges: true,
              changes: toolInput.updates,
            },
          },
        };
      }

      case "listUsers": {
        const { filter = "all", includeStats = true } = toolInput;

        const whereClause: any = {};
        if (filter === "active") whereClause.status = "active";
        if (filter === "inactive") whereClause.status = "paused";

        const users = await db.user.findMany({
          where: whereClause,
          include: {
            _count: includeStats
              ? {
                  select: { assignments: true },
                }
              : undefined,
            groupMemberships: {
              include: {
                group: { select: { id: true, name: true } },
              },
            },
          },
        });

        // Get assignment stats for this week if requested
        let userStats: any[] = [];
        if (includeStats) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          for (const user of users) {
            const weeklyAssignments = await db.assignment.count({
              where: {
                userId: user.id,
                createdAt: { gte: weekAgo },
              },
            });

            userStats.push({
              ...user,
              weeklyAssignments,
              totalAssignments: user._count?.assignments || 0,
            });
          }
        } else {
          userStats = users;
        }

        return {
          success: true,
          data: userStats,
          uiComponent: {
            type: "userList",
            props: {
              users: userStats,
              showStats: includeStats,
              actions: ["view", "edit", "addToGroup"],
            },
          },
        };
      }

      // ============ ANALYTICS ============
      case "getAssignmentStats": {
        const { timeframe = "week", groupBy = "user" } = toolInput;

        let startDate = new Date();
        if (timeframe === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === "week") {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === "month") {
          startDate.setMonth(startDate.getMonth() - 1);
        } else {
          startDate = new Date(0); // All time
        }

        const assignments = await db.assignment.findMany({
          where: {
            createdAt: { gte: startDate },
          },
          include: {
            user: true,
            group: true,
            contact: true,
          },
        });

        // Calculate stats based on groupBy
        let stats: any = {};

        if (groupBy === "user") {
          const userMap = new Map<string, any>();
          for (const a of assignments) {
            if (!a.user) continue;
            const existing = userMap.get(a.userId) || {
              id: a.userId,
              name: a.user.name,
              email: a.user.email,
              count: 0,
              converted: 0,
            };
            existing.count++;
            if (a.convertedAt) existing.converted++;
            userMap.set(a.userId, existing);
          }
          stats = {
            type: "byUser",
            data: Array.from(userMap.values()).sort((a, b) => b.count - a.count),
          };
        } else if (groupBy === "group") {
          const groupMap = new Map<string, any>();
          for (const a of assignments) {
            if (!a.group) continue;
            const existing = groupMap.get(a.groupId!) || {
              id: a.groupId,
              name: a.group.name,
              count: 0,
              converted: 0,
            };
            existing.count++;
            if (a.convertedAt) existing.converted++;
            groupMap.set(a.groupId!, existing);
          }
          stats = {
            type: "byGroup",
            data: Array.from(groupMap.values()).sort((a, b) => b.count - a.count),
          };
        }

        stats.total = assignments.length;
        stats.timeframe = timeframe;
        stats.startDate = startDate.toISOString();

        return {
          success: true,
          data: stats,
          uiComponent: {
            type: "statsChart",
            props: {
              stats,
              chartType: groupBy === "user" ? "bar" : "pie",
            },
          },
        };
      }

      // ============ NAVIGATION ============
      case "navigateTo": {
        const { page, params = {} } = toolInput;

        const routes: Record<string, string> = {
          contacts: "/contacts",
          users: "/users",
          groups: "/groups",
          rules: "/rules",
          activity: "/activity",
          settings: "/settings",
          forms: "/forms",
          meetings: "/meetings",
        };

        const basePath = routes[page];
        const queryString = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&");

        const fullPath = queryString ? `${basePath}?${queryString}` : basePath;

        return {
          success: true,
          data: { path: fullPath, page },
          uiComponent: {
            type: "navigation",
            props: {
              path: fullPath,
              label: `Go to ${page.charAt(0).toUpperCase() + page.slice(1)}`,
            },
          },
        };
      }

      // ============ CONFIRMATION ============
      case "requestConfirmation": {
        return {
          success: true,
          data: {
            pending: true,
            action: toolInput.action,
            details: toolInput.details,
          },
          uiComponent: {
            type: "confirmation",
            props: {
              action: toolInput.action,
              details: toolInput.details,
              confirmText: toolInput.confirmButtonText || "Confirm",
              cancelText: toolInput.cancelButtonText || "Cancel",
            },
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
