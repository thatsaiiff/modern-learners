# Architectural Decisions Log — Modern Learners

This document records the key architectural choices, trade-offs, and design rationales for **Modern Learners — Saif Classes**.

---

## ADR-001: Technology Stack & Project Structure

- **Decision**: Next.js (App Router), React, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, Zod.
- **Why it was necessary**: Need a cohesive full-stack TypeScript architecture enabling shared types between frontend, backend, validation schemas, and database layer with fast mobile rendering and low hosting overhead.
- **Options considered**:
  1. Next.js App Router (Full-Stack Monolith) — *Chosen*
  2. Separate React SPA (Vite) + Express/NestJS Backend
  3. Remix / Fastify
- **Chosen approach**: Next.js App Router with modular domain services (`lib/services/*`).
- **Reason**: Simplifies deployment, minimizes hosting costs (single deployable unit), guarantees end-to-end type safety, and provides server-side rendering for optimal mobile performance.
- **Impact**: Domain services remain modular and decoupled from HTTP route handlers, allowing future extraction into standalone microservices if needed without architectural rewrites.

---

## ADR-002: Student Identity vs Academic Roll Number

- **Decision**: Separate permanent student identity (`studentId` / `studentCode` e.g., `STU-000001`) from academic roll numbers (`08-2627-001`).
- **Why it was necessary**: Students advance through classes and sessions, and roll numbers change upon promotion, rollback, or re-indexing. Historical exams and attempts must remain linked to the student across all sessions.
- **Options considered**:
  1. Single table with mutable `rollNumber` as primary or natural key.
  2. Permanent `Student` record linked to `StudentEnrollment` records per class/session. — *Chosen*
- **Chosen approach**:
  - `Student`: `id` (UUID), `studentCode` (`STU-000001`), `name`, `status`, `pinHash`.
  - `StudentEnrollment`: `id`, `studentId`, `academicSessionId`, `classId`, `rollNumber`, `status`.
  - `AcademicMovement`: logs all promotions, rollbacks, and class transfers with actor and reason.
- **Reason**: Completely prevents data corruption or orphaned exam history during academic promotions or rollbacks.
- **Impact**: All foreign keys to student data (attempts, results, attendance) reference immutable `studentId`.

---

## ADR-003: Authentication and Session Management

- **Decision**: Dual-mode JWT authentication via secure, HTTP-only cookies with separate flows for Admin and Student.
- **Why it was necessary**: Students log in using `Roll Number + 4-digit PIN`, while Admins log in with credentials (email/username + password). Both require tamper-proof session tokens.
- **Options considered**:
  1. Third-party Auth provider (Auth0/Clerk/NextAuth).
  2. Custom lightweight JWT in HTTP-only cookies with argon2/bcrypt PIN/password hashing. — *Chosen*
- **Chosen approach**: Custom session service using `jose` / `bcryptjs` with HTTP-only cookies. Student authentication queries active enrollment to resolve `rollNumber` to permanent `studentId`.
- **Reason**: Zero third-party runtime dependency or subscription costs; precise control over 4-digit PIN authentication flow and student session payload.
- **Impact**: Authorization middleware verifies session and role on every API call and server component.

---

## ADR-004: Exam Snapshotting and Result Reproducibility

- **Decision**: Immutable snapshots of exam questions, options, grading rules, and student-specific question orders stored with each attempt.
- **Why it was necessary**: If a question in the Question Bank or Exam is edited in the future, past exam attempts and score breakdowns must remain 100% reproducible and verifiable.
- **Options considered**:
  1. Dynamic join to `Question` / `QuestionOption` tables on result view.
  2. Frozen JSON / relational snapshot on `ExamQuestion` and `AttemptQuestion`. — *Chosen*
- **Chosen approach**: `ExamQuestion` stores default snapshot; `AttemptQuestion` records the exact displayed question snapshot, question order, and option order for that student attempt.
- **Reason**: Guarantees legal and academic auditability of all examination results.
- **Impact**: Minor storage overhead for JSON snapshots in exchange for complete data integrity.

---

## ADR-005: Server-Authoritative Exam Timing & Evaluation

- **Decision**: Server enforces all start eligibility, time limits (`startedAt` + `durationMinutes`), periodic autosave, and grading calculation.
- **Why it was necessary**: Prevent student tampering via browser developer tools or modified JavaScript.
- **Options considered**:
  1. Client-side timer and score submission.
  2. Server-authoritative timer, server-side grading, and auto-submission upon deadline expiration. — *Chosen*
- **Chosen approach**:
  - `ExamAttempt.startedAt` and `serverDeadline` recorded on server at start.
  - Periodic autosave via `PUT /api/attempts/:id/answers`.
  - Correct answers are stripped from student-facing exam payloads before submission.
  - Final scoring performed solely on server by `GradingService`.
