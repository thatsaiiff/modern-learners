# Deployment Requirements & Infrastructure Specification

**Product**: Modern Learners — Saif Classes  
**Architecture**: Modular Monolith on Next.js 15 (App Router) + PostgreSQL (Prisma ORM)  
**Target Hosting**: Vercel (Frontend & Serverless API Handlers)  
**Target Database**: Neon Serverless PostgreSQL  

---

## 1. Required Environment Variables

The following environment variables are required in production:

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string with SSL mode enabled | `postgresql://user:pass@ep-cool-host.neon.tech/modern_learners?sslmode=require` |
| `AUTH_SECRET` | **Yes** | 256-bit cryptographically secure secret (min 32 chars) for HS256 JWT signing | `generated-with-openssl-rand-base64-32` |
| `NEXT_PUBLIC_APP_NAME` | **Yes** | Official display name of the tuition platform | `Modern Learners — Saif Classes` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Production domain URL (used for base redirects and links) | `https://modern-learners.vercel.app` |
| `NODE_ENV` | **Yes** | Runtime environment (`production`) | `production` |

---

## 2. Database Requirements
- **Database Engine**: PostgreSQL >= 14.x (Fully compatible with Neon, Supabase, Railway, AWS RDS).
- **Connection Mode**: Direct connection or Connection Pooled with `?sslmode=require`.
- **Driver**: Prisma ORM with `@prisma/client`.
- **In-Memory / Local DB Dependencies**: **NONE**. The application has zero reliance on SQLite, in-memory databases, or local file caches.

---

## 3. Storage & Filesystem Requirements
- **Local Filesystem Persistence**: **ZERO (None)**.
  - Uploaded HTML exams are parsed in memory via request buffers and stored as structured JSON snapshots in PostgreSQL.
  - Academic report cards are rendered via React and CSS Paged Media (`@media print`) and printed/saved directly by the browser.
  - CSV exports are streamed directly in HTTP response buffers.
- **External Object Storage (S3 / Blob)**: Not required for V1 core examination and grading functionality.

---

## 4. Build, Start & Migration Commands

| Operation | Command | Purpose |
|---|---|---|
| **Build** | `npm run build` | Generates Prisma Client (`prisma generate`) and compiles optimized Next.js production build (`next build`). |
| **Start** | `npm run start` | Starts Next.js production server (or managed automatically by Vercel serverless runtime). |
| **Migration** | `npx prisma migrate deploy` | Applies database migrations safely without altering schema destructively. |
| **Initial Seed** | `npm run prisma:seed` | Idempotently seeds initial admin account, classes 6–10, subjects, session `2026-27`, and system defaults. |

---

## 5. Admin Initialization Procedure
1. Run `npm run prisma:seed` on the connected Neon database to establish the default Administrator account:
   - **Username**: `admin`
   - **Default Password**: `Admin@ModernLearners2026`
2. Log in at `/auth/admin-login`.
3. Update the admin password from the system settings.

---

## 6. Production Security & Cookie Configuration
- **HTTPS Enforced**: All traffic routed via HTTPS.
- **Cookie Flags (`COOKIE_OPTIONS`)**:
  - `httpOnly: true` (inaccessible to browser JavaScript)
  - `secure: true` in production (transmitted only over HTTPS)
  - `sameSite: "lax"` (CSRF protection)
  - `maxAge: 604800` (7-day session validity)
- **PIN Security**: 4-digit student PINs are hashed using `bcryptjs` with 10 salt rounds before database insertion. `pinHash` is strictly omitted from all client API responses.
- **Exam Timing Authority**: Exam durations and login deadlines are enforced server-side.

---

## 7. External Service Requirements
- **Microservices**: None.
- **Message Queues (RabbitMQ / Kafka)**: None.
- **Redis Cache**: None.
- **Third-Party Auth Providers**: None (Dual JWT cookie system is completely standalone).

---

## 8. Backup & Rollback Protocol
- **Automated Neon Backups**: Neon provides automated continuous backups and point-in-time recovery (PITR).
- **Vercel Rollback**: Instant 1-click deployment rollback available in the Vercel dashboard.

---

## 9. Local vs Production Configuration Differences

| Configuration | Local Development | Production (Vercel + Neon) |
|---|---|---|
| `DATABASE_URL` | Local PostgreSQL or Neon dev branch | Production Neon PostgreSQL (`sslmode=require`) |
| `NODE_ENV` | `development` | `production` |
| Cookies `secure` | `false` (supports `http://localhost`) | `true` (enforces HTTPS) |
| Logging | Verbose query logging in dev | Error-only structured logging |
