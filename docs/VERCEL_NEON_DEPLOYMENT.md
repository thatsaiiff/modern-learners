# Vercel + Neon PostgreSQL Deployment Guide — Modern Learners

This document provides the exact production deployment procedure for **Modern Learners — Saif Classes** using **Vercel** and **Neon Serverless PostgreSQL**.

---

## 1. Production Deployment Sequence Overview

The deployment sequence must follow this exact order:

```text
1. Push Code to Private GitHub Repository
   ↓
2. Provision Neon Serverless PostgreSQL Project
   ↓
3. Configure Production Environment Variables on Vercel
   ↓
4. Run Prisma Production Migration (`npx prisma migrate deploy` or `npx prisma db push`)
   ↓
5. Deploy Vercel Production Build
   ↓
6. Execute Secure Production Admin Initialization (`ADMIN_PASSWORD=... npx tsx prisma/seed.ts`)
   ↓
7. Execute Post-Deployment Smoke Test (`docs/PRODUCTION_SMOKE_TEST.md`)
```

---

## 2. Prerequisites
- **Git / GitHub Account**: Private repository.
- **Vercel Account**: [vercel.com](https://vercel.com).
- **Neon Account**: [neon.tech](https://neon.tech).
- **Node.js**: >= 18.x.

---

## 3. Step 1: Provision Neon PostgreSQL Project
1. Log in to [Neon Console](https://console.neon.tech).
2. Click **New Project**:
   - **Project Name**: `modern-learners-prod`
   - **Region**: Select the region closest to students (e.g. `ap-south-1` Mumbai / `ap-southeast-1` Singapore).
   - **PostgreSQL Version**: 16 (or latest stable).
3. In **Connection Details**, select **Pooled connection**.
4. Copy the connection string (with `?sslmode=require`):
   ```text
   postgresql://username:password@ep-example-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## 4. Step 2: Generate Production `AUTH_SECRET`
Generate a cryptographically secure 256-bit secret on your local terminal:

```bash
openssl rand -base64 32
```

Keep this secret secure; do not share or commit it.

---

## 5. Step 3: Configure Vercel Project
1. In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New** → **Project**.
2. Import the private GitHub repository `modern-learners`.
3. In the **Configure Project** settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (`package.json` runs `prisma generate && next build`)
   - **Output Directory**: `.next`
4. Add the following **Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `<neon-pooled-connection-string>?sslmode=require` | Production Neon connection string |
| `AUTH_SECRET` | `<generated-32+-char-secret>` | Minimum 32 characters for HS256 JWT |
| `NEXT_PUBLIC_APP_NAME` | `Modern Learners — Saif Classes` | Brand display name |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production domain |
| `NODE_ENV` | `production` | Production mode |

5. Click **Deploy**.

---

## 6. Step 4: Run Prisma Production Migration & Secure Admin Seed
From your local terminal, apply the database migration and initialize the primary administrator account using environment variables:

```bash
# 1. Apply schema migration to production database
DATABASE_URL="<your-neon-pooled-connection-string>?sslmode=require" npx prisma db push

# 2. Initialize primary administrator account with your chosen strong password
DATABASE_URL="<your-neon-pooled-connection-string>?sslmode=require" \
NODE_ENV="production" \
ADMIN_EMAIL="admin@modernlearners.com" \
ADMIN_USERNAME="admin" \
ADMIN_NAME="Saif Sir (Admin)" \
ADMIN_PASSWORD="<your-strong-production-password>" \
npx tsx prisma/seed.ts
```

Output:
```text
🌱 Initializing Modern Learners database...
✅ Primary Admin account initialized: Saif Sir (Admin) (admin)
✅ Active Academic Session: 2026-27
✅ Classes seeded: 6, 7, 8, 9, 10
✅ Subjects seeded: MAT, PHY, CHEM, BIO, COMP
✅ Class-Subject relationships configured
✅ Seeded Chapter: Work, Energy & Power with 4 topics
✅ System settings initialized
🎉 Database initialization completed successfully!
```

> **Security Note**: If `prisma/seed.ts` is executed subsequently in production, it will detect the existing Admin and safely preserve existing credentials (`ℹ️ Admin user already exists. Preserving credentials.`).

---

## 7. Step 5: Post-Deployment Smoke Test
Verify production operation using `docs/PRODUCTION_SMOKE_TEST.md`:
1. Navigate to `https://your-domain.vercel.app/auth/admin-login`.
2. Log in with your configured admin credentials.
3. Add a student -> observe generated roll number (e.g. `08-2627-001`).
4. Import an HTML exam -> assign to student.
5. In an incognito window, log in at `/auth/student-login` -> take exam -> submit.
6. Verify instant score, performance analytics, and A4 report card print dialog.

---

## 8. Development vs Production Differences

| Feature | Development (Local) | Production (Vercel + Neon) |
|---|---|---|
| Database Connection | Local PostgreSQL or dev branch | Neon Serverless PostgreSQL with SSL pooled connection |
| Cookies | `secure: false` (allows `http://localhost`) | `secure: true` (strictly HTTPS only) |
| Admin Password | Local dev password fallback | Explicit `ADMIN_PASSWORD` required via env |
| Logging | Verbose query logging | Structured error-only logging |
| Storage | Memory / streaming buffers | Memory / streaming buffers (0 disk writes) |

---

## 9. Rollback & Disaster Recovery Protocol

### Instant Vercel Rollback
1. Go to **Vercel Dashboard** → Project → **Deployments**.
2. Locate the previous stable build.
3. Click `...` → **Promote to Production**.

### Neon Point-in-Time Database Restore
1. In the **Neon Console**, go to **Backups / PITR**.
2. Choose a timestamp prior to the incident to restore state.

---

## 10. Common Troubleshooting & Fixes

| Issue | Cause | Solution |
|---|---|---|
| `PrismaClientInitializationError: Can't reach database server` | Missing `?sslmode=require` | Ensure `?sslmode=require` is present in `DATABASE_URL`. |
| `JWT session invalid / 401 Unauthorized` | Missing `AUTH_SECRET` | Set `AUTH_SECRET` in Vercel project environment variables. |
| `PGBouncer: prepared statement already exists` | Direct connection on pooled port | Use Neon pooled connection string on port `5432`. |
