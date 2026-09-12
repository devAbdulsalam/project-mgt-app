# Ledge Desk

Ledge Desk is the web client for a ticketing and project management platform. It merges customer support tickets and internal project work into a single typed **Issue** model (task, bug, story, epic, sub-task, support request), so support agents and project teams work in one tool with shared workflows, SLAs, and reporting.

This repository contains the **front end only**. It currently runs against an in-browser mock database with seeded demo data, so you can explore every screen without a backend.

## Features

- **Authentication and onboarding**: email + OTP sign-in, forgot/reset password, four-step workspace signup (account, verify, workspace, invite team), organisation switcher for multi-org users.
- **Dashboard**: KPI cards, ticket volume chart, SLA donut, needs-attention list, date range filters (today / 7 / 30 / 90 days), CSV export.
- **My Work**: assigned / mentioned / watching / created tabs with J / K / Enter / A keyboard navigation.
- **Tickets**: status tabs with counts, search and filter chips, sort, saved views, table and card layouts, pagination, bulk assign / status / priority, CSV export.
- **Ticket detail**: side panel on desktop and full page on mobile. Inline editing, workflow-driven status transitions, assign, log time, watch, labels, sub-tasks, linked issues, client replies and internal notes with @mentions, activity feed, attachments.
- **Create ticket**: templates, type-driven fields, duplicate detection, suggested assignee, SLA policy, attachments, draft autosave.
- **Projects**: directory (cards / table, star, archive), overview (KPIs, epics, burndown, status donut, team), scoped list, Kanban board with drag-and-drop and WIP limits.
- **Notifications**: filters, mark read, SLA escalate / snooze, delivery preferences, browser push opt-in, bell popover.
- **Team**: member directory, member panel (role, teams, capacity), invite dialog, deactivate / reactivate, roles matrix.
- **Command palette** (`⌘K` / `Ctrl+K`): navigation, ticket search, contextual actions, and query syntax such as `status:open assignee:me priority>=high`.
- **Boards**: one card per project board with live column counts and quick open.
- **Clients**: account list with KPIs, filters, sort and CSV export; add client; client detail with overview, tickets, sites and contacts, assets, editable contract and SLA, invoices (remind, mark paid), visits and notes.
- **Assets**: inventory with type tabs, filters and search; detail panel with QR label, history, inline edit and firmware updates; add asset, CSV import, print labels, raise a ticket from an asset.
- **Visits**: dispatch board with unscheduled queue, drag-onto-engineer scheduling, auto-route, map pins, visit checkpoints, parts approval, reassign, schedule dialog and week view.
- **Knowledge base**: categories, search, public / internal / draft filter, create, edit, publish and delete articles, helpful votes, related articles.
- **Reports**: service desk and projects reports with date range, client and region filters, compare toggle, CSV export and monthly scheduling.
- **Settings**: 18 sections (general, branding, team and roles, billing, security and SSO, audit log, channels, SLA policies, ticket types, business hours, automation, CSAT, contract plans, invoicing, client portal, integrations, API keys and webhooks, NDPR export) with saved state.
- **Responsive**: collapsible sidebar and top bar on desktop; app bar, drawer, and bottom tab bar on mobile.

The only placeholder left is the mobile Profile tab (`/:org/me`).

## Tech stack

| Concern | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), React Compiler |
| Build | Vite 8 (Rolldown) |
| Styling | Tailwind CSS v4, design tokens in `src/styles/tokens.css` |
| Routing | TanStack Router (code-based route tree in `src/app/router.tsx`) |
| Data | TanStack Query, Zustand |
| Forms | React Hook Form + Zod |
| Icons and charts | Lucide React, Recharts |
| Lint | ESLint with typescript-eslint, react-hooks, react-refresh |

## Prerequisites

- **Node.js 20.19 or newer** (or 22.12+). Vite 8 does not support older versions. Check with `node -v`.
- **npm 10 or newer** (ships with Node). The project uses `package-lock.json`, so npm is the supported package manager.
- **Git**, if you are cloning the repository.

