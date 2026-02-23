# Project Inspection Report

Date: 2026-02-23

## Overview
- Stack: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS.
- Data layer: Prisma ORM with SQLite.
- Auth model: Custom cookie + DB-backed session token; credentials via userId/password.
- Domain: Education consultancy CRM for admissions, universities/courses, agents, ledgers, and expenses.

## Repository structure
- `src/app/` contains route segments and server actions.
- `src/components/` contains shell and UI components.
- `src/lib/` contains auth, db access, validation, and financial calculations.
- `prisma/` contains database schema and seed logic.

## Data model highlights
- Core entities: `User`, `Session`, `University`, `Course`, `Admission`, `Expense`.
- Financial ledgers split by concern: `UniversityLedger`, `AgentLedger`, `ProfitLedger`.
- Roles: `SUPER_ADMIN`, `STAFF`, `CONSULTANT`, `AGENT`.
- Admission flow includes source (`DIRECT`/`AGENT`), expense tracking, and computed net profit snapshots.

## Security and authorization notes
- Session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- Server-side auth helpers (`requireUser`, `requireRole`) enforce access in actions/routes.
- Admissions creation explicitly blocks AGENT role and enforces consultant/agent ownership boundaries.

## Health checks run
- `npm run lint` did not execute to completion because Next.js prompted for initial ESLint configuration (interactive setup required).
- `npm run build` failed during type checking with:
  - `Module '"@prisma/client"' has no exported member 'Role'` in `src/app/api/admissions/[id]/slip/route.ts`.

## Suggested next steps
1. Generate/update Prisma client (`npm run db:generate`) and re-run `npm run build`.
2. Add a checked-in ESLint config (e.g., `.eslintrc.json`) so lint runs non-interactively in CI.
3. Add at least one smoke test path for login/admission flow to catch build-time regressions earlier.
