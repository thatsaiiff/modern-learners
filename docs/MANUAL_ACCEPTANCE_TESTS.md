# Manual Acceptance Test Plan — Modern Learners (Saif Classes)

**Purpose**: Verify the complete end-to-end user journeys using real database records across both Admin and Student roles.

---

## Test Environment Setup
1. Ensure the PostgreSQL database is connected via `DATABASE_URL` in `.env`.
2. Seed initial academic data:
   ```bash
   npm run prisma:seed
   ```
3. Start the application server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:3000`.

---

## Journey 1: Admin Authentication & Student Onboarding

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1.1 | Navigate to `/auth/admin-login`. | Admin login form renders with username and password inputs. | |
| 1.2 | Enter username `admin` and password `<your-configured-admin-password>`. Click **Sign In**. | Redirects to `/admin` dashboard. Admin session cookie `ml_admin_session` is set. | |
| 1.3 | Click **Students** in sidebar or navigate to `/admin/students`. | Student management table renders showing total student count. | |
| 1.4 | Click **Add Student** button. | Add Student modal opens. | |
| 1.5 | Enter Name: `Rahul Sharma`, Class: `Class 8`, click **Generate PIN** (e.g. `1234`), Phone: `9876543210`. Click **Create Student & Enroll**. | Student is created inside a database transaction. Modal closes. Student appears in table with permanent ID `STU-000001` and roll number `08-2627-001`. | |

---

## Journey 2: HTML Exam Import & Class Assignment

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 2.1 | Navigate to `/admin/exams/import`. | HTML Importer page renders with file dropzone and raw markup editor. | |
| 2.2 | Click **Load Sample Class 8 Paper**. | Sample compliant HTML paper is populated in the editor. | |
| 2.3 | Inspect the live **Exam Import Preview** card. | Validation passes (`✓ Validation Passed`). Shows 4 questions (MCQ, True/False, Multiple Correct, Numerical), 5 total marks, duration 30 mins. | |
| 2.4 | Click **Confirm & Import Exam to Database**. | Exam and immutable question snapshots are saved in database. Success banner appears with link to view details. | |
| 2.5 | Navigate to `/admin/exams/[id]/assign` (Assign Exam). | Class 8 enrolled student roster renders with checkboxes. Rahul Sharma (`08-2627-001`) is checked. | |
| 2.6 | Leave Allowed Attempts: `1`, verify availability start and deadline, click **Assign to 1 Student**. | Assignment is created (`ExamAssignment` with status `ASSIGNED`). | |

---

## Journey 3: Student Login & Secure Examination Room

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 3.1 | Open an Incognito window / new browser profile and navigate to `http://localhost:3000/auth/student-login`. | Student login form renders. | |
| 3.2 | Enter Roll Number: `08-2627-001` and 4-digit PIN: `1234`. Click **Login to Student Portal**. | Authenticates successfully. Redirects to `/student` dashboard. Shows `Rahul Sharma`, Class 8, Roll `08-2627-001`. | |
| 3.3 | Under **Available Examinations**, locate the assigned exam and click **Start Examination**. | Enters `/student/exams/[id]`. Server validates eligibility, starts attempt #1, records `startedAt` and authoritative `serverDeadline` (30:00 countdown). | |
| 3.4 | Inspect Question 1 (MCQ). Select option `B` (Joule). | Option is selected. Autosave pill shows `Saving...` then changes to `✓ Saved`. | |
| 3.5 | Navigate to Question 2 (True/False). Select `TRUE`. | Response is saved automatically. | |
| 3.6 | Navigate to Question 3 (Multiple Correct). Select `Work` (A) and `Energy` (B). | Both options are selected. Response is saved. | |
| 3.7 | Navigate to Question 4 (Numerical). Enter `50`. | Value is recorded and saved. | |
| 3.8 | **Test Refresh / Recovery**: Refresh the browser page (`F5` / `Cmd+R`). | Attempt is resumed seamlessly. Same attempt ID is retrieved; all 4 saved answers and remaining countdown timer are fully restored. | |
| 3.9 | Click **Question Palette** button. | Drawer opens showing all 4 question numbers highlighted green (Answered). | |
| 3.10 | Click **Submit Exam** → Confirm Final Submission. | Attempt is finalized on the server (`SUBMITTED`), scored immediately, and submission confirmation screen renders. | |

---