- **Reason**: Critical for examination credibility and anti-cheating security.

---

## ADR-006: Untrusted HTML Exam Import & Safe Sanitization

- **Decision**: Extract structured JSON payload (`#modern-learners-exam`) from uploaded HTML; validate against JSON Schema and Zod; sanitize all question rich text before storage.
- **Why it was necessary**: Uploaded HTML files can contain malicious scripts, tracking pixels, or malformed data.
- **Options considered**:
  1. Store and render raw HTML in iframes.
  2. Parse JSON payload, validate schema, sanitize formatting tags, and render via native React components. — *Chosen*
- **Chosen approach**: Strict parser using `cheerio` / `sanitize-html` and Zod validation, producing preview for Admin confirmation before persisting into the database.
- **Reason**: Highest security boundary; uniform responsive mobile UI across all exams.

---

## ADR-007: Transparent Rule-Based Analytics & Attention Engine

- **Decision**: Rule-based analytics engine for performance trends and "Needs Attention" flags.
- **Why it was necessary**: Academic insights must be transparent, verifiable, and explainable to teachers and students without opaque black-box AI labeling.
- **Chosen approach**: `AnalyticsService` computes moving averages, pass rates, topic accuracies, and rule triggers (e.g., `<80%` pass rate, `3` consecutive drops, `<75%` attendance).
- **Reason**: Clear educational value and predictable behavior.

---

## ADR-008: Negative Marking & Percentage Clamping Rules

- **Decision**: Raw marks can reflect negative mark deductions per question, but aggregate exam raw marks are bounded at a minimum of `0.0` for official percentage calculation (`percentage = Math.max(0, (rawMarks / maximumMarks) * 100)`).
- **Why it was necessary**: Ensure standard academic percentage presentation (0% to 100%) across report cards, analytics, and leaderboards while still applying punitive deductions during question evaluation.
- **Chosen approach**: `rawMarks` calculates deductions when `negativeMarkingEnabled` is active; aggregate `percentage` is clamped to `0.0%` if total deductions exceed correct marks; `passed = percentage >= exam.passingPercentage`.
- **Reason**: Prevents anomalous negative percentages on student reports and analytics distributions while maintaining exact question deduction tracking.

---

## ADR-009: Deterministic Leaderboard Ranking Strategy

- **Decision**: Standard Competition Ranking ("1224" ranking) with deterministic tie-breaking.
- **Why it was necessary**: Ensure completely transparent, mathematical, and fair leaderboard ranks across Pass Rate, Total Marks, and Average Percentage without random ordering on ties.
- **Chosen approach**:
  1. Primary metric sorted descending (Pass Rate %, Total Marks, or Average %).
  2. Equal primary scores share the same integer rank (e.g. Tie for 1st place assigns Rank 1 to both students; the next student is assigned Rank 3).
  3. Secondary tie-breaking sorting: higher number of eligible tests, earlier latest submission date, then alphanumeric permanent Student Code (`STU-000001`).
  4. Only official attempts (`isOfficial: true`) for assigned/eligible exams count.
  5. Privacy masking: When enabled, non-admin views mask student names and roll numbers for peers while keeping the student's own record unmasked.
- **Reason**: Mathematical precision, complete reproducibility, and compliance with PRD privacy guidelines.

---

## ADR-010: Teacher Remarks Data Model for Academic Report Cards

- **Decision**: Introduce a dedicated `TeacherRemark` model linked to `Student` and `AcademicSession` with unique constraint `@@unique([studentId, academicSessionId])`.
- **Why it was necessary**: Preserve teacher's individualized qualitative feedback and remarks per academic year on the official printable report card while maintaining historical auditability.
- **Chosen approach**: `TeacherRemark` stores `remark`, `studentId`, `academicSessionId`, `authorId`, and timestamps. Only authenticated Admin/Teachers can modify remarks.
- **Reason**: Clean separation of qualitative evaluation from quantitative scoring, fully persistent across sessions.

---

## ADR-011: Printable HTML & Native PDF Generation via CSS Paged Media

- **Decision**: Implement student and admin report cards using standard CSS Paged Media (`@media print` and `@page { size: A4 portrait; margin: 10mm; }`) and native browser print pipelines (`window.print()`).
- **Why it was necessary**: Ensure 100% pixel-perfect vector A4 printing and PDF export that matches the styled modern interface without introducing massive serverless binary dependencies (such as heavy headless Chromium/Puppeteer instances that inflate bundle size by >150MB and introduce latency/cold-start failures).
- **Chosen approach**: Component `components/report/printable-report-card.tsx` structured for A4 portrait printing, concealing all navigation buttons during print, rendering crisp tables, typography, official certification seals, and director signatures.
- **Reason**: High performance, zero hosting cost overhead, zero deployment friction, and pixel-perfect PDF output across Chrome, Safari, Edge, Firefox, and mobile print handlers.




