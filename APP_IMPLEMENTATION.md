# Merchant Nation Command - App Concepts & Implementation

## Purpose
Merchant Nation Command is a Next.js (App Router) application that manages field operations across branch “territories”.

The UI has two broad modes:
- Field operations for authenticated branch staff/players (territory map, scouting, induction, missions).
- Admin views for operational administration (branches, ranks, zones, operational summary, reports, teams, and users).

The key implementation goal of this codebase is to keep “frontend” code (React client components and server components/pages) cleanly separated from “backend” code (authorization, business logic, Prisma data access), while still living in a single Next.js repository.

## Core Tech Stack
- Next.js 16.1.6 (App Router)
- TypeScript (strict)
- Prisma (PostgreSQL)
- React Server Components and Client Components
- Next.js Server Actions (`"use server"`)

Important conventions used across the app:
- UI components must not import Prisma directly (enforced by ESLint `no-restricted-imports`).
- Backend logic performs authorization and all Prisma access.
- Server actions are intentionally thin wrappers that delegate to backend services.

## Repository Organization (Single Repo, Logical Separation)

### TypeScript path aliases
Defined in `tsconfig.json`:
- `@/*` -> `src/*`
- `@backend/*` -> `src/backend/*`
- `@shared/*` -> `src/shared/*`

These aliases are used to make the separation explicit in imports.

### Backend layer
The “backend” layer lives under `src/backend/`:
- `src/backend/services/*`
  - Business logic, orchestration, authorization, input validation decisions, and calling repositories.
- `src/backend/repositories/*`
  - Direct Prisma queries/updates; repositories should be the only place Prisma is used besides `src/lib/prisma.ts`.

### Frontend layer
The “frontend” layer lives under `src/app` and `src/components`:
- `src/app/*`
  - Route entry points (`page.tsx`) and server actions (`src/app/actions/*.ts`).
- `src/components/*`
  - Client components for the UI, dashboards, map drawers, forms, and other interactive views.

## Prisma and the Data Model

### Prisma client
`src/lib/prisma.ts` exports a singleton `prisma` client:
- In development it uses `globalThis` to prevent multiple Prisma clients in hot reload.
- In production it creates a new Prisma client instance.

### Prisma schema summary
The Prisma schema is in `prisma/schema.prisma`.

Key parts of the data model relevant to app behavior:
- Authentication and identity
  - `User` includes `role` (enum `Role`), `branchId`, `teamId`, `passwordHash`, and gameplay metrics (`xp`, `rank`).
- Branch structure
  - `Branch` holds branch metadata and relations to `User`, `Team`, `Zone`, `Mission`, and `TerritoryCell`.
  - `Team` optionally belongs to a branch and groups players.
- Territory and operations
  - `TerritoryCell` ties a polygon/rectangle grid cell to a `Branch` and has a `status` of type `ZoneStatus`.
  - `Zone` models an area with a polygon and optional owner relationships.
  - `Lead` is the scouting input tied to a `Zone` and includes `externalBankIds` and a `status`.
  - `Merchant` is the converted/inducted entity created from leads.
- Missions workflow
  - `Mission` groups tasks and goals.
  - `MissionGoal` stores targets and due dates.
  - `MissionTask` is assigned to staff with a `MissionTaskStatus`, plus optional `taskReportLeads`.
- Operations observability
  - `ActivityLog` records auditable actions for admin reporting.
  - `Notification` is delivered to users and optionally tied to mission/mission-task or branch context.

## Auth: JWT Cookie Session and Authorization Checks

### Session token and roles
Authentication is implemented in `src/lib/auth.ts`.

Conceptually:
- A login flow validates credentials and generates a JWT using `createToken()`.
- The JWT is stored in an httpOnly cookie named `mn_token`.
- Each server action or backend service calls `authorize(requiredRoles, actionName)` to:
  - Load the cookie-based session (`getServerAuthSession()` -> `verifyToken()`).
  - Enforce required roles.

Key files:
- `src/lib/auth.ts`
  - `Role`, `AuthSession`, `createToken`, `verifyToken`, `getServerAuthSession`
  - `authorize(requiredRoles, actionName)`
- `src/backend/services/auth-service.ts`
  - Implements business logic for login and password changes
  - Uses repositories and `activity-log-service`