## Journey 4: Instant Evaluation, Results & Analytics

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 4.1 | As student, navigate to `/student/results`. | Results list renders showing `Work & Energy Test 1`, Score `5 / 5`, Percentage `100%`, Grade `OP`, and Status `PASSED`. | |
| 4.2 | Click **View Result Details** (`/student/results/[id]`). | Detailed result page opens showing Score hero banner, duration, KPI breakdown (4 correct, 0 wrong), Topic accuracy (100%), and question-by-question review with correct answers and explanations. | |
| 4.3 | Navigate to `/student/performance`. | Performance dashboard displays Overall Average `100%`, Pass Rate `100%`, score progression trend, and subject breakdown. | |
| 4.4 | Navigate to `/student/leaderboard`. | Public Leaderboard renders showing Rahul Sharma at **Rank #1** with `100%` average. | |

---

## Journey 5: Retake Request & Multi-Attempt Policy

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 5.1 | On student result page `/student/results/[id]`, click **Request Retake**. Enter Reason: `Revision and practice`. Click **Submit Retake Request**. | Request is created in `RetakeRequest` table with status `PENDING`. | |
| 5.2 | In Admin window, navigate to `/admin/retakes`. | Retake queue displays pending request for Rahul Sharma. | |
| 5.3 | Click **Approve Retake** (+1 Attempt) → Confirm Approval. | Request updates to `APPROVED`. `ExamAssignment.allowedAttempts` increments to `2`. Status resets to `ASSIGNED`. | |
| 5.4 | In Student window, navigate to `/student` -> clicks **Start Examination** for Attempt #2. | Creates new Attempt #2. Student submits with score 80% (Pass). | |
| 5.5 | Verify Official Attempt: Under `BEST` multi-attempt rule, Attempt #1 (100%) remains `isOfficial: true` for analytics and leaderboards. | Attempt #1 continues to represent the student's official score. | |

---

## Journey 6: Attendance Session & Student Check-In

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 6.1 | In Admin window, navigate to `/admin/attendance` -> click **New Attendance Session**. | Modal opens. Select Class 8, start time = 5 mins ago, end time = +1 hour, check **Allow Student Self Check-In**. Click **Create Session**. | |
| 6.2 | In Student window, navigate to `/student/attendance`. | Live banner appears: **Live Attendance Window Open** with **Check In to Class Now** button. | |
| 6.3 | Student clicks **Check In to Class Now**. | Server validates window, records `AttendanceRecord` with status `PRESENT` and method `STUDENT_CHECKIN`. | |
| 6.4 | In Admin window, open session roster `/admin/attendance/[id]`. | Rahul Sharma is marked `PRESENT` with badge `Self Check-in`. | |

---

## Journey 7: Official Academic Report Card & Teacher Remarks

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 7.1 | In Admin window, navigate to `/admin/students/[id]/report-card`. | Official Academic Report Card renders for Rahul Sharma. | |
| 7.2 | Click **Edit Teacher Remarks**. Enter: `Outstanding problem-solving and conceptual physics understanding.` Click **Save Remarks**. | Remarks are persisted in `TeacherRemark` table and updated in the report card. | |
| 7.3 | In Student window, navigate to `/student/report-card`. | Official A4 Printable Report Card renders with academy header, student metadata, subject performance table, attendance %, strengths, and teacher remarks. | |
| 7.4 | Click **Print / Save PDF**. | Browser print dialog opens formatted with CSS `@media print` for clean A4 vector export without navigation buttons. | |

---

## Journey 8: Academic Promotion & Rollback History

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 8.1 | In Admin window, navigate to `/admin/students/promotion`. | Promotion & Rollback manager renders. | |
| 8.2 | Select From Class: `Class 8`, Target Session: `2027-28`. Click **Execute Academic Promotion**. | Batch promotion succeeds. Rahul is enrolled in Class 9 in 2027-28 with new roll number `09-2728-001`. Class 8 enrollment transitions to `PROMOTED`. `AcademicMovement` record is logged. | |
| 8.3 | Verify Historical Data: Navigate to `/admin/students/[id]`. | Full academic history timeline displays both Class 8 (`2026-27`) and Class 9 (`2027-28`). Class 8 results and report card remain fully accessible. | |
| 8.4 | Perform Rollback: In promotion manager, enter Rahul's Class 9 Enrollment ID and reason `Repeating Class 8 foundations`. Click **Rollback Student Promotion**. | Class 9 enrollment updates to `ROLLED_BACK`, Class 8 enrollment is restored to `ACTIVE`. `AcademicMovement` (`ROLLBACK`) is recorded. **Students Rolled Back** KPI increments by 1. | |
