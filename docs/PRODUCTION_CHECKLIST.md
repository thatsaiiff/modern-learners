# Production Readiness & Deployment Checklist — Modern Learners

**Platform**: Modern Learners — Saif Classes  
**Version**: 1.0 Production Readiness  
**Target Infrastructure**: Free-First / Scalable Cloud (Vercel / Node.js + PostgreSQL)

---

## 1. Production PostgreSQL Setup
- [ ] Provision a managed PostgreSQL instance with connection pooling (e.g. Neon, Supabase, Railway, or AWS RDS).
- [ ] Ensure connection string includes `sslmode=require` (e.g., `postgresql://user:pass@host:5432/modern_learners?sslmode=require&pgbouncer=true`).
- [ ] Set connection pool limits appropriate for serverless execution (default: 10-20 connections max per pool).

---

## 2. Prisma Migration Procedure
- [ ] Apply migrations in production using `npx prisma migrate deploy`.
- [ ] **NEVER** run `prisma db push` in production.
- [ ] Verify that all tables, unique constraints, and foreign key relations are created cleanly.

---

## 3. Production Environment Variables
Configure the following in your hosting provider's secrets manager (e.g., Vercel / Railway Project Settings):

```bash
DATABASE_URL="postgresql://username:password@hostname:5432/modern_learners?sslmode=require"
AUTH_SECRET="your-generated-super-secure-jwt-secret-min-32-chars"
NEXT_PUBLIC_APP_NAME="Modern Learners — Saif Classes"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"
```

---

## 4. AUTH_SECRET Generation & Requirements
- [ ] Generate a cryptographically secure 256-bit secret string:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Ensure the secret is at least 32 characters long.
- [ ] **NEVER** commit `AUTH_SECRET` to version control or `.env.example`.

---

## 5. Admin Account Creation
- [ ] Initialize the primary administrator account for Saif Sir.
- [ ] Ensure the initial password is changed immediately upon first login.
- [ ] Verify that Admin has the `ADMIN` role and is active in the database.

---

## 6. Development Seed vs Production Seed Safety
- [ ] **Development**: `prisma/seed.ts` creates classes 6–10, subjects, session `2026-27`, and system defaults.
- [ ] **Production**: Only seed academic classes, subjects, active session, and system settings.
- [ ] Ensure zero test students, fake exams, or mock marks are inserted into the production database.

---

## 7. HTTPS & Cookie Security Configuration
- [ ] Enforce HTTPS across all domain routes via reverse proxy / hosting provider.
- [ ] Ensure `COOKIE_OPTIONS` in `lib/auth/session.ts` automatically applies:
  - `httpOnly: true` (prevents XSS cookie theft)
  - `secure: true` in production (transmits only over HTTPS)
  - `sameSite: "lax"` (protects against CSRF)
  - `path: "/"`
  - `maxAge: 604800` (7 days expiration)

---

## 8. Database Backup Strategy
- [ ] Enable automated daily point-in-time recovery (PITR) on the managed PostgreSQL database.
- [ ] Set backup retention to a minimum of 7 to 30 days.
- [ ] Periodically execute manual schema & data dumps before major academic session transitions:
  ```bash
  pg_dump -U postgres -h hostname -d modern_learners -F c -b -v -f backup_$(date +%Y%m%d).dump
  ```

---

## 9. Database Disaster Recovery & Restore Procedure
- [ ] Document restore command for emergencies:
  ```bash
  pg_restore -U postgres -h hostname -d modern_learners -v backup_file.dump
  ```
- [ ] Test the restoration procedure on a staging/local database before deploying real student data.

---

## 10. Error Logging & Diagnostics
- [ ] Integrate application logging (e.g. Sentry or Next.js structured logging).
- [ ] Verify that API error responses do not expose stack traces, database credentials, or internal server paths to users.

---

## 11. Application Health & Monitoring
- [ ] Configure an uptime monitor (e.g. BetterUptime, UptimeRobot) targeting `/api/auth/me` or `/`.
- [ ] Set alert notifications for 5xx server errors or slow response times (> 2000ms).

---

