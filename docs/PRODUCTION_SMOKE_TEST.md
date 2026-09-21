# Production Smoke Test Procedure — Modern Learners (Saif Classes)

Execute this rapid 10-minute smoke test immediately following deployment to Vercel and Neon to verify core operational integrity on production infrastructure.

---

## 1. Quick Verification Matrix

| Area | Target URL | Test Action | Expected Result | Pass/Fail |
|---|---|---|---|---|
| **Landing** | `/` | Open homepage | Renders brand header, Student and Teacher login portals. | [ ] |
| **Admin Auth** | `/auth/admin-login` | Sign in with `admin` / `<your-configured-admin-password>` | Redirects to `/admin`. Cookie `ml_admin_session` set with `HttpOnly` and `Secure`. | [ ] |
| **Student Create** | `/admin/students` | Click **Add Student** -> `Smoke Test Student`, Class 8, PIN `1234` | Student created with `STU-000001` and roll `08-2627-001`. | [ ] |
| **Exam Import** | `/admin/exams/import` | Click **Load Sample Class 8 Paper** -> **Confirm & Import Exam** | 4-question exam created with immutable question snapshots. | [ ] |
| **Assignment** | `/admin/exams/[id]/assign` | Assign exam to Class 8 student roster | Assignment created with status `ASSIGNED`. | [ ] |
| **Student Auth** | `/auth/student-login` (Incognito) | Log in with Roll `08-2627-001` + PIN `1234` | Authenticates and lands on `/student`. | [ ] |
| **Exam Start** | `/student/exams/[id]` | Click **Start Examination** | Enters exam room. Authoritative countdown timer begins (`30:00`). | [ ] |
| **Autosave** | `/student/exams/[id]` | Select Option B for Q1 | Pill shows `Saving...` then `✓ Saved`. | [ ] |
| **In-Exam Refresh** | `/student/exams/[id]` | Refresh browser page (`F5`) | Attempt resumes with Option B selected and timer intact. | [ ] |
| **Submission** | `/student/exams/[id]` | Complete remaining questions and click **Submit Exam** | Attempt finalized (`SUBMITTED`) and scored server-side. | [ ] |
| **Student Result** | `/student/results/[id]` | View result details | Displays Score `5/5` (100%), Grade `OP`, and question review. | [ ] |
| **Analytics** | `/student/performance` | Open performance dashboard | Overall average shows `100%`, Pass rate `100%`. | [ ] |
| **Leaderboard** | `/student/leaderboard` | View public standings | Student appears at **Rank #1**. | [ ] |
| **Attendance Check-In** | `/student/attendance` | Admin opens session at `/admin/attendance` -> Student clicks **Check In Now** | Status updates to `PRESENT` via `STUDENT_CHECKIN`. | [ ] |
| **Report Card & Remark** | `/admin/students/[id]/report-card` | Admin adds remark -> Student opens `/student/report-card` | A4 report card renders with teacher remarks. Print dialog opens cleanly. | [ ] |
| **Security: Isolation** | `/api/students` (as Student) | Attempt direct GET request | Returns `401 Unauthorized`. | [ ] |
| **Security: Another Student** | `/student/results/[other_id]` | Attempt viewing unauthorized result ID | Returns `400 / 401 Unauthorized`. | [ ] |

---

## 2. Pass Criteria
- All 17 verification checkpoints pass without console errors or server 500 crashes.
- Database records are persisted in Neon PostgreSQL.
- Sessions remain secure and isolated.