- `src/app/actions/auth.ts`
  - Server-action wrapper around auth-service
  - Sets/updates the cookie and redirects on role-specific outcomes

### Auth-service flow (implementation)
`src/backend/services/auth-service.ts` implements:
- `loginWithPassword(email, password)`
  - Calls `getUserByEmail()` from `src/backend/repositories/user-repository.ts`
  - Verifies password using `verifyPassword()` from `src/lib/auth.ts`
  - Creates JWT using `createToken()`
  - Records `ActivityLog` with action `"LOGIN"`
- `changePassword(session, { currentPassword, newPassword })`
  - Validates current password
  - Enforces minimum password length (6 chars)
  - Updates hash via `updateUserPassword()`
  - Creates a refreshed JWT and records `"PASSWORD_CHANGE"`

### Server action wrapper and cookie set
`src/app/actions/auth.ts`:
- Calls the auth-service functions.
- Sets the cookie with:
  - `httpOnly: true`
  - `sameSite: "lax"`
  - `secure: NODE_ENV === "production"`
  - `maxAge: IDLE_TIMEOUT_SECONDS`

## Activity Logging (Observability and Admin Reports)

### How ActivityLog is recorded
The shared contract is implemented via:
- Server-action wrapper: `src/app/actions/activity-log.ts`
- Backend service: `src/backend/services/activity-log-service.ts`
- Backend repository: `src/backend/repositories/activity-log-repository.ts`

Implementation details:
- `activity-log-service.ts` exposes:
  - `logActivity(session, actorName, action, options)`
  - `getActivityLog(filters)`
- `activity-log-repository.ts` exposes:
  - `createActivityLog(params)`
  - query helpers for admin filtering and pagination:
    - `getBranchStaffIds(branchId)`
    - `findActivityLogEntries(where, orderBy, take, skip)`
    - `countActivityLogEntries(where)`

### Server action wrapper usage
Server actions and backend services call logging after mutations.
For example:
- Login and password change record `"LOGIN"` and `"PASSWORD_CHANGE"`.
- Mission and merchant updates record `"MISSION_CREATE"`, `"MISSION_TASK_UPDATE_STATUS"`, `"MERCHANT_UPDATE"`, etc. (exact actions depend on service).

## Server Actions as Thin Wrappers

The refactor pattern used throughout this app is:
- `src/app/actions/*.ts`:
  - Must include `"use server"`
  - Exports types and functions expected by UI code
  - Delegates to `src/backend/services/*`
- `src/backend/services/*.ts`:
  - Calls `authorize()` and all repositories

Examples of wrapper-only action files (current state):
- `src/app/actions/auth.ts` delegates login/password change and owns cookie/redirect behavior.
- `src/app/actions/activity-log.ts` delegates all logging queries and writes.
- `src/app/actions/operational-summary.ts`, `src/app/actions/mission.ts`, `src/app/actions/users.ts`, `src/app/actions/merchants.ts`
  - are wrapper-only around backend services after the `batch4-complex` refactor.

Why this matters:
- Next’s server action bundling has stricter constraints than normal module compilation.
- Keeping exported types/functions in the action module avoids static analysis issues.
- Keeping Prisma usage out of action/UI modules avoids circular dependencies and enforces boundary rules.

## Operational Summary and Admin Dashboard

### Routing
Admin route:
- `src/app/admin/operational-summary/page.tsx`
  - Validates session roles (`ADMIN` or `BRANCH_MANAGER`)
  - Renders the client component `OperationalSummaryClient`

### Data fetch and computation
The actual aggregation logic is in:
- `src/backend/services/operational-summary-service.ts`

It implements `getOperationalSummary(filters)` which returns:
- Branch list (id and name)
- Active scout categories list (name and displayName)
- Per-branch counts for:
  - Missions by status (`missionsByBranch`)
  - Tasks by branch and mission-task status (`tasksByBranchAndStatus`)
  - Merchants by branch (`merchantsByBranch`)
  - Leads grouped by branch, category, and status (`leadsByBranch`)
  - External bank usage usage counts (`externalBankUsageByBranch`)
  - Territory cell health (`territoryHealthByBranch`)
  - Deployment assets counts (`deploymentAssetsByBranch`)
  - Daily report counts (`dailyReportCountsByBranch`)
  - Activity logs grouped by action and branch (`activityCountsByAction`, `activityCountsByBranchAndAction`)

