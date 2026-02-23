# EduConnect — Consultancy CRM (Web MVP)

This is a **fresh** web-first implementation of your internal consultancy CRM.

✅ Roles included:
- SUPER_ADMIN
- STAFF (permissions-based)
- CONSULTANT (main account)
- AGENT (sub-consultant under a consultant)

✅ Core modules included in this MVP:
- Direct login (User ID + Password) — no signup
- University Management (Admin only)
- Course Management (Admin only)
- Agent Management (Consultant creates Agents)
- Agent Commission per Course (Percent / Flat / One-time)
- Admission Wizard (Consultant/Staff creates admissions)
- Auto fee/profit calculation
- Ledgers created on submit (University payable, Agent payable, Profit)
- Admission Slip PDF download (3 copies: Consultancy/University/Student)
- Daily Expense Register (simple)
- Basic dashboards (totals + profit + pending amounts)

---

## 1) Prerequisites
- Node.js 18+ recommended

---

## 2) Setup

```bash
# 1) Install
npm install

# 2) Environment
cp .env.example .env

# 3) Database + Prisma
npm run db:generate
npm run db:push

# 4) Seed SUPER_ADMIN (+ optional consultant)
npm run db:seed

# 5) Run
npm run dev
```

Open: http://localhost:3000

---

## 3) Default login (only if you keep the .env.example values)
- SUPER_ADMIN: `admin` / `change-me`
- CONSULTANT: `consultant` / `change-me` (optional seed)

**Important:** Change these before any real use.

---

## 4) Folder structure (high level)
- `src/app` — Next.js App Router pages
- `src/lib` — auth, db, calculations
- `prisma/` — schema + seed

---

## 5) Notes / Future milestones
- File uploads (photo/doc proofs) are stubbed as URL fields for now.
- Reports & marketing posters can be added next, using the same DB.
