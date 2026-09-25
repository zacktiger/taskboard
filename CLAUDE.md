# Project Manager (multi-tenant SaaS)

A multi-tenant project manager: **org → team → project → task**, with a Kanban board.
Built solo by a student, so the audience for every file is a student reading it.

## Guiding rule: keep it simple

- Simple code and simple architecture beat clever or "enterprise" patterns.
- Every piece should be easy to explain in an interview in one or two sentences.
- Prefer one obvious way of doing things. No extra layers, abstractions, or libraries
  unless they clearly earn their place.
- Small functions with readable names. Every file starts with a short comment saying what it
  is for; every exported function gets a one-line comment. Inside functions, comment only the
  non-obvious "why".
- Don't add features beyond the design below without asking.

## Stack

- **Backend:** Node + Express (JavaScript, ES modules), Prisma ORM, PostgreSQL.
- **Frontend:** React + Vite (JavaScript), React Router, Tailwind CSS,
  `@hello-pangea/dnd` for drag-and-drop. Server state lives in plain `useState` + a small
  `fetch` wrapper — no Redux/Zustand/TanStack Query.
- **Auth:** `jsonwebtoken` for access tokens, `bcryptjs` for passwords (pure JS, no native
  build on Windows), Node `crypto` for refresh/invite tokens.
- Express 5, so errors thrown in async handlers reach the error handler without wrappers.
- Prisma is pinned to v6 (v7 changes the client setup).
- UI: simple but sleek — neutral palette, one accent colour, generous spacing, rounded cards.

## Layout

```
backend/
  prisma/schema.prisma      # the whole data model
  prisma/seed.js            # demo data: Acme (admin/member/viewer) + Globex (isolation check)
  src/index.js              # starts the server
  src/app.js                # express app: parsers + route mounting + error handler
  src/config/               # db.js (Prisma client), permissions.js (who can do what)
  src/routes/               # xxxRoutes.js — ONLY the URL list: method + path + middleware + controller
  src/controllers/          # xxxController.js — what each endpoint does (validate, query, respond)
  src/middleware/           # authMiddleware.js: requireAuth, requirePermission
  src/utils/                # errors, validate, tokens, session, tenant lookups, activity logger
frontend/
  src/pages/                # one component per screen (LoginPage, BoardPage, ...)
  src/components/           # reusable UI: ui.jsx, Layout, AuthLayout, RouteGuards
  src/context/              # AuthContext — the logged-in user for the whole app
  src/hooks/                # useApi — load data for a page
  src/services/             # api.js — fetch wrapper: attaches access token, refreshes once on 401
  src/utils/                # board.js (Kanban helpers), permissions.js (copy of the backend map)
```

A request flows: `app.js` → `routes/` → middleware → `controllers/` → Prisma.
Two layers only (routes + controllers) — no services/repositories. Private helpers used by
one controller live at the bottom of that controller file.

## Domain model

- **Organization** is the tenant.
- **Team** belongs to an org and groups users. **Project** belongs to a team.
  Teams organize work; they do **not** restrict access (roles are org-level only).
  **Task** belongs to a project. These are the 4 tenant layers: org → team → project → task.
- **User** joins an org through `OrgMember (userId, orgId, role)`.
- Every tenant-owned table (`Team`, `Project`, `Task`, `Invitation`, `Activity`) stores
  `orgId` directly, even when it could be derived through a parent — so every query can
  filter on it without joins.
- v1: one org per user (registering creates an org; accepting an invite joins one).
  The schema allows more, but don't build org switching unless asked.

## Multi-tenancy rules

- Every query is scoped by `req.user.orgId`. Never look anything up by `id` alone.
- Tenant lookups go through helpers in `src/utils/tenant.js`
  (e.g. `findProjectInOrg(orgId, projectId)`) — there is no unscoped variant.
- A record in another org, or a soft-deleted record, returns **404, not 403**,
  so the API never reveals that it exists.

## Authentication

- **Access token:** short-lived JWT (15 min) holding `userId` and `orgId`, sent as
  `Authorization: Bearer`. The frontend keeps it in memory only.
- **Refresh token:** random 32 bytes, sent as an `httpOnly` cookie, stored in the DB
  **only as a SHA-256 hash**. Single-use: every refresh revokes the old token and issues a
  new one.
- **Reuse detection:** if a refresh token that was already used is presented again, assume
  it was stolen and revoke **all** of that user's refresh tokens (logs out every session).

## RBAC — 3 org-level roles only

