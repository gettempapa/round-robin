// AI Agent Tool Definitions
// These define the actions the AI can take on behalf of the user

import { z } from "zod";

// Tool input schemas for validation
export const toolSchemas = {
  // Contact operations
  createContact: z.object({
    name: z.string().describe("Full name of the contact"),
    email: z.string().email().describe("Email address"),
    company: z.string().optional().describe("Company name"),
    phone: z.string().optional().describe("Phone number"),
    leadSource: z.string().optional().describe("Where the lead came from"),
    industry: z.string().optional().describe("Industry sector"),
    companySize: z.string().optional().describe("Company size category"),
    country: z.string().optional().describe("Country"),
  }),

  updateContact: z.object({
    contactId: z.string().describe("ID of the contact to update"),
    updates: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      leadSource: z.string().optional(),
      industry: z.string().optional(),
      companySize: z.string().optional(),
      country: z.string().optional(),
    }).describe("Fields to update"),
  }),

  deleteContact: z.object({
    contactId: z.string().describe("ID of the contact to delete"),
  }),

  // Assignment operations
  assignContact: z.object({
    contactId: z.string().describe("ID of the contact to assign"),
    userId: z.string().optional().describe("ID of the user to assign to (optional - will use round robin if not specified)"),
    groupId: z.string().optional().describe("ID of the group to assign through"),
  }),

  reassignContact: z.object({
    contactId: z.string().describe("ID of the contact to reassign"),
    fromUserId: z.string().describe("ID of the current assignee"),
    toUserId: z.string().describe("ID of the new assignee"),
    reason: z.string().optional().describe("Reason for reassignment"),
  }),

  // Salesforce operations
  assignSalesforceOwner: z.object({
    recordId: z.string().describe("Salesforce record ID (Contact or Lead)"),
    ownerId: z.string().describe("Salesforce user ID to assign as owner"),
  }),

  routeSalesforceRecord: z.object({
    recordId: z.string().describe("Salesforce record ID (Contact or Lead) to route"),
    groupId: z.string().describe("ID of the round-robin group to route through"),
  }),

  // Rule operations
  createRule: z.object({
    name: z.string().describe("Name of the routing rule"),
    description: z.string().optional().describe("Description of what the rule does"),
    groupId: z.string().describe("ID of the group to route matching contacts to"),
    conditions: z.array(z.object({
      field: z.string().describe("Field to match on"),
      operator: z.enum(["equals", "notEquals", "contains", "notContains", "startsWith", "greaterThan", "lessThan", "isBlank", "isPresent"]),
      value: z.string().describe("Value to match"),
    })).describe("Conditions that must match for the rule to apply"),
    conditionLogic: z.enum(["AND", "OR"]).default("AND").describe("How to combine conditions"),
  }),

  updateRule: z.object({
    ruleId: z.string().describe("ID of the rule to update"),
    updates: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      groupId: z.string().optional(),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      })).optional(),
      isActive: z.boolean().optional(),
    }).describe("Fields to update"),
  }),

  toggleRule: z.object({
    ruleId: z.string().describe("ID of the rule to toggle"),
    isActive: z.boolean().describe("Whether the rule should be active"),
  }),

  deleteRule: z.object({
    ruleId: z.string().describe("ID of the rule to delete"),
  }),

  // Group operations
  createGroup: z.object({
    name: z.string().describe("Name of the group"),
    description: z.string().optional().describe("Description of the group"),
    distributionMode: z.enum(["equal", "weighted"]).default("equal").describe("How to distribute leads among members"),
  }),

  addUserToGroup: z.object({
    groupId: z.string().describe("ID of the group"),
    userId: z.string().describe("ID of the user to add"),
    weight: z.number().optional().describe("Weight for weighted distribution"),
  }),

  removeUserFromGroup: z.object({
    groupId: z.string().describe("ID of the group"),
    userId: z.string().describe("ID of the user to remove"),
  }),

  // User operations
  createUser: z.object({
    name: z.string().describe("Full name of the user"),
    email: z.string().email().describe("Email address"),
    dailyCapacity: z.number().optional().describe("Max leads per day"),
    weeklyCapacity: z.number().optional().describe("Max leads per week"),
  }),

  updateUser: z.object({
    userId: z.string().describe("ID of the user to update"),
    updates: z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      dailyCapacity: z.number().optional(),
      weeklyCapacity: z.number().optional(),
      isActive: z.boolean().optional(),
    }).describe("Fields to update"),
  }),

  // Query/Display tools - these return data for rich UI rendering
  listContacts: z.object({
    filter: z.enum(["all", "unassigned", "assigned", "recent"]).default("all"),
    limit: z.number().default(10).describe("Max number to return"),
    search: z.string().optional().describe("Search term for name/email/company"),
    recordType: z.enum(["all", "contact", "lead"]).default("all").describe("Type of Salesforce record to query"),
  }),

  getContact: z.object({
    contactId: z.string().describe("ID of the contact to fetch"),
  }),

  listUsers: z.object({
    filter: z.enum(["all", "active", "inactive"]).default("all"),
    includeStats: z.boolean().default(true).describe("Include assignment statistics"),
  }),

  listGroups: z.object({
    includeMembers: z.boolean().default(true),
    includeStats: z.boolean().default(true),
  }),

  listRules: z.object({
    rulesetId: z.string().optional().describe("Filter by ruleset"),
    activeOnly: z.boolean().default(false),
  }),

  getAssignmentStats: z.object({
    timeframe: z.enum(["today", "week", "month", "all"]).default("week"),
    groupBy: z.enum(["user", "group", "rule"]).default("user"),
  }),

  // Navigation tools
  navigateTo: z.object({
    page: z.enum(["contacts", "users", "groups", "rules", "activity", "settings", "forms", "meetings"]),
    params: z.record(z.string(), z.string()).optional().describe("URL parameters"),
  }),

  // Confirmation tool - for actions that need user approval
  requestConfirmation: z.object({
    action: z.string().describe("Description of the action to confirm"),
    details: z.record(z.string(), z.any()).optional().describe("Details to show the user"),
    confirmButtonText: z.string().default("Confirm"),
    cancelButtonText: z.string().default("Cancel"),
  }),
};

