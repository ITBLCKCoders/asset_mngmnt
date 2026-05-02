# AGENTS.md
# AI AGENT EXECUTION PROTOCOL (STRICT)

## REQUIRED WORKFLOW (MUST FOLLOW)

The agent MUST follow this sequence:

1. Analyze the project structure
2. Identify relevant files
3. Propose a clear step-by-step plan
4. WAIT for user approval
5. Execute changes incrementally
6. Show diff/changes clearly
7. Summarize changes

❗ DO NOT skip planning
❗ DO NOT directly modify files without a plan

---

## FILE OPERATION RULES

- Only modify files that are directly related to the task
- NEVER create new folders unless they match AGENTS.md structure
- NEVER invent new paths or architectures
- ALWAYS follow existing folder conventions exactly

---

## SAFE EDITING RULES

- Prefer editing existing files over creating new ones
- Make minimal, surgical changes
- DO NOT overwrite entire files unless explicitly required
- Preserve existing logic unless fixing a bug

---

## Execution Restriction

- DO NOT use run_commands for file editing
- ALWAYS modify files using diff-based edits
- Avoid PowerShell commands

## ANTI-HALLUCINATION RULES

- If a file does not exist → DO NOT assume it exists
- If unsure → ASK instead of guessing
- Only use paths defined in AGENTS.md
- Do not introduce new frameworks or libraries

---

## RESPONSE FORMAT (MANDATORY)

Every response MUST follow:

### PLAN

- Step 1:
- Step 2:
- Step 3:

### FILES TO MODIFY

- path/to/file.ts
- path/to/another.ts

### EXECUTION

(only after approval)

### SUMMARY

- What was changed
- Why it was changed

# Agent Rules

## Behavior

- Always analyze the project structure first
- Do not overwrite entire files unless necessary
- Prefer minimal changes

## Coding Rules

- Follow existing style
- Do not break working code
- Add comments for clarity

## Execution Rules

- Ask before running commands
- Never delete critical files

## Workflow

1. Understand task
2. Scan project
3. Plan
4. Execute step-by-step
5. Review changes
This document gives AI coding assistants accurate, project-specific guidance for working in this repository. It is intentionally practical: follow the real architecture in this codebase, prefer existing patterns over invented abstractions, and keep changes aligned with standard React + Vite + TypeScript and Node + Express + TypeScript best practices.

## 1. Project Summary

- Repository type: npm workspaces monorepo
- Workspaces: `client`, `server`
- Frontend stack: React 19, TypeScript, Vite, React Router, Tailwind-based UI, native `fetch`
- Backend stack: Node.js, Express 4, TypeScript, MySQL (`mysql2`)
- Shared contract layer: `shared/types/`
- Real-time support: Socket.IO

## 2. Top-Level Structure

| Area     | Path                 | Notes                                    |
| -------- | -------------------- | ---------------------------------------- |
| Client   | `client/`            | React + Vite application                 |
| Server   | `server/`            | Express + TypeScript API                 |
| Shared   | `shared/types/`      | Shared TypeScript types used across apps |
| Database | `db/`                | SQL migrations and backups               |
| Docs     | `docs/`, `README.md` | Supplemental project documentation       |

## 3. Client Architecture

Primary source root: `client/src/`

Common folders:

- `components/`
  - `ui/`: reusable UI primitives
  - `common/`: shared feature-agnostic components
  - `routes/`: route guards and route wrappers such as `PublicRoute`, `PrivateRoute`, and `PermissionRoute`
- `pages/`: route-level screens
- `hooks/`: reusable React hooks
- `context/`: React context providers
- `lib/`: client-side utilities and platform integrations such as API access, auth helpers, env helpers, and logging
- `types/`: client-only types when they do not belong in `shared/types`
- `utils/`: generic helpers
- `__tests__/`: client test files or support

### Client conventions

- Use the `@/` alias for imports from `client/src`
- Keep route-level UI in `pages/`
- Keep reusable, non-route-specific UI in `components/`
- Prefer colocating feature helpers near the feature unless the helper is broadly reusable
- Prefer strict TypeScript types over `any`
- Prefer shared contracts from `shared/types/` when data crosses client/server boundaries

### Routing

- Routing is defined in `client/src/App.tsx`
- Route protection is implemented with wrapper components, not custom router config files
- Existing wrappers include:
  - `PublicRoute`
  - `PrivateRoute`
  - `PermissionRoute`
  - `VerifyOtpRoute`
  - `LandingRedirect`

When adding a page:

1. Create the page component under `client/src/pages/`
2. Register the route in `client/src/App.tsx`
3. Wrap it with the correct access-control component(s)
4. Reuse existing UI primitives from `components/ui` or common components from `components/common`