### Wrapper action
`src/app/actions/operational-summary.ts`:
- Defines exported row types and `OperationalSummaryResult` so UI can type safely.
- Delegates to `operational-summary-service.getOperationalSummary(filters)`.

### UI rendering
`src/app/admin/operational-summary/OperationalSummaryClient.tsx`:
- Uses the server action results to populate charts and tables.
- Uses router refresh and state to handle filters (branchId/fromDate/toDate/category).

## Home Page and Field Operations Flow

### Routing and server rendering
The Home page is:
- `src/app/page.tsx`

Implementation flow:
- Reads `getServerAuthSession()` from `src/lib/auth.ts`.
- Redirects to `/login` if session is missing.
- Loads:
  - Current user (`getCurrentUser(session.id)`)
  - Rank configuration (`getRanks()`)
  - Operational stats for dashboard:
    - `getTerritoryDashboardStats(branchIdForStatsAndMap)`
  - Leaderboard:
    - `getLeaderboardForDashboard(5, user.id, scopedBranchId)`
  - Profile stats:
    - `getProfileStats(user.id, { branchId, role })`
  - Territory map data for non-admin:
    - `getBranchTerritoryForMember()` and `getTerritoryCellsForMember()`
  - Territory map data for admin:
    - `getAllBranchTerritoriesForAdmin()`

Then it renders the client UI:
- `src/components/territory/TerritoryDashboard.tsx`

### UI component responsibilities
`TerritoryDashboard` is a client component (`"use client"`) that:
- Shows top navigation (profile link, notifications link)
- Shows dashboard stat cards using server-provided props
- Renders the map with `MapScreen`
- Sets edit mode callbacks:
  - `saveBranchTerritory()` and `updateTerritoryCell()` are server actions invoked from client UI

### Map screen interaction model
The territory map interaction is handled by client components under `src/components/map/`.

Representative file:
- `src/components/map/MapViewClient.tsx`

Responsibilities:
- Render zone polygons on a map (Leaflet + React Leaflet)
- Track selected zone/cell and open drawers
- Trigger server actions on user interactions:
  - `getZones`, `updateZoneStatus` (from `src/app/actions/zones.ts`)
  - map pin actions (`getMapPins`, `getMerchantDetail`, etc.)
  - scouting form submission triggers create-lead and map refresh (via `router.refresh()` or direct state refetch)

## Missions and Tasks (Backend Service + Server Action)

### Routing
Missions route:
- `src/app/missions/page.tsx`

It:
- Validates session.
- Determines `branchIdFromUrl` based on role:
  - Admin can filter by branchId query param
  - Branch managers/players are scoped
- Calls server actions to load:
  - `getMissions({ branchId, limit, offset })`
  - `getMyTasks()`
  - pending approvals for branch manager/admin
  - `getMyScoutedAndRegistered()` for staff players
- Renders `MissionsClient` with loaded data.

Task detail pages:
- `src/app/missions/[id]/page.tsx`
- `src/app/missions/task/[taskId]/page.tsx`

### Implementation after separation
Server action exports are now wrappers only:
- `src/app/actions/mission.ts` delegates to:
  - `src/backend/services/mission-service.ts`

The mission-service implements all Prisma interaction and authorization for:
- Mission creation and retrieval (scoped access rules)
- Mission goals CRUD
- Mission tasks creation and status updates
- “My tasks” and “My scouted/registered” queries
- Pending approvals listing

## Merchants and Induction

### Routing
Merchants route:
- `src/app/merchants/page.tsx`

It:
- Validates session
- Derives branch scoping
- If role is admin it redirects to admin merchants list
- Otherwise renders `StaffMerchantsClient`.

### Implementation after separation
Like missions, server actions for merchants now delegate to backend services:
- `src/app/actions/merchants.ts` delegates to `src/backend/services/merchants-service.ts`

Merchant service responsibilities include:
- KYC/product step:
  - `updateMerchantProductsAndKYC(input)`
- Induction completion:
  - `completeInduction({ leadId, oathSignatureUrl })`
- One-shot induction:
  - `inductMerchant(input)` which chains the two steps
- List merchants by branch:
  - `getMerchantsByBranch(filters)`
- Read detailed merchant view:
  - `getMerchantDetail(merchantId)`
- Update merchant details:
  - `updateMerchantDetails(merchantId, data)`