- Roles: `ADMIN`, `MEMBER`, `VIEWER`, stored on `OrgMember.role`.
  - VIEWER: read everything in the org.
  - MEMBER: + create/edit/move/delete tasks and projects.
  - ADMIN: + teams, invitations, member roles, member removal.
- The role is **re-read from the database on every request** in `requireAuth` — never
  trusted from the JWT — so a demotion or removal takes effect immediately.
- All checks go through one place: `src/config/permissions.js` (a map of action → allowed roles)
  and the `requirePermission(action)` middleware. No inline role checks in handlers.
- The frontend mirrors this with React Router guards (`RequireAuth`, `RequirePermission`, `GuestOnly`) and by
  hiding buttons. That is UX only — the server is the real check.
- An org must always keep at least one ADMIN (can't demote or remove the last one).

### Optional future extension (not built yet)

Project-level roles, e.g. Viewer in the org but Member on one project: add
`ProjectMember (userId, projectId, role)`; if present it **overrides** the org role for that
project. Only build this if explicitly asked.

## Features

- **Kanban:** columns `TODO`, `IN_PROGRESS`, `DONE`; each task has an integer `position`
  within its column and a `priority` (`LOW`, `MEDIUM` default, `HIGH`) shown as a badge. Moving a task rewrites positions in one `prisma.$transaction`.
  The UI updates optimistically and rolls back if the request fails.
  (Known limitation: reordering shifts every task below — O(n). Fractional indexing would fix
  it; not worth it here.)
- **Soft deletes:** `Team`, `Project` and `Task` have `deletedAt`; every read filters
  `deletedAt: null`. A team with live projects can't be deleted (409). Tasks of a deleted
  project disappear with it. (Revoking an invitation is a hard delete — it isn't domain data.)
- **Activity log:** `Activity (orgId, actorId, action, entityType, entityId, meta, createdAt)`
  written by `logActivity()` inside the same transaction as the change it records.
- **Invitations:** ADMIN invites by email + role → random token (stored hashed, expires in
  7 days). The invite link lets a new user sign up straight into that org. No email sending
  — the link is shown to the admin to copy.
- **Member lifecycle:** invite → accept → change role → remove. Removing a member deletes the
  membership, takes them off teams, unassigns their tasks and revokes their refresh tokens.
  A removed user can rejoin through a new invite using their existing password.
- **Concurrency:** create/move/delete of tasks lock the project row (`SELECT … FOR UPDATE`)
  inside the transaction, so parallel drags can't leave duplicate positions.

## API — 28 endpoints (all under `/api`)

| Area | Endpoints |
|---|---|
| Auth (5) | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Members (3) | `GET /members`, `PATCH /members/:userId` (role), `DELETE /members/:userId` |
| Invitations (4) | `GET /invitations`, `POST /invitations`, `DELETE /invitations/:id`, `POST /invitations/:token/accept` |
| Teams (5) | `GET /teams`, `POST /teams`, `DELETE /teams/:id`, `POST /teams/:id/members`, `DELETE /teams/:id/members/:userId` |
| Projects (5) | `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id` |
| Tasks (5) | `GET /projects/:id/tasks`, `POST /projects/:id/tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `PATCH /tasks/:id/move` |
| Activity (1) | `GET /activity` |

Keep this table in sync with the code. Adding an endpoint means updating it (and the count).

## Conventions

- Errors: throw `new HttpError(status, message)`; one error-handling middleware in `app.js`
  turns it into `{ error: message }`.
- Validate request bodies by hand at the top of each handler — no validation library.
- Secrets and DB URL come from `backend/.env` (commit a `.env.example`, never `.env`).

## Commands

```bash
docker compose up -d                  # Postgres on localhost:5445 (5432-5435 are taken on this machine)
cd backend && npm install
cp .env.example .env                  # then set JWT_SECRET
npm run db:migrate                    # prisma migrate dev
npm run db:seed                       # demo users, all with password "password123"
npm run dev                           # API on :4000 (node --watch)
cd frontend && npm install && npm run dev   # app on :5173, proxies /api to :4000
```

`npm run db:reset` (in `backend/`) wipes and re-seeds the database.

**Deploy:** one Render web service (`render.yaml`) + Postgres on Neon/Supabase. Root `npm run build`
builds both apps; root `npm start` runs `prisma migrate deploy` then Express, which also serves
`frontend/dist` when `NODE_ENV=production` (same origin, so no CORS). `prisma` is a runtime
dependency for that reason. Don't add a health endpoint — it would change the 28-endpoint count.