// Tool definitions for Claude API
export const claudeTools = [
  // Contact tools
  {
    name: "createContact",
    description: "Create a new contact/lead in the system. Use this when the user asks to add a new contact.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Full name of the contact" },
        email: { type: "string", description: "Email address" },
        company: { type: "string", description: "Company name" },
        phone: { type: "string", description: "Phone number" },
        leadSource: { type: "string", description: "Where the lead came from (e.g., 'website', 'referral', 'linkedin')" },
        industry: { type: "string", description: "Industry sector" },
        companySize: { type: "string", description: "Company size (e.g., '1-10', '11-50', '51-200', '201-500', '500+')" },
        country: { type: "string", description: "Country" },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "updateContact",
    description: "Update an existing contact's information.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: { type: "string", description: "ID of the contact to update" },
        updates: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            company: { type: "string" },
            phone: { type: "string" },
            leadSource: { type: "string" },
            industry: { type: "string" },
            companySize: { type: "string" },
            country: { type: "string" },
          },
        },
      },
      required: ["contactId", "updates"],
    },
  },
  {
    name: "deleteContact",
    description: "Delete a contact from the system. Use with caution.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: { type: "string", description: "ID of the contact to delete" },
      },
      required: ["contactId"],
    },
  },
  // Assignment tools
  {
    name: "assignContact",
    description: "Assign a contact to a user or group. If no user is specified, uses round-robin assignment within the group.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: { type: "string", description: "ID of the contact to assign" },
        userId: { type: "string", description: "ID of the user to assign to (optional)" },
        groupId: { type: "string", description: "ID of the group to assign through" },
      },
      required: ["contactId"],
    },
  },
  {
    name: "reassignContact",
    description: "Reassign a contact from one user to another.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: { type: "string", description: "ID of the contact to reassign" },
        fromUserId: { type: "string", description: "ID of the current assignee" },
        toUserId: { type: "string", description: "ID of the new assignee" },
        reason: { type: "string", description: "Reason for reassignment" },
      },
      required: ["contactId", "fromUserId", "toUserId"],
    },
  },
  // Salesforce tools
  {
    name: "assignSalesforceOwner",
    description: "Assign a Salesforce Contact or Lead to a user by updating the Owner field in Salesforce. Use this to route leads to team members.",
    input_schema: {
      type: "object" as const,
      properties: {
        recordId: { type: "string", description: "Salesforce record ID (Contact or Lead)" },
        ownerId: { type: "string", description: "Salesforce user ID to assign as owner" },
      },
      required: ["recordId", "ownerId"],
    },
  },
  {
    name: "routeSalesforceRecord",
    description: "Route a Salesforce Contact or Lead through a round-robin group. This will automatically assign the record to the next available user in the group and update the Owner in Salesforce.",
    input_schema: {
      type: "object" as const,
      properties: {
        recordId: { type: "string", description: "Salesforce record ID (Contact or Lead) to route" },
        groupId: { type: "string", description: "ID of the round-robin group to route through" },
      },
      required: ["recordId", "groupId"],
    },
  },
  // Rule tools
  {
    name: "createRule",
    description: "Create a new routing rule that automatically assigns contacts matching certain conditions to a group.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name of the routing rule" },
        description: { type: "string", description: "Description of what the rule does" },
        groupId: { type: "string", description: "ID of the group to route matching contacts to" },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", description: "Field to match (e.g., 'leadSource', 'industry', 'companySize')" },
              operator: { type: "string", enum: ["equals", "notEquals", "contains", "notContains", "startsWith", "greaterThan", "lessThan", "isBlank", "isPresent"] },
              value: { type: "string", description: "Value to match against" },
            },
            required: ["field", "operator", "value"],
          },
          description: "Conditions that must match",
        },
        conditionLogic: { type: "string", enum: ["AND", "OR"], description: "How to combine conditions" },
      },
      required: ["name", "groupId", "conditions"],
    },
  },
  {
    name: "toggleRule",
    description: "Enable or disable a routing rule.",
    input_schema: {
      type: "object" as const,
      properties: {
        ruleId: { type: "string", description: "ID of the rule to toggle" },
        isActive: { type: "boolean", description: "Whether the rule should be active" },
      },
      required: ["ruleId", "isActive"],
    },
  },
  {
    name: "deleteRule",
    description: "Delete a routing rule.",
    input_schema: {
      type: "object" as const,
      properties: {
        ruleId: { type: "string", description: "ID of the rule to delete" },
      },
      required: ["ruleId"],
    },
  },
  // Group tools
  {
    name: "createGroup",
    description: "Create a new team/group for lead distribution.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name of the group" },
        description: { type: "string", description: "Description of the group" },
        distributionMode: { type: "string", enum: ["equal", "weighted"], description: "How to distribute leads" },
      },
      required: ["name"],
    },
  },
  {
    name: "addUserToGroup",
    description: "Add a user to a group/team.",
    input_schema: {
      type: "object" as const,
      properties: {
        groupId: { type: "string", description: "ID of the group" },
        userId: { type: "string", description: "ID of the user to add" },
        weight: { type: "number", description: "Weight for weighted distribution (optional)" },
      },
      required: ["groupId", "userId"],
    },
  },
  {
    name: "removeUserFromGroup",
    description: "Remove a user from a group/team.",
    input_schema: {
      type: "object" as const,
      properties: {
        groupId: { type: "string", description: "ID of the group" },
        userId: { type: "string", description: "ID of the user to remove" },
      },
      required: ["groupId", "userId"],
    },
  },
  // User tools
  {
    name: "createUser",
    description: "Create a new team member/user.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Full name" },
        email: { type: "string", description: "Email address" },
        dailyCapacity: { type: "number", description: "Max leads per day" },
        weeklyCapacity: { type: "number", description: "Max leads per week" },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "updateUser",
    description: "Update a user's information or capacity settings.",
    input_schema: {
      type: "object" as const,
      properties: {
        userId: { type: "string", description: "ID of the user" },
        updates: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            dailyCapacity: { type: "number" },
            weeklyCapacity: { type: "number" },
            isActive: { type: "boolean" },
          },
        },
      },
      required: ["userId", "updates"],
    },
  },
  // Query/Display tools
  {
    name: "listContacts",
    description: "List Salesforce contacts and leads with optional filtering. Returns data that will be displayed as a rich contact list UI. Data comes directly from Salesforce.",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: { type: "string", enum: ["all", "unassigned", "assigned", "recent"], description: "Filter type - 'unassigned' shows records with no Owner" },
        limit: { type: "number", description: "Max contacts to return" },
        search: { type: "string", description: "Search term for name/email/company" },
        recordType: { type: "string", enum: ["all", "contact", "lead"], description: "Type of Salesforce record to query" },
      },
    },
  },
  {
    name: "getContact",
    description: "Get detailed information about a specific contact. Returns data for a contact card UI.",
    input_schema: {
      type: "object" as const,
      properties: {
        contactId: { type: "string", description: "ID of the contact" },
      },
      required: ["contactId"],
    },
  },
  {
    name: "listUsers",
    description: "List team members with optional stats. Returns data for a user list UI.",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: { type: "string", enum: ["all", "active", "inactive"] },
        includeStats: { type: "boolean", description: "Include assignment statistics" },
      },
    },
  },
  {
    name: "listGroups",
    description: "List all groups/teams. Returns data for a group list UI.",
    input_schema: {
      type: "object" as const,
      properties: {
        includeMembers: { type: "boolean", description: "Include member details" },
        includeStats: { type: "boolean", description: "Include assignment stats" },
      },
    },
  },
  {
    name: "listRules",
    description: "List routing rules. Returns data for a rules list UI.",
    input_schema: {
      type: "object" as const,
      properties: {
        rulesetId: { type: "string", description: "Filter by ruleset" },
        activeOnly: { type: "boolean", description: "Only show active rules" },
      },
    },
  },
  {
    name: "getAssignmentStats",
    description: "Get assignment statistics and analytics. Returns data for charts and metrics UI.",
    input_schema: {
      type: "object" as const,
      properties: {
        timeframe: { type: "string", enum: ["today", "week", "month", "all"] },
        groupBy: { type: "string", enum: ["user", "group", "rule"] },
      },
    },
  },
  // Navigation tool
  {
    name: "navigateTo",
    description: "Navigate to a specific page in the application. Use when the user wants to go somewhere or see a specific view.",
    input_schema: {
      type: "object" as const,
      properties: {
        page: { type: "string", enum: ["contacts", "users", "groups", "rules", "activity", "settings", "forms", "meetings"] },
        params: { type: "object", description: "URL parameters (e.g., { id: 'abc123' })" },
      },
      required: ["page"],
    },
  },
  // Confirmation tool
  {
    name: "requestConfirmation",
    description: "Request user confirmation before performing a sensitive action. Use this for destructive operations like delete.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", description: "Description of what will happen" },
        details: { type: "object", description: "Details to show the user" },
        confirmButtonText: { type: "string" },
        cancelButtonText: { type: "string" },
      },
      required: ["action"],
    },
  },
];

// Tool categories for UI organization
export const toolCategories = {
  contacts: ["createContact", "updateContact", "deleteContact", "getContact", "listContacts"],
  assignments: ["assignContact", "reassignContact"],
  salesforce: ["assignSalesforceOwner", "routeSalesforceRecord"],
  rules: ["createRule", "toggleRule", "deleteRule", "listRules"],
  groups: ["createGroup", "addUserToGroup", "removeUserFromGroup", "listGroups"],
  users: ["createUser", "updateUser", "listUsers"],
  analytics: ["getAssignmentStats"],
  navigation: ["navigateTo"],
  system: ["requestConfirmation"],
};
