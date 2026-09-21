# Modern Learners — Saif Classes
## Implementation & Engineering Plan

Version: 1.0  
Status: Approved Architectural Specification

---

## 1. System Architecture

Modern Learners is architected as a **modular monolith** using **Next.js (App Router), React, TypeScript, Prisma ORM, and PostgreSQL**. The architecture emphasizes domain-driven service boundaries, server-side authoritative business logic, strict security isolation, and a mobile-first responsive user experience.

```text
                                  +---------------------------------------+
                                  |     Client (Mobile / Tablet / PC)     |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |  Next.js App Router (SSR & Client UI) |
                                  |    - Admin Portal (/admin/*)          |
                                  |    - Student Portal (/student/*)      |
                                  |    - Auth (/auth/*)                   |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |   Next.js Server Actions & Route API  |
                                  |    - Input Validation (Zod)           |
                                  |    - Auth & Role Guards (JWT Cookie)  |
                                  +-------------------+-------------------+
                                                      |
                                                      v
+---------------------------------------------------------------------------------------------------------------+
|                                            Domain Service Layer                                              |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+  +--------------+ |
|  |  StudentService   |  |  AcademicService  |  |    ExamService    |  |  QuestionService  |  |AttemptService| |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+  +--------------+ |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+  +--------------+ |
|  |  GradingService   |  | AnalyticsService  |  |LeaderboardService |  | AttendanceService |  | ReportService| |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------+  +--------------+ |
|  +-------------------+  +-------------------+                                                                |
|  |NotificationService|  |     AIService     |                                                                |
|  +-------------------+  +-------------------+                                                                |
+---------------------------------------------------------------------------------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          Prisma ORM & Client          |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          PostgreSQL Database          |
                                  +---------------------------------------+
```

---

## 2. Database Schema Architecture

The database model is strictly relational with full referential integrity and foreign key constraints:

1. **User & Identity**:
   - `User`: Admin / Teacher / Future Parent accounts (`id`, `email`, `username`, `passwordHash`, `role`, `isActive`, `createdAt`).
   - `Student`: Permanent student record (`id`, `studentCode` e.g., `STU-000001`, `name`, `status`, `pinHash`, `joinedAt`).
2. **Academic Structure**:
   - `AcademicSession`: Sessions (`id`, `name` e.g., `2026-27`, `startDate`, `endDate`, `isActive`).
   - `Class`: Classes (`id`, `classNumber` 6..10, `name`, `isActive`).
   - `Subject`: Subjects (`id`, `name`, `code` e.g., `PHY`, `isActive`).
   - `ClassSubject`: Class-Subject relationships (`id`, `classId`, `subjectId`, `isActive`).
   - `Chapter`: Chapters (`id`, `classId`, `subjectId`, `name`, `description`, `orderNumber`).
   - `Topic`: Topics (`id`, `chapterId`, `name`, `description`).
3. **Enrollment & Academic Movement**:
   - `StudentEnrollment`: Active & historical enrollments (`id`, `studentId`, `academicSessionId`, `classId`, `rollNumber` e.g., `08-2627-001`, `status`, `promotedFromEnrollmentId`).
   - `AcademicMovement`: Promotion, rollback, transfer history (`id`, `studentId`, `fromEnrollmentId`, `toEnrollmentId`, `movementType`, `reason`, `performedBy`, `createdAt`).
4. **Question Bank**:
   - `Question`: Question repository (`id`, `customId` e.g. `PHY8-WEP-001`, `classId`, `subjectId`, `chapterId`, `topicId`, `questionType`, `difficulty`, `questionText`, `explanation`, `defaultMarks`, `isActive`).
   - `QuestionOption`: Options for MCQ/Multiple Correct (`id`, `questionId`, `optionKey`, `optionText`, `isCorrect`, `orderNumber`).