To install Node.js, use the official installer from [nodejs.org](https://nodejs.org) or a version manager:

```bash
# nvm (macOS / Linux)
nvm install 22
nvm use 22
```

## Installation

1. **Clone the repository** (or download and extract the source).

   ```bash
   git clone <repository-url> ledge-desk
   cd ledge-desk
   ```

2. **Install dependencies.**

   ```bash
   npm install
   ```

   Use `npm ci` instead for a clean, lockfile-exact install (recommended in CI).

3. **Start the development server.**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser. The dev server supports hot module replacement, so edits show up instantly.

No environment variables or `.env` file are required. The app runs entirely on mock data.

## Demo sign-in

Use any of the seeded accounts below on the login page:

| Email | Password | OTP code |
| --- | --- | --- |
| `adaeze@kolanutsystems.ng` | `password` | `482913` |
| `chinedu.eze@kolanutsystems.ng` | `password` | `482913` |
| `amr.hassan@alrashidi.ae` | `password` | `482913` |

The account `amr.hassan@alrashidi.ae` belongs to two organisations and shows the org switcher. The full list of demo users lives in `src/mocks/data.ts` and `src/mocks/seed.ts`.

**Dev-only shortcuts** (disabled in production builds) skip the login flow:

- `/dev/login-as` signs in as the default demo user.
- `/dev/login-as?stage=otp` lands on the OTP step.
- `/dev/login-as?stage=verify|workspace|team` lands on a given signup step.
- `/dev/login-as?email=<address>&to=/kolanut/tickets` signs in as a specific user and redirects.

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check with `tsc -b`, then produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally for a final check. |
| `npm run lint` | Run ESLint across the project. |

## Production build and deployment

```bash
npm run build
npm run preview   # optional: serve dist/ at http://localhost:4173
```

The output in `dist/` is a static single-page app. Deploy it to any static host. Because routing is client-side, the host must rewrite all paths to `index.html`. A `vercel.json` with that rewrite rule is included, so deploying to Vercel works out of the box:

```bash
npx vercel
```

For other hosts (Netlify, Cloudflare Pages, nginx, S3 + CloudFront), configure an equivalent catch-all rewrite to `/index.html`.

## How data and state work

There is no backend yet. All state lives in a Zustand mock database (`src/mocks/db.ts`):

- The database is persisted to `sessionStorage` under `ledgedesk.db`, so your edits survive a reload but reset when the tab closes.
- The session is stored under `ledgedesk.session`.
- UI preferences (sidebar state, view modes) are stored in `localStorage` under `ledgedesk.ui`.

To reset all demo data, close the tab or clear site storage in your browser dev tools.

## Project structure

```
src/
├─ app/            App root and router
├─ features/       One folder per feature: auth, dashboard, inbox, tickets, projects, boards,
│                  clients, assets, visits, kb, reports, settings, notifications, team, search
├─ shared/
│  ├─ layouts/     AuthShell, AppShell (sidebar + top bar on desktop; drawer + tab bar on mobile)
│  ├─ ui/          Button, Field, Input, Select, Pill, Avatar, Dialog, Tabs, Toaster, ...
│  └─ lib/         auth-store, ui-store, palette-store, toast-store, time, csv, format
├─ mocks/          types.ts (domain model), seed.ts + seed-ops.ts (demo data), db.ts (Zustand store), data.ts (dashboard series)
└─ styles/         tokens.css (Tailwind theme and base styles)
```

The `@` import alias points at `src/`.

## Troubleshooting

- **`npm install` fails or Vite refuses to start**: confirm your Node version is 20.19+ or 22.12+ with `node -v`, then delete `node_modules` and run `npm install` again.
- **Blank page after refresh on a deployed build**: the host is not rewriting deep links to `index.html`. Add a catch-all rewrite (see the deployment section).
- **Demo data looks broken**: open browser dev tools, clear `sessionStorage` and `localStorage` for the site, and reload.
- **Port 5173 already in use**: run `npm run dev -- --port 3000` to choose another port.

## Contributing

1. Create a branch for your change.
2. Run `npm run lint` and `npm run build` before opening a pull request. The build step also runs the TypeScript checker.
3. Keep new pages inside `src/features/<feature>/` and shared primitives inside `src/shared/`.