### API access

API access should go through `client/src/lib/api.ts`.

Current behavior:

- Uses native `fetch`, not Axios
- Uses `credentials: 'include'`
- Calls relative endpoints such as `api.get('/assets')`
- Base URL comes from `getApiBase()` and typically resolves to `/api`
- Refresh flow is handled centrally in the API layer
- The current implementation relies on cookies for refresh/session behavior

Do not introduce a second API client abstraction unless there is a strong project-wide reason.

### Client best practices

- Keep pages focused on composition and user flow
- Move repeated business logic into hooks, helpers, or smaller components
- Reuse the existing API wrapper instead of calling `fetch` directly in many places
- Use Zod or existing form validation patterns where validation is already established
- Avoid duplicating server-derived types in the client
- Prefer explicit loading, empty, and error states for route-level pages

## 4. Server Architecture

Primary source root: `server/src/`

Common folders:

- `routes/`: Express routers mounted in `src/index.ts`
- `controllers/`: request/response handling
- `services/`: business logic
- `repositories/`: database access and query logic
- `dtos/`: request validation schemas
- `middleware/`: authentication, validation, error handling, request metadata, and related middleware
- `config/`: environment/config handling
- `auth/`: authentication/session support
- `models/`: domain models where present
- `types/`: server-specific types such as custom errors
- `utils/`: shared server utilities
- `sockets/`: Socket.IO handlers
- `tests/`: backend tests
- `scripts/`: one-off maintenance or operational scripts

### Standard backend flow

Preferred request flow:

`Route -> Middleware -> Controller -> Service -> Repository -> Database`

Use each layer for its intended job:

- Route: declare endpoint shape and attach middleware
- Middleware: authentication, authorization, DTO validation, request metadata
- Controller: parse request, call service, format HTTP response
- Service: business rules and orchestration
- Repository: SQL and persistence details

### Server response conventions

Controllers should use the existing response helpers and shared response shape instead of inventing endpoint-specific wrappers.

Use:

- `createSuccessResponse(...)`
- `createErrorResponse(...)`

Shared API response shape lives in `shared/types/common.ts`:

```ts
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
```

### Validation

- Request validation belongs in DTO schemas under `server/src/dtos/`
- Use the existing validation middleware/helpers instead of validating ad hoc inside controllers
- Prefer validating request shape before service execution

### Error handling

- Business/domain errors should be represented with existing custom error patterns such as `AppError` subclasses where used
- HTTP formatting should remain centralized in the existing error/response utilities
- Do not scatter raw `res.status(...).json(...)` error shapes inconsistently across the codebase when a shared helper already exists

### Authentication and sessions

Follow the current implementation, not assumptions from other projects:

- Auth routes are mounted under `/api/auth`
- The app uses session-aware auth flow with refresh handling
- The client API wrapper currently sends cookies via `credentials: 'include'`
- `authenticate` middleware and `AuthRequest` should be reused where protected routes need authenticated user context

Do not rewrite auth to bearer-token-only patterns unless the task explicitly requires that change.

### Server best practices

- Keep controllers thin
- Keep SQL and persistence logic out of controllers
- Keep route registration centralized in `server/src/index.ts`
- Reuse repository and service patterns already present before creating a new abstraction
- Prefer config access through existing config modules instead of reading `process.env` all over the codebase
- Preserve existing middleware order unless there is a clear reason to change it

## 5. Shared Types

Shared cross-app types live in `shared/types/`.

Use shared types for:

- API response shapes
- DTO interfaces used by both client and server
- Shared enums and domain contracts

Do not duplicate the same request/response interface separately in client and server when it belongs in `shared/types/`.

Server-only runtime validation should still live in backend DTO Zod schemas.

## 6. Environment and Runtime Configuration

Client:

- `VITE_API_BASE`
- `VITE_API_PROXY_TARGET`

Server:

- `HTTP_PORT`
- `MYSQL_*`
- `JWT_*`
- `ALLOWED_ORIGINS`
- other variables consumed by `server/src/config/*`

Proxy behavior:

- Vite dev server proxies `/api` to the backend target
- Current client Vite config forwards `/api` requests without stripping the prefix

Always verify config behavior in code before documenting or changing it.

## 7. Tooling and Commands

Repository-level scripts:

- `npm run dev`
- `npm run test`
- `npm run test:server`
- `npm run test:client`

Client workspace:

- `npm run dev --workspace=client`
- `npm run build --workspace=client`
- `npm run lint --workspace=client`
- `npm run test --workspace=client`

Server workspace:

- `npm run dev --workspace=server`
- `npm run build --workspace=server`
- `npm run lint --workspace=server`
- `npm run test:unit --workspace=server`