5. **Examinations & Assignments**:
   - `Exam`: Examinations (`id`, `title`, `classId`, `subjectId`, `chapterId`, `description`, `instructions`, `startAt`, `loginDeadline`, `durationMinutes`, `totalMarks`, `passingPercentage`, `negativeMarkingEnabled`, `negativeMarkValue`, `randomizeQuestions`, `randomizeOptions`, `maxAttempts`, `resultVisibility`, `status`, `createdBy`).
   - `ExamQuestion`: Exam questions snapshot (`id`, `examId`, `questionId`, `questionSnapshot` JSON, `marks`, `orderNumber`).
   - `ExamGradingRule`: Grading tiers per exam (`id`, `examId`, `minPercentage`, `maxPercentage`, `label`, `displayOrder`).
   - `ExamAssignment`: Student-specific exam assignments (`id`, `examId`, `studentId`, `assignedAt`, `status`, `allowedAttempts`).
6. **Attempts, Answers & Results**:
   - `ExamAttempt`: Student attempt tracking (`id`, `examId`, `studentId`, `assignmentId`, `attemptNumber`, `startedAt`, `submittedAt`, `serverDeadline`, `autoSubmitted`, `status`).
   - `AttemptQuestion`: Deterministic student question & option ordering (`id`, `attemptId`, `examQuestionId`, `displayOrder`, `optionOrder` JSON, `questionSnapshot` JSON).
   - `AttemptAnswer`: Recorded answers (`id`, `attemptId`, `questionId`, `selectedOptions` JSON, `answerText`, `numericAnswer`, `isCorrect`, `marksAwarded`, `answeredAt`).
   - `Result`: Official evaluated results (`id`, `attemptId`, `studentId`, `examId`, `rawMarks`, `maximumMarks`, `percentage`, `grade`, `performanceLabel`, `passed`, `correctCount`, `wrongCount`, `unansweredCount`, `isOfficial`, `createdAt`).
   - `RetakeRequest`: Retake workflows (`id`, `examId`, `studentId`, `reason`, `status`, `requestedAt`, `reviewedAt`, `reviewedBy`, `reviewComment`).