## 12. File Upload & Security Limits
- [ ] HTML Exam Upload limit enforced at <= 5MB.
- [ ] HTML sanitization service (`sanitizeQuestionHtml`) strips all `<script>`, `<iframe>`, `<form>`, `onload`, and inline event handlers before saving.

---

## 13. Authentication Verification
- [ ] Admin login verified with username/email + bcrypt password hash.
- [ ] Student login verified with Roll Number (e.g. `08-2627-001`) + 4-digit PIN.
- [ ] Verify that incorrect PINs or inactive accounts are rejected with generic error messages.

---

## 14. Authorization & Student Isolation
- [ ] Verify that students cannot access `/api/students`, `/api/exams`, `/api/admin/*`, `/api/attendance/sessions`, or export endpoints.
- [ ] Verify that student A cannot access student B's exam attempts, results, or report cards by changing URL parameters.

---

## 15. Exam Timing & Server Clock Authority
- [ ] Verify that exam entry is rejected before `startAt` or after `loginDeadline`.
- [ ] Verify that changing client device time has zero effect on the authoritative server deadline (`serverDeadline = startedAt + durationMinutes`).
- [ ] Verify that answers submitted after the deadline are rejected and auto-submitted.

---

## 16. Result Integrity & Snapshotting
- [ ] Verify that exam questions and options are frozen in `ExamQuestion.questionSnapshot` and `AttemptQuestion.questionSnapshot`.
- [ ] Verify that subsequent edits in the Question Bank do not alter historical exam results.
- [ ] Verify that multi-attempt official selection (`FIRST`, `LATEST`, `BEST`, `TEACHER_SELECTED`) marks exactly one official result (`isOfficial: true`).

---

## 17. Attendance Verification
- [ ] Verify that student self check-in is permitted only during active teacher-configured windows.
- [ ] Verify that duplicate attendance records for the same session and student are rejected by database constraint `@@unique([sessionId, studentId])`.

---

## 18. Report Card Generation Verification
- [ ] Verify that report cards aggregate only official results (`isOfficial: true`).
- [ ] Verify that CSS Paged Media `@media print` renders an A4 vector report card with teacher remarks and director signature lines.

---

## 19. Leaderboard Privacy Verification
- [ ] Verify that student rankings support competition ranking (1224).
- [ ] Verify that peer names, roll numbers, and marks are masked when privacy settings are active, while the student's own standing remains unmasked.

---

## 20. Academic Promotion & Rollback Verification
- [ ] Verify that promoting Class 6 → 7, 7 → 8, 8 → 9, 9 → 10 creates new `StudentEnrollment` records linked via `promotedFromEnrollmentId`.
- [ ] Verify that previous session enrollments, exam attempts, and results remain 100% intact.
- [ ] Verify that rollback restores previous enrollment to `ACTIVE` and records an `AcademicMovement` audit log.

---

## 21. Mobile Device Testing
- [ ] Verify exam room UI on iOS Safari (iPhone): touch targets >= 44px, sticky timer bar visible, question palette accessible.
- [ ] Verify exam room UI on Android Chrome: touch option selectors, numerical input keyboard, auto-save status indicators.

---

## 22. Browser Compatibility
- [ ] Chrome / Chromium (Latest 3 versions)
- [ ] Safari (iOS & macOS)
- [ ] Firefox (Latest 3 versions)
- [ ] Microsoft Edge

---

## 23. Production Deployment Procedure
1. Run local verification: `npm run lint && npm run typecheck && npm test && npm run build`.
2. Push commit to production branch on GitHub / Git provider.
3. Configure environment variables (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`) on hosting provider.
4. Run database migration: `npx prisma migrate deploy`.
5. Run initial system seed: `npx tsx prisma/seed.ts`.
6. Trigger production deployment build.
7. Perform post-deployment smoke test.

---

## 24. Deployment Rollback Procedure
1. If a critical issue is discovered post-deployment, immediately roll back to the previous deployment commit in the hosting dashboard (e.g. Vercel 1-click Instant Rollback).
2. If database schema rollback is required, apply a downward migration script or restore from the pre-deployment database backup snapshot.