Prefer workspace scripts over ad hoc commands when possible.

## 8. Naming and File Conventions

Follow the existing naming style already present in this repo.

Client:

- React components: PascalCase for exported component names
- Route wrapper files currently use lower camel case filenames such as `privateRoute.tsx` and `permissionRoute.tsx`; match the surrounding folder style instead of renaming existing files casually
- General component files should favor descriptive names over vague names like `index.tsx` unless the folder pattern already uses barrel exports
- Hooks should use the `useX` naming convention
- Utility files should be descriptive and domain-specific

Server:

- Routes: `<feature>.routes.ts`
- Controllers: `<feature>.controller.ts`
- Services: `<feature>.service.ts`
- Repositories: `<feature>.repository.ts` when creating new repository files
- DTO schema files should clearly describe the action or payload they validate

Types and contracts:

- Shared cross-boundary types belong in `shared/types/`
- Server-only implementation types belong in `server/src/types/`
- Client-only UI helper types can stay in `client/src/types/`

Avoid broad renames unless the task explicitly includes cleanup or consistency refactoring.

## 9. Testing Expectations

Every non-trivial behavior change should include verification. Prefer the smallest test coverage that proves the behavior.

Client testing guidance:

- Use the existing client test setup instead of inventing a second test stack
- Favor component or page tests for visible behavior
- Test loading, success, and error states where practical
- Mock network boundaries through the API layer or fetch as appropriate for the existing test style

Server testing guidance:

- Favor service or controller tests for backend behavior changes
- Add validation/error-path coverage when changing DTOs, auth, or permissions
- Keep database-heavy tests targeted and scoped

Minimum expectation:

- Bug fix: add or update a test when feasible
- New endpoint or new user flow: include at least one focused verification path
- Refactor-only change: run relevant existing tests even if no new test is added

If tests are not added, explain why in the final handoff.

## 10. Change Guidelines for AI Assistants

When making changes:

- Inspect existing patterns before introducing new ones
- Keep changes minimal, local, and consistent with the surrounding feature
- Update shared types when API contracts change
- Update both client and server when a cross-boundary contract changes
- Add or update tests when behavior changes materially
- Avoid speculative refactors unless the user asked for them

Before finishing a task, try to verify with the closest relevant command:

- client-only change: `npm run test --workspace=client`
- server-only change: `npm run test:unit --workspace=server`
- cross-cutting change: run the most relevant checks for both sides when practical

## 11. Review Checklist

Use this lightweight checklist before considering work complete:

- Does the change match existing project structure and naming?
- Are imports, shared types, and API contracts consistent?
- Did I avoid introducing a new abstraction without a clear need?
- Are error states, auth behavior, and validation handled consistently?
- Did I update tests or at least run the closest relevant verification?
- If documentation or behavior assumptions changed, did I update the docs too?

## 12. What Not To Assume

Do not assume:

- React Query is installed or the standard data-fetching layer
- Axios is the HTTP client
- Prisma, TypeORM, or MongoDB are in use
- API responses can use arbitrary shapes
- Auth is a generic bearer-token-only setup
- A different import alias exists besides `@/` on the client
- Route definitions live in a separate generated router module

Verify in code first.

## 13. Preferred Patterns

Use these defaults unless the existing feature clearly follows a different established pattern:

- React function components with TypeScript
- Vite-friendly ES module imports
- Shared types for cross-boundary contracts
- Thin controllers and service-driven backend logic
- DTO/schema validation before business logic
- Centralized API access through `client/src/lib/api.ts`
- Centralized route mounting in `server/src/index.ts`
- Reusable UI primitives instead of duplicated page-specific widgets

## 14. File Placement Guide

Add new code in the most predictable location:

- New client page: `client/src/pages/<feature>/`
- New reusable client component: `client/src/components/`
- New client-only helper: `client/src/lib/` or `client/src/utils/`
- New server route: `server/src/routes/<feature>.routes.ts`
- New server controller: `server/src/controllers/<feature>.controller.ts`
- New server service: `server/src/services/<feature>.service.ts`
- New server repository: `server/src/repositories/<feature>.repository.ts`
- New server DTO schema: `server/src/dtos/`
- New shared API/domain type: `shared/types/`

## 15. Pull Request and Handoff Expectations

For larger changes, the final handoff should briefly cover:

- what changed
- any important assumptions
- what was verified
- any remaining risk or follow-up work

Keep handoffs concise, but do not omit testing status.

## 16. Documentation Goal

This file should help assistants make accurate changes, not generic ones. If the code and this document disagree, trust the code first and update this file so it stays useful.
