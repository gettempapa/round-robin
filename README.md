# RoundRobin - Lead Routing Made Simple

A lightweight, modern lead routing and round robin distribution tool designed for RevOps teams. Built with Next.js, TypeScript, Prisma, and shadcn/ui.

## Features

### Core Functionality

- **User Management** - Add and manage team members with status controls (active/paused) and optional capacity limits
- **Round Robin Groups** - Create distribution groups with equal or weighted routing modes
- **Contact Management** - Add contacts with standard CRM fields (name, email, company, job title, lead source, etc.)
- **Visual Rules Engine** - No-code rule builder for automatic contact routing based on conditions
- **Auto-Routing** - Contacts are automatically routed when created based on active rules
- **Manual Routing** - Override automation and manually assign contacts to groups
- **Activity Log** - Track all routing assignments and distribution history
- **Real-time Dashboard** - Monitor stats, distribution fairness, and system health

### Key Highlights

- **Modern UI** - Clean, fast interface built with shadcn/ui components
- **Fair Distribution** - Smart round robin algorithm respects user capacity and status
- **Flexible Rules** - Support for multiple conditions with AND logic
- **Ready for Salesforce** - Architecture designed for easy CRM integration

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: TailwindCSS, shadcn/ui
- **Database**: SQLite (via Prisma ORM)
- **Icons**: Lucide React
- **Forms**: React Hook Form, Zod
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

The project is already set up! Just run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### First Time Setup

1. **Add Users** - Navigate to Users and create your team members
2. **Create Groups** - Go to Groups and set up round robin distribution groups
3. **Add Members** - Assign users to groups
4. **Create Rules** - Build routing rules in the Rules page
5. **Add Contacts** - Create contacts and watch them auto-route based on your rules!

## How It Works

### Automatic Routing Flow

1. Contact is created with details (lead source, industry, company size, etc.)
2. Rules engine evaluates all active rules in priority order
3. First matching rule triggers assignment to its associated group
4. Round robin algorithm selects the next user in the group (fair distribution)
5. Assignment is logged in the Activity feed

### Manual Routing

- RevOps can manually route any contact to any group
- Useful for override scenarios or when no rules match
- Manual assignments are tracked separately in activity log

### Distribution Modes

- **Equal**: Strict round robin - each member gets equal number of leads
- **Weighted**: Distribution based on member weight (e.g., 2x weight gets 2x leads)

## Database Schema

- **User** - Team members who receive routed contacts
- **RoundRobinGroup** - Distribution groups with members
- **GroupMember** - Junction table for user-group relationships
- **Contact** - Leads/contacts to be routed
- **Rule** - Routing rules with conditions
- **Assignment** - Record of contact-to-user assignments

## Future Enhancements

Ready to integrate with Salesforce:
- Bi-directional sync for users, contacts, and assignments
- Field mapping for custom SFDC fields
- Webhook triggers for real-time routing
- OAuth authentication

## Project Structure

```
/app
  /api              # API routes for CRUD operations
  /users            # User management page
  /groups           # Round robin groups page
  /contacts         # Contact management page
  /rules            # Rules engine page
  /activity         # Activity log page
/components
  /ui               # shadcn/ui components
  sidebar.tsx       # App navigation
  dashboard-layout.tsx
/lib
  db.ts             # Prisma client
  routing-engine.ts # Auto-routing logic
/prisma
  schema.prisma     # Database schema
```

## Development

```bash
# Run development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma db push --force-reset
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

MIT