7. **Attendance & Auditing**:
   - `AttendanceSession`: Class attendance sessions (`id`, `classId`, `date`, `startTime`, `endTime`, `studentCheckInEnabled`, `createdBy`).
   - `AttendanceRecord`: Individual attendance entries (`id`, `sessionId`, `studentId`, `status`, `markedAt`, `method`, `markedBy`).
   - `AuditLog`: System audit trail (`id`, `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `oldValue` JSON, `newValue` JSON, `ipAddress`, `createdAt`).
   - `SystemSetting`: Global configuration & defaults (`id`, `key`, `value` JSON, `updatedAt`).

---

## 3. Authentication & Authorization Architecture

- **Admin / Teacher**:
  - Login endpoint: `POST /api/auth/admin/login` (Username/Email + Password).
  - Password hashed using `bcryptjs` (salt rounds >= 10).
  - JWT generated with `userId`, `role`, `email`, signed with `AUTH_SECRET`.
  - Stored in HTTP-only, SameSite=Lax, Secure cookie `ml_admin_session`.
- **Student**:
  - Login endpoint: `POST /api/auth/student/login` (`rollNumber` + 4-digit numeric `pin`).
  - Queries active `StudentEnrollment` matching `rollNumber` and active `AcademicSession`.
  - Verifies entered PIN against `Student.pinHash`.
  - JWT generated with `studentId`, `rollNumber`, `classId`, `studentCode`, `role: "STUDENT"`.
  - Stored in HTTP-only, SameSite=Lax, Secure cookie `ml_student_session`.
- **Authorization Guard**:
  - Server-side middleware & domain utilities (`requireAdmin()`, `requireStudent()`, `requireOwnership()`).
  - Students cannot query any student ID, attempt, result, or exam assignment other than their own.

---

## 4. API Architecture

REST-style JSON route handlers with strict Zod validation:

```text
Auth:
  POST /api/auth/admin/login
  POST /api/auth/student/login
  POST /api/auth/logout
  GET  /api/auth/me

Students & Academic:
  GET    /api/students (filters: classId, sessionId, status, search, pagination)
  POST   /api/students (create student + enrollment)
  GET    /api/students/:id (full profile + academic history)
  PUT    /api/students/:id (update profile)
  POST   /api/students/:id/reset-pin (admin resets PIN)
  POST   /api/students/promote (bulk promotion)
  POST   /api/students/rollback (rollback promotion)
  GET    /api/classes
  GET    /api/subjects
  GET    /api/academic-sessions

Exams & Import:
  POST   /api/exams/import-preview (upload & validate HTML)
  POST   /api/exams/import (confirm import & create exam)
  GET    /api/exams (admin exam list)
  POST   /api/exams (manual creation)
  GET    /api/exams/:id
  PUT    /api/exams/:id
  POST   /api/exams/:id/assign (assign to class / selected students)
  GET    /api/student/exams (student assigned upcoming/available/completed)

Attempts & Examination:
  POST   /api/exams/:id/start (validate eligibility, start attempt & timer)
  GET    /api/attempts/:id (active exam payload without correct answers)
  PUT    /api/attempts/:id/answers (autosave answers)
  POST   /api/attempts/:id/submit (manual or auto-submit attempt)
  POST   /api/retakes/request (student requests retake)
  POST   /api/retakes/:id/review (admin approves/rejects retake)

Results & Analytics:
  GET    /api/results (list results)
  GET    /api/results/:id (detailed attempt & question analysis)
  GET    /api/analytics/student/:id (student performance & subject radar)
  GET    /api/analytics/admin/overview (KPIs, class trends, needs attention)
  GET    /api/leaderboards (pass rate, total marks, average %)

Attendance:
  POST   /api/attendance/sessions (create session / enable check-in)
  POST   /api/attendance/mark (teacher marks attendance)
  POST   /api/attendance/check-in (student self check-in)
  GET    /api/attendance/report (class & student attendance metrics)

Reports:
  GET    /api/reports/student/:id/card (printable report card)
  GET    /api/reports/export (CSV / Excel exports)
```

---

## 5. Frontend Architecture & Mobile-First Design

- **Next.js App Router Structure**:
  - `app/admin/`: Admin dashboard, student management, exam manager, HTML importer, results, analytics, attendance, settings.
  - `app/student/`: Student dashboard, exam room, instant results, analytics, attendance, profile.
  - `app/auth/`: Clean, accessible mobile-friendly login forms with PIN keypad support.
  - `components/ui/`: Reusable Tailwind components (Button, Input, Card, Modal, Table, Badge, Progress, Toast, Tabs, Select).
  - `components/exam/`: Student examination interface optimized for touch devices:
    - Sticky top bar: Exam title, question counter (`12 / 30`), autosave status (`✓ Saved` / `Saving...`), authoritative countdown timer.
    - Central card: Sanitized question text, responsive option selectors with clear touch targets (min 48px tap height).
    - Bottom navigation bar: Previous, Next, Clear, Review Palette drawer, Submit button with confirmation modal.
    - Offline detector with local state synchronization.

---

## 6. Exam Engine Architecture

1. **Start Eligibility Check**:
   - Verifies active student session.
   - Verifies valid assignment to student.
   - Verifies login window: `currentTimestamp >= startAt && currentTimestamp <= loginDeadline`.
   - Verifies attempt count: `currentAttempts < allowedAttempts`.
   - Checks if an `IN_PROGRESS` attempt already exists (resumes it if valid and deadline not passed).
2. **Deterministic Attempt Creation**:
   - Calculates `serverDeadline = startedAt + (durationMinutes * 60 * 1000)`.
   - If `randomizeQuestions` is true, generates randomized question sequence for student.
   - If `randomizeOptions` is true, randomizes option order per question.
   - Snapshots questions and options into `AttemptQuestion` records.
   - Strips `isCorrect`, `explanation`, and scoring keys from client response.
3. **Autosave & Network Resilience**:
   - Answers saved instantly on choice selection and debounced input.
   - Client caches unsaved answers in `sessionStorage` in case of connection drops; auto-retries when online.
4. **Auto-Submission**:
   - When client timer reaches `0:00` or server receives submission after `serverDeadline` (plus 15s network grace), the engine finalizes the attempt, flags `autoSubmitted = true`, and runs `GradingService`.

---

## 7. HTML Parser & Sanitization Engine

1. **Parser Pipeline**:
   - Input: Raw uploaded `.html` string / buffer.
   - Parsing: Server uses `cheerio` to locate `<script type="application/json" id="modern-learners-exam">`.
   - Validation: Parses JSON and validates against JSON Schema and Zod schema.
   - Verification:
     - Checks duplicate Question IDs.
     - Verifies MCQ has exactly 1 correct option.
     - Verifies True/False has boolean answer.
     - Verifies Multiple Correct has valid option flags.
     - Checks total marks: `sum(question.marks) === exam.totalMarks`.
   - Sanitization: Runs all question texts, option texts, and explanations through HTML sanitizer to strip any `<script>`, `<iframe>`, `onload`, inline JavaScript, or malicious links.
   - Preview Generation: Returns structured preview payload containing question counts by type and difficulty.
   - Admin Confirmation: Upon confirmation, writes Exam and Question records in a single database transaction.

---

## 8. Result & Grading Engine

1. **Server-Side Evaluation**:
   - For each `AttemptQuestion`:
     - Compares student's `selectedOptions` or answer value against snapshotted correct answer.
     - If correct: awards question marks.
     - If wrong: deducts negative marks if `negativeMarkingEnabled` is true; otherwise 0.
     - If unanswered: 0 marks.
2. **Grading Tier Resolution**:
   - Computes `percentage = (rawMarks / maximumMarks) * 100`.
   - Checks snapshotted `ExamGradingRule` tiers:
     - `100%`: OP — Outstandingly Perfect
     - `95–99.99%`: Outstanding
     - `90–94.99%`: Excellent
     - `80–89.99%`: Pass
     - `0–79.99%`: Fail — Needs Improvement
   - Determines `passed = percentage >= exam.passingPercentage`.
3. **Immutability & Official Attempt Tracking**:
   - Results are tied to specific attempt IDs and cannot be altered by students.
   - Multi-attempt policy (`FIRST`, `LATEST`, `BEST`, `MANUAL`) determines which result is marked `isOfficial = true` for aggregate analytics.

---

## 9. Performance Analytics & Needs-Attention Engine

1. **Student Dashboard Metrics**:
   - Overall Average %, Pass Rate %, Total Tests Attempted, Passed, Failed, Highest/Lowest score.
   - Subject breakdown (Mathematics, Physics, Chemistry, Biology, Computer).
   - Topic accuracy and difficulty accuracy (Easy vs Medium vs Hard).
   - Chronological performance trend.
2. **Admin Overview**:
   - KPI metrics across classes.
   - Subject-wise and class-wise performance heatmaps.
   - Rule-based **Needs-Attention Engine**:
     - `FAILED_LAST_EXAMS`: Failed 2 or more consecutive exams.
     - `DECLINING_TREND`: 3 consecutive score drops.
     - `LOW_SUBJECT_AVERAGE`: Subject average `< 60%`.
     - `LOW_ATTENDANCE`: Overall attendance `< 75%`.
     - `MISSED_ASSIGNMENTS`: Missed 2 or more active exams.
   - Displays clear, bulleted reasons alongside student name.

---

## 10. Attendance System

1. **Teacher Mode**:
   - Teacher selects Class and Date.
   - Displays student roster with fast one-tap toggles: `Present` / `Absent` / `Late`.
   - Quick "Mark All Present" button.
2. **Student Check-In Mode**:
   - Teacher opens a timed check-in window (e.g. 5:00 PM - 5:15 PM).
   - Active students in that class see a "Check In Now" banner.
   - Server verifies student enrollment, active window, and records check-in with timestamp and method `STUDENT_CHECKIN`.

---

## 11. Reports & Printable Output

1. **Printable Student Report Card**:
   - Professional, styled academic report card formatted with CSS `@media print` for high-resolution A4 printing or PDF saving.
   - Header: Saif Classes — Modern Learners official branding.
   - Student info, Roll Number, Class, Academic Session.
   - Summary stats: Overall %, Attendance %, Pass Rate.
   - Subject-wise test table with marks, grades, strengths, areas for improvement, and Teacher Remarks section.
2. **Data Exports**:
   - CSV / Excel export for Admin (Student lists, Class exam results, Attendance logs).

---

## 12. Testing Strategy

1. **Unit Tests**:
   - Roll number generation format (`08-2627-001`).
   - Grade & percentage calculation algorithms.
   - Negative marking calculations.
   - Server timer and deadline calculation.
   - Leaderboard sorting & tie-breaking logic.
   - Promotion and rollback movement engine.
2. **Integration Tests**:
   - Student & Admin authentication flows.
   - HTML Exam import parsing & validation.
   - Exam assignment & start eligibility guard.
   - Autosave answer persistence.
   - Attempt submission, auto-grading, and result creation.
   - Retake request and approval lifecycle.
   - Attendance check-in time-window enforcement.
3. **End-to-End User Journey**:
   - Complete lifecycle test from Student creation -> HTML import -> Exam assign -> Student login -> Timed exam -> Submit -> Instant result & analytics update.

---

## 13. Deployment Strategy (Free-First)

- **Platform**: Vercel or Node.js runtime for Next.js.
- **Database**: PostgreSQL (Neon, Supabase, or Railway free-tier compatible).
- **Storage**: Local/S3-compatible bucket for file assets and logos.
- **Zero-cost local testing**: Standalone PostgreSQL database setup with automated seeding script.

---

## 14. Security Strategy

- **Zero Client Trust**: All scoring, timing, eligibility, and grading logic strictly executed on the server.
- **Content Sanitization**: Uploaded HTML stripped of all executable scripts, event handlers, and remote frames.
- **Credential Protection**: Passwords and 4-digit PINs hashed with `bcryptjs`.
- **RBAC**: Protected routes with session verification; database queries scoped to student identity.
- **Audit Logging**: All administrative mutations (student edits, promotions, rollbacks, exam edits, retake reviews) logged to `AuditLog`.

---

## 15. Development Phases

- **Phase 1: Project Scaffolding & Foundation**:
  - Next.js 15+ App Router, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL connection.
  - Complete database schema & migrations.
  - Authentication engine (Admin credentials & Student Roll No + 4-digit PIN).
  - Reusable UI component library & layout system.
- **Phase 2: Academic & Student Management**:
  - Academic sessions, Classes (6-10), Subjects, Chapters, Topics.
  - Student creation, automated roll-number generator (`08-2627-001`), PIN reset.
  - Academic promotion & rollback engine with full audit tracking.
- **Phase 3: Question Bank & HTML Import Engine**:
  - Question Bank data models & tags.
  - HTML Exam parser (`#modern-learners-exam` JSON payload), schema validation, sanitization.
  - Admin exam import preview & confirmation workflow.
- **Phase 4: Exam Creation, Assignment & Scheduling**:
  - Exam configuration (duration, passing %, negative marking, randomization).
  - Class-based and individual student exam assignments.
  - Login availability windows and scheduling logic.
- **Phase 5: Student Examination Engine**:
  - Mobile-first exam room UI.
  - Server-authoritative timer & start validation.
  - Autosave answer mechanism & offline sync recovery.
  - Auto-submission on deadline expiration.
- **Phase 6: Automatic Evaluation & Instant Results**:
  - Server-side grading & negative marking.
  - Grading snapshot resolution (OP, Outstanding, Excellent, Pass, Fail).
  - Student & Admin result breakdown views.
  - Student retake request & Admin approval workflow.
- **Phase 7: Dashboards & Performance Analytics**:
  - Student performance dashboard & subject radar.
  - Admin dashboard with KPI cards and rule-based Needs-Attention engine.
- **Phase 8: Leaderboards & Attendance**:
  - Pass rate, Total marks, and Average % leaderboards with class/subject filters & privacy toggles.
  - Teacher attendance marking & student timed check-in engine.
- **Phase 9: Reports & Academic Report Cards**:
  - Mobile & desktop printable student report cards (`@media print`).
  - CSV / Excel data exports.
- **Phase 10: Verification, Automated Tests & Hardening**:
  - Comprehensive unit and integration test suite.
  - End-to-end user journey verification.
  - Performance optimization & production build validation.
