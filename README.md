# Modern Learners — Saif Classes

**Production-Oriented Tuition Academic Management, Examination & Student Performance Platform**

Built with Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, and Zod.

---

## 🚀 Exact Production Deployment Order

Follow this exact sequence when deploying to production:

```text
1. Environment Configuration
   ↓ Set DATABASE_URL, AUTH_SECRET (min 32 chars), NEXT_PUBLIC_APP_URL, and NODE_ENV="production"
2. Database Provisioning
   ↓ Provision PostgreSQL instance with SSL enabled (e.g. Neon, Supabase, Railway, RDS)
3. Prisma Migration
   ↓ Run `npx prisma migrate deploy` to establish database schema and foreign keys
4. Admin Account & Initial Seed
   ↓ Run `npx tsx prisma/seed.ts` to initialize classes 6-10, subjects, active session 2026-27, and admin account
5. Application Build & Deployment
   ↓ Deploy Next.js build (`npm run build && npm run start` or Vercel / Railway serverless deploy)
6. Post-Deployment Smoke Test
   ↓ Verify health endpoints and authentication at `/auth/admin-login` and `/auth/student-login`
7. Manual Acceptance Verification
   ↓ Execute the end-to-end journey in `docs/MANUAL_ACCEPTANCE_TESTS.md`
```

---

## 🛠 Local Development Quickstart

### 1. Prerequisites
- Node.js >= 18.x
- PostgreSQL instance running locally or cloud URL

### 2. Setup Environment
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` and `AUTH_SECRET` are configured in `.env`.

### 3. Install Dependencies & Generate Database Client
```bash
npm install
npx prisma generate
```

### 4. Seed Development Database
```bash
npm run prisma:seed
```
Initializes classes 6–10, subjects, session `2026-27`, system defaults, and Admin account (`admin`). Provide `ADMIN_PASSWORD` via environment variable or use local default.

### 5. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Verification & Automated Testing

Run the full verification suite before committing or deploying:

```bash
# Run all unit, integration and E2E acceptance tests
npm test

# Run TypeScript typecheck
npm run typecheck

# Run ESLint validation
npm run lint

# Run production build compilation
npm run build
```

---

## 📚 Technical Documentation & Specifications

- `docs/PRD.md` — Product Requirements Document (PRD)
- `docs/TAD.md` — Technical Architecture Document (TAD)
- `docs/EXAM_FORMAT.md` — Modern Learners HTML Exam Format v1.0 Specification
- `docs/schemas/modern-learners-exam-v1.schema.json` — Machine-readable exam JSON schema
- `docs/DECISIONS.md` — Architectural Decisions Log (ADR-001 through ADR-011)
- `docs/IMPLEMENTATION_PLAN.md` — Complete 15-section system implementation plan
- `docs/PRODUCTION_CHECKLIST.md` — 24-point production readiness and deployment checklist
- `docs/MANUAL_ACCEPTANCE_TESTS.md` — Step-by-step manual acceptance testing guide

---

## 🛡 Security Architecture Highlights

- **Dual-Mode Session Management**: Secure HTTP-only JWT cookies for Admin (`ml_admin_session`) and Student (`ml_student_session`).
- **Server-Authoritative Exam Timing**: Exam login windows and duration deadlines are enforced strictly on the server; client clock changes cannot alter examination deadlines.
- **Answer Key Security**: Correct answers and scoring metadata are stripped from student delivery payloads before submission.
- **Untrusted HTML Sanitization**: Uploaded HTML question papers are parsed through Cheerio and sanitized using strict DOMPurify rules, stripping all executable JavaScript, iframes, and inline event handlers.
- **Non-Destructive Lifecycle**: Academic promotions and rollbacks maintain complete historical continuity; past exam attempts, enrollments, and report cards remain permanently accessible.
