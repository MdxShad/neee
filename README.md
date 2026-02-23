# EduConnect — Consultancy CRM (Web MVP)

Internal consultancy CRM for managing admissions, fee/profit, agents, ledgers, and expenses.

## Roles
- `SUPER_ADMIN`
- `STAFF` (permission-based)
- `CONSULTANT`
- `AGENT`

> University has no login. It only receives admission-slip output.

## Tech
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Cookie-session auth
- `pdf-lib`

## Local Setup (PostgreSQL)

```bash
# 1) Install dependencies
npm install

# 2) Configure environment
cp .env.example .env

# 3) Start PostgreSQL
docker compose up -d

# 4) Run migrations
npx prisma migrate dev

# 5) Seed data
npx prisma db seed

# 6) Start app
npm run dev
```

Open http://localhost:3000

## Default Login (seed defaults)
- `admin` / `admin123`

(You can optionally seed a consultant using the optional `SEED_CONSULTANT_*` env vars.)
