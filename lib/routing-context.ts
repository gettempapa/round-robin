export type RoutingField = {
  value: string;
  label: string;
  description: string;
  examples?: string[];
  previewable?: boolean;
};

export const ROUTING_FIELDS: RoutingField[] = [
  {
    value: "leadSource",
    label: "Lead Source",
    description: "Where the record originated",
    examples: ["Website", "Partner", "Google Ads"],
    previewable: true,
  },
  {
    value: "leadStatus",
    label: "Lead Status",
    description: "Stage of the lead lifecycle",
    examples: ["New", "Working", "Qualified"],
  },
  {
    value: "lifecycleStage",
    label: "Lifecycle Stage",
    description: "Unified lifecycle stage across records",
    examples: ["MQL", "SQL", "Customer"],
  },
  {
    value: "campaign",
    label: "Campaign",
    description: "Campaign name or initiative",
    examples: ["Q1 Enterprise", "Webinar"],
  },
  {
    value: "inboundChannel",
    label: "Inbound Channel",
    description: "Top-level acquisition channel",
    examples: ["Paid Search", "Organic", "Events"],
  },
  {
    value: "industry",
    label: "Industry",
    description: "Company industry",
    examples: ["Healthcare", "Fintech"],
    previewable: true,
  },
  {
    value: "company",
    label: "Company",
    description: "Company or account name",
    examples: ["Acme Corp"],
    previewable: true,
  },
  {
    value: "companyDomain",
    label: "Company Domain",
    description: "Email or website domain",
    examples: ["acme.com"],
  },
  {
    value: "companySize",
    label: "Company Size",
    description: "Size segment or band",
    examples: ["Enterprise", "SMB"],
    previewable: true,
  },
  {
    value: "employeeCount",
    label: "Employee Count",
    description: "Approximate employee count",
    examples: ["500", "1000+"],
  },
  {
    value: "annualRevenue",
    label: "Annual Revenue",
    description: "Revenue band",
    examples: ["$10M-$50M"],
  },
  {
    value: "accountTier",
    label: "Account Tier",
    description: "Strategic tiering",
    examples: ["Tier 1", "Tier 2"],
  },
  {
    value: "region",
    label: "Region",
    description: "Region grouping",
    examples: ["NA", "EMEA", "APAC"],
  },
  {
    value: "country",
    label: "Country",
    description: "Country",
    examples: ["United States", "Germany"],
    previewable: true,
  },
  {
    value: "state",
    label: "State / Province",
    description: "State or province",
    examples: ["CA", "NY"],
  },
  {
    value: "city",
    label: "City",
    description: "City",
    examples: ["Austin", "London"],
  },
  {
    value: "email",
    label: "Email",
    description: "Email address",
    examples: ["alex@acme.com"],
    previewable: true,
  },
  {
    value: "jobTitle",
    label: "Job Title",
    description: "Job title",
    examples: ["VP Sales", "RevOps Lead"],
    previewable: true,
  },
  {
    value: "department",
    label: "Department",
    description: "Department",
    examples: ["Sales", "Marketing"],
  },
  {
    value: "productInterest",
    label: "Product Interest",
    description: "Product or package interest",
    examples: ["Platform", "Enterprise"],
  },
];

export const ROUTING_FIELD_LABELS = ROUTING_FIELDS.reduce<Record<string, string>>(
  (acc, field) => {
    acc[field.value] = field.label;
    return acc;
  },
  {}
);

export function getRoutingFieldLabel(value: string) {
  return ROUTING_FIELD_LABELS[value] || value;
}

export const PREVIEWABLE_FIELDS = new Set(
  ROUTING_FIELDS.filter((field) => field.previewable).map((field) => field.value)
);