- Mark merchant deployment assets as onboarded:
  - `setDeploymentAssetOnboarded(merchantId, deploymentAssetId, onboarded)`

### Activity logging
The merchants service logs relevant actions using `logActivity()` from `activity-log-service`.

## Users and Admin Management

### Routing
User admin route:
- `src/app/admin/users/page.tsx`

It renders a client component that:
- calls server actions for:
  - `getUsersForAdmin()`
  - `getTeamsForAdmin()`
  - `getBranchesForAdmin()`
- supports creation and updates:
  - `createUser()`
  - `updateUserRole()`
  - `updateUser()`
  - `resetUserPassword()`

### Implementation after separation
Server actions delegate to backend users service:
- `src/app/actions/users.ts` delegates to:
  - `src/backend/services/users-service.ts`

The users service implements:
- User queries and leaderboard/profile stats
- Admin user listing with filtering (branchIdFilter)
- User creation with role-specific branch resolution logic:
  - Branch managers can create only PLAYER users, in their assigned branch.
  - Admins can create ADMIN and BRANCH_MANAGER users.
- Updating roles and branch/team changes accordingly.
- Resetting passwords with authorization constraints.

## Zones, Territory, Leads, Pins (Interaction and Mutation Pattern)

Even where server actions have not been migrated into backend services in the same way as mission/users/merchants, the general pattern remains:
- UI client components call server actions.
- Server actions call Prisma or delegate to backend services.
- UI updates via:
  - `router.refresh()`
  - refetch patterns

Representative examples:
- Map cells and zone updates:
  - client code calls `updateZoneStatus` from `src/app/actions/zones.ts`
- Territory boundary editing:
  - client code calls `saveBranchTerritory` and `updateTerritoryCell` from `src/app/actions/branch-territory.ts`
- Scouting form submission:
  - `ScoutReportForm` submits `createLead()` (from `src/app/actions/leads.ts`)
  - then it triggers UI refresh to show updated pins and statuses.

## ESLint Boundary Guardrails

The project config includes a guardrail in `eslint.config.mjs`:
- For files under `src/components/**/*.ts(x)`:
  - `no-restricted-imports` blocks imports of `@/lib/prisma`

This enforces the rule:
- UI never imports Prisma directly.
- Prisma is only imported from backend repositories or backend services where needed.

## How to Add New Features (Implementation Guidance)

When adding a new domain feature (for example, “Reports for feature X”), follow this workflow:

1. Identify the domain and where it belongs
   - Pure business orchestration and authorization -> `src/backend/services/*`
   - Direct Prisma reads/writes -> `src/backend/repositories/*`
   - UI invocation -> `src/app/actions/*.ts` (server action wrapper) and `src/components/*` (client components)

2. Add repository functions first
   - Keep them small and Prisma-focused.
   - Export input/output types that your service will re-use.

3. Add a service function that calls `authorize()`
   - Perform permission checks early.
   - Orchestrate repository calls.
   - Call `activity-log-service.logActivity()` after mutations that need auditability.

4. Add/Update server action wrapper
   - Export the functions and types that UI already expects.
   - Make the wrapper delegate directly to the service.

5. Update UI client components
   - Call server actions and refresh the data.

## Current State and What’s Fully Separated

This document focuses on the separation approach and the parts that have been refactored with thin wrapper server actions.

Fully delegated (wrapper-only) after the most recent separation work:
- `src/app/actions/operational-summary.ts` -> `src/backend/services/operational-summary-service.ts`
- `src/app/actions/mission.ts` -> `src/backend/services/mission-service.ts`
- `src/app/actions/users.ts` -> `src/backend/services/users-service.ts`
- `src/app/actions/merchants.ts` -> `src/backend/services/merchants-service.ts`
- `src/app/actions/activity-log.ts` -> `src/backend/services/activity-log-service.ts`

Other domains follow the same architectural direction, but may still contain older patterns depending on which batch they were refactored in.

## Developer Notes

### Build-time Next warnings
`next.config.ts` includes a `serverActions` configuration that may not be typed by the installed Next version.
The file currently relies on runtime acceptance and bypasses type-checking.

### Lint failures
The repository has existing eslint failures unrelated to this separation work (for example `react-hooks/set-state-in-effect` in multiple components, and `prisma/seed.js` `require()` rules).
These are separate from the architectural migration.

