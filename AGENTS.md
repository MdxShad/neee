# EduConnect CRM — Agent Instructions

## Product Context
EduConnect is an **internal consultancy CRM**, not a marketplace and not a public student portal.

### Roles
- `SUPER_ADMIN`
- `STAFF` (permission-based)
- `CONSULTANT` (main account)
- `AGENT` (sub-consultant under a consultant)

`University` has **no login** and no dashboard access.

## Core Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- Cookie-based session auth
- `pdf-lib` for PDF generation

## Coding Conventions
- Server actions live in `src/app/**/actions.ts`.
- For protected logic, use auth guards from `src/lib/auth` (`requireAuth`/`requireRole`/`requirePermission` conventions).
- Validate action inputs with Zod schemas from `src/lib/validation`.
- Keep pages server-first; only use client components/state where truly needed.
- Keep changes minimal and scoped to the requested milestone.

## Definition of Done
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- If Prisma schema changes:
  - Include a Prisma migration in `prisma/migrations/`.
  - Run Prisma client generation (`prisma generate`).

## Review Guidelines (@codex)
- Verify role boundaries (especially AGENT restrictions) remain enforced.
- Confirm no University-auth assumptions are introduced.
- Confirm schema changes include migration + generated client compatibility.
- Confirm CI runs lint, typecheck, and build on pull requests.
- Flag any client-side logic that should remain server-side.
