Absolutely. Below is the Technical Architecture Document (TAD) for Modern Learners — Saif Classes. This is the document I would give to OpenCode after the PRD, so it understands not just what to build, but how the system should be structured.

Modern Learners — Saif Classes

Technical Architecture Document (TAD)

Version: 1.0
Status: Development Blueprint
Product: Modern Learners — Saif Classes
Architecture Goal: Mobile-first, scalable, secure, low-cost academic examination and student performance platform.

⸻

1. Architecture Principles

The system must follow these principles:

1. Student identity must be permanent.
2. Academic roll numbers can change without changing the Student ID.
3. Historical academic records must never be destroyed by promotion, rollback, or deactivation.
4. Exam results must be reproducible.
5. Exam configuration must be snapshotted when an attempt begins.
6. Frontend must never be trusted for scoring or security-sensitive decisions.
7. Server/database must be the source of truth.
8. The application must be mobile-first.
9. V1 must work without paid infrastructure wherever practical.
10. Future modules must be addable without redesigning the core database.
11. HTML is an exam import/distribution format; the database becomes the long-term source of truth.
12. AI-generated evaluations are suggestions until approved by a teacher.
13. All important administrative actions must be auditable.

⸻

2. High-Level Architecture

                         INTERNET
                            │
                            ▼
                  ┌───────────────────┐
                  │   Web Application │
                  │   Mobile First    │
                  └─────────┬─────────┘
                            │
                  ┌─────────▼─────────┐
                  │ Authentication    │
                  │ & Authorization    │
                  └─────────┬─────────┘
                            │
              ┌─────────────▼─────────────┐
              │       Application API     │
              │                            │
              │ Students                   │
              │ Classes                    │
              │ Exams                      │
              │ Attempts                  │
              │ Results                   │
              │ Analytics                 │
              │ Attendance                │
              │ Reports                  │
              └─────────────┬─────────────┘
                            │
             ┌──────────────▼──────────────┐
             │          Database           │
             │                             │
             │ Students                    │
             │ Academic History             │
             │ Exams                       │
             │ Questions                   │
             │ Attempts                    │
             │ Answers                     │
             │ Results                     │
             │ Attendance                  │
             └─────────────────────────────┘

Future integrations:

                    Application API
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       WhatsApp          AI          Parent Portal

⸻

3. Recommended Technology Stack

The initial implementation should use a modern TypeScript-based stack.

Frontend

Next.js + React + TypeScript

Responsibilities:

* Admin interface
* Student interface
* Login
* Exam interface
* Dashboards
* Charts
* Leaderboards
* Attendance
* Responsive mobile UI

UI should be responsive from approximately 320px mobile width through desktop.

⸻

4. Backend

Use:

Next.js server-side APIs / Route Handlers

or a clearly separated backend service if the implementation later requires it.

TypeScript should be used across the application.

Benefits:

* Shared types
* Easier validation
* Easier maintenance
* Single codebase initially
* Good compatibility with free hosting

Business logic must remain on the server.

⸻

5. Database

Use a relational database.

Recommended:

PostgreSQL

The architecture should avoid depending on SQLite-specific behavior.

PostgreSQL is preferred because the system will eventually contain relationships between:

* students
* sessions
* classes
* subjects
* exams
* assignments
* questions
* attempts
* answers
* results
* attendance
* reports

⸻

6. ORM

Recommended:

Prisma ORM

Benefits:

* Type-safe database queries
* Migration system
* Good TypeScript integration
* Easy schema management
* Easier development for OpenCode

The Prisma schema becomes an important part of the technical contract.

⸻

7. Authentication

Authentication must distinguish between:

ADMIN
TEACHER
STUDENT
PARENT

V1 actively uses:

ADMIN
STUDENT

Teacher and Parent roles should exist architecturally but can remain disabled/inactive initially.

⸻

8. Student Authentication

Student login:

Roll Number
+
4-digit PIN

However, authentication must resolve the student to:

Permanent Student ID

Example:

STU-000001

The roll number is an academic identifier, not the permanent database identity.

⸻

9. PIN Security

The 4-digit PIN must never be stored as plaintext.

Store a secure hash.

Example:

student.pinHash

The application verifies the entered PIN against the hash.

Admin must be able to reset a student’s PIN.

⸻

10. Authorization

Every protected API endpoint must verify:

1. Authentication
2. Role
3. Resource ownership/permission

Example:

A student requests:

GET /api/results/student/123

The server must verify that the authenticated student actually owns that result.

A student must never be able to change a URL parameter and retrieve another student’s results.

⸻

11. Permanent Student Identity

Database:

Student
---------
id
studentCode
name
status
createdAt
updatedAt

Example:

id: UUID
studentCode: STU-000001

id is the true permanent identity.

⸻

12. Academic Session

Table:

AcademicSession
----------------
id
name
startDate
endDate
isActive
createdAt

Example:

2026-27
2027-28
2028-29

⸻

13. Student Academic Enrollment

Do not put only classId directly on Student.

Instead use an academic enrollment/history table.

StudentEnrollment
------------------
id
studentId
academicSessionId
classId
rollNumber
status
promotedFromEnrollmentId
createdAt
updatedAt

This allows:

Rahul
2026-27 → Class 6
2027-28 → Class 7
2028-29 → Class 8

without destroying history.

⸻

14. Roll Number Generation

Roll number format:

CLASS + SESSION + ROLL

Example:

06-2627-001

Components:

06    = Class
2627  = Academic session
001   = Roll

If necessary:

06-2627-101

Roll numbers must be generated by the server.

The system must guarantee uniqueness within the relevant academic session/class.

⸻

15. Promotion Engine

At the end of the academic session:

Class 6 → Class 7
Class 7 → Class 8
Class 8 → Class 9
Class 9 → Class 10

Promotion creates a new enrollment.

It must NOT overwrite the previous enrollment.

⸻

16. Promotion Audit

Table:

AcademicMovement
-----------------
id
studentId
fromEnrollmentId
toEnrollmentId
movementType
reason
performedBy
createdAt

Movement types:

PROMOTION
ROLLBACK
TRANSFER
MANUAL_CHANGE

This allows the system to report:

3 students rolled back during 2027-28.

⸻

17. Classes

Table:

Class
------
id
classNumber
name
isActive

Examples:

6
7
8
9
10

⸻

18. Subjects

Table:

Subject
--------
id
name
code
isActive

Examples:

MAT
PHY
CHEM
BIO
COMP

Subjects should be configurable.

Do not hard-code subjects into the frontend.

⸻

19. Class-Subject Relationship

Use:

ClassSubject
------------
id
classId
subjectId
isActive

This allows Class 9/10 Computer to use the appropriate curriculum.

⸻

20. Chapters

Chapter
--------
id
classId
subjectId
name
description
orderNumber
isActive

⸻

21. Topics

Topic
-----
id
chapterId
name
description
isActive

Hierarchy:

Class
  ↓
Subject
  ↓
Chapter
  ↓
Topic

⸻

22. Question Bank

Core table:

Question
--------
id
classId
subjectId
chapterId
topicId
questionType
difficulty
questionText
explanation
defaultMarks
isActive
createdAt
updatedAt

Question types:

MCQ
TRUE_FALSE
MULTIPLE_CORRECT
NUMERICAL
SHORT_ANSWER
LONG_ANSWER
IMAGE_BASED

⸻

23. Question Options

Separate table:

QuestionOption
---------------
id
questionId
optionKey
optionText
isCorrect
orderNumber

For example:

A → Newton
B → Joule
C → Watt
D → Pascal

Correct answers must be stored server-side.

They must never be exposed to a student before submission.

⸻

24. Question Difficulty

Allowed values:

EASY
MEDIUM
HARD

This enables:

Easy accuracy
Medium accuracy
Hard accuracy

analytics.

⸻

25. Question Versioning

Questions may change in the future.

Therefore an exam attempt must not depend on the current question-bank record.

When an exam is published/assigned, the question content used by the exam should be snapshotted.

This prevents:

Question changed later
       ↓
Old result suddenly becomes different

⸻

26. Exams

Core table:

Exam
----
id
name
classId
subjectId
chapterId
description
instructions
startAt
loginDeadline
durationMinutes
totalMarks
passingPercentage
negativeMarkingEnabled
negativeMarkValue
randomizeQuestions
randomizeOptions
maxAttempts
resultVisibility
createdBy
status
createdAt
updatedAt

Exam statuses:

DRAFT
PUBLISHED
ACTIVE
CLOSED
ARCHIVED

⸻

27. Exam Grading Snapshot

Each exam must store its own grading configuration.

Example:

ExamGradingRule
----------------
id
examId
minPercentage
maxPercentage
label
displayOrder

Example:

100–100  OP — Outstandingly Perfect
95–99   Outstanding
90–94   Excellent
80–89   Pass
0–79    Fail — Needs Improvement

Changing global settings must not change historical exams.

⸻

28. Exam Question Snapshot

Use:

ExamQuestion
------------
id
examId
questionId
questionSnapshot
marks
orderNumber

questionSnapshot should preserve the question as presented when appropriate.

This ensures old exams remain reproducible.

⸻

29. Exam Assignment

Table:

ExamAssignment
--------------
id
examId
studentId
assignedAt
status
approvedAttempts

Statuses:

ASSIGNED
STARTED
COMPLETED
EXPIRED
CANCELLED

When the admin assigns an exam to a class:

1. Find active students in that class.
2. Create assignment records.
3. Allow admin to deselect students.
4. Only selected students receive the assignment.

⸻

30. Exam Sets

Optional table:

ExamSet
-------
id
examId
name
version

Examples:

Set A
Set B
Set C

⸻

31. Randomized Exams

For each attempt, generate a deterministic question ordering.

Store:

AttemptQuestion
---------------
id
attemptId
questionId
displayOrder
optionOrder
questionSnapshot

This means Student A and Student B can receive different orders/questions while the system still knows exactly what each student saw.

⸻

32. Exam Attempt

Core table:

ExamAttempt
-----------
id
examId
studentId
assignmentId
attemptNumber
startedAt
submittedAt
autoSubmitted
durationSeconds
status

Statuses:

NOT_STARTED
IN_PROGRESS
SUBMITTED
AUTO_SUBMITTED
INVALIDATED

⸻

33. Attempt Answers

AttemptAnswer
-------------
id
attemptId
questionId
selectedOption
answerText
numericAnswer
isCorrect
marksAwarded
answeredAt
updatedAt

For future subjective questions:

aiSuggestedMarks
aiEvaluation
teacherApprovedMarks
teacherFeedback

⸻

34. Timer Architecture

The timer must be server-authoritative.

Do not rely only on JavaScript countdown.

When attempt starts:

serverStartTime
+
duration
=
serverDeadline

The frontend displays the countdown based on server data.

Server determines whether an answer/submission is still valid.

This prevents simple browser manipulation of the timer.

⸻

35. Auto-Save

Answers should be sent to the server periodically.

Recommended:

On answer change
+
periodic background save
+
before navigation

The UI should show:

✓ Saved

or:

Saving...

⸻

36. Offline/Network Recovery

The exam interface should use browser storage where practical to temporarily retain unsynced answers.

Example:

Student answers Q10
       ↓
Local state
       ↓
Server save

If network drops:

Local answer retained
       ↓
Connection restored
       ↓
Synchronize

The server remains the authoritative source.

⸻

37. Exam Start Validation

When a student opens an exam:

Server checks:

Authenticated?
        ↓
Correct student?
        ↓
Assigned?
        ↓
Active?
        ↓
Within login window?
        ↓
Attempts available?
        ↓
Exam active?

Only then:

START EXAM

⸻

38. Login Window vs Duration

Example:

Availability:
17:00 → 22:00
Duration:
90 minutes

Student starts:

17:00 → deadline 18:30
19:00 → deadline 20:30
21:00 → deadline 22:30

Default behavior:

Full configured duration is granted after a valid start.

A future configuration can optionally enforce:

Hard deadline at 22:00

⸻

39. Result Calculation

Scoring must happen on the server.

Example:

Correct = +1
Wrong = 0
Unanswered = 0

If negative marking is enabled:

Correct = +1
Wrong = -0.25
Unanswered = 0

The frontend must never be trusted to calculate official marks.

⸻

40. Result Record

Result
------
id
attemptId
studentId
examId
rawMarks
maximumMarks
percentage
grade
performanceLabel
passed
correctCount
wrongCount
unansweredCount
officialAttempt
createdAt

⸻

41. Historical Results

A result should retain the rules used to calculate it.

Therefore:

Result
  ↓
Exam
  ↓
Grading snapshot

If the administrator changes future passing criteria, historical results remain unchanged.

⸻

42. Retake System

Table:

RetakeRequest
-------------
id
examId
studentId
reason
status
requestedAt
reviewedAt
reviewedBy
reviewComment

Statuses:

PENDING
APPROVED
REJECTED

Approval creates/activates another allowed attempt.

⸻

43. Result Visibility

Exam-level configuration:

showScore
showCorrectAnswers
showWrongAnswers
showExplanations
showGrade
showTopicAnalysis

Default:

YES

Admin can override.

⸻

44. Performance Aggregation

Performance metrics should be calculated from official results.

Important metrics:

Average percentage
Pass rate
Total marks
Highest score
Lowest score
Tests attempted
Tests passed
Tests failed
Outstanding count
Excellent count
Improvement count

⸻

45. Subject Analytics

Example:

Student
  ↓
Physics      82%
Mathematics  76%
Chemistry    91%
Biology      73%
Computer     94%

Only exams assigned and officially counted should contribute.

⸻

46. Topic Analytics

Question-level tags allow:

Physics
 ├── Work       86%
 ├── Energy     79%
 ├── Power      61%
 └── Numerical  48%

Accuracy should be calculated from question-level results.

⸻

47. Difficulty Analytics

Calculate:

Easy accuracy
Medium accuracy
Hard accuracy

This allows teachers to identify whether a student has conceptual difficulty or difficulty with advanced questions.

⸻

48. Performance Trend

Use chronological official results.

Example:

Test 1 → 62%
Test 2 → 68%
Test 3 → 74%
Test 4 → 81%

Trend:

Improving

Trend detection should be based on a transparent calculation, not an opaque AI decision.

⸻

49. “Needs Attention” Engine

Possible rule-based signals:

Repeated Failures
Declining Trend
Low Subject Average
Low Topic Accuracy
Low Attendance
Repeated Missed Exams

Example:

Needs Attention:
- 3 consecutive failed exams
- Physics average below 60%
- Attendance below 75%

Thresholds must be configurable.

⸻

50. Leaderboards

Leaderboard calculations must be server-side.

Pass Rate

passed official exams
÷
eligible official exams
× 100

Total Marks

sum of official marks

Average Percentage

sum of official percentages
÷
number of eligible exams

Filters:

Class
Subject
Session
Date range

⸻

51. Leaderboard Privacy

Configuration:

leaderboardEnabled
showNames
showRollNumbers
showMarks
showPassRate
showClass

Default:

Enabled
Names visible
Roll numbers visible
Marks visible
Pass rate visible
Class visible

Admin can disable/change these later.

⸻

52. Attendance Architecture

Tables:

AttendanceSession
-----------------
id
classId
date
startTime
endTime
studentCheckInEnabled
createdBy
AttendanceRecord
----------------
id
sessionId
studentId
status
markedAt
method
markedBy

Statuses:

PRESENT
ABSENT
LATE

Methods:

TEACHER
STUDENT_CHECKIN

⸻

53. Student Check-In Security

Student check-in is only allowed when:

teacher enabled check-in
AND
current time is inside session window
AND
student belongs to class
AND
student is active

A student cannot arbitrarily mark themselves present.

⸻

54. Reports

Backend should expose report generation services.

Reports:

Student Report
Class Report
Subject Report
Exam Report
Attendance Report
Academic Session Report

Formats:

PDF
CSV
XLSX

⸻

55. API Architecture

Use REST-style APIs initially.

Example:

/api/auth/login
/api/students
/api/students/:id
/api/classes
/api/subjects
/api/chapters
/api/topics
/api/exams
/api/exams/:id
/api/exams/:id/assign
/api/exams/:id/start
/api/attempts/:id
/api/attempts/:id/answers
/api/attempts/:id/submit
/api/results
/api/results/:id
/api/leaderboards
/api/attendance
/api/reports

API names may change during implementation, but the separation of responsibilities must remain.

⸻

56. API Validation

Every API request must validate input.

Recommended:

Zod

Examples:

CreateStudentSchema
CreateExamSchema
SubmitAnswerSchema
CreateAttendanceSchema

Never trust raw client input.

⸻

57. Database Transactions

Use database transactions for important operations.

Especially:

Exam assignment

Create assignment records
+
create audit entry

Exam submission

Submit attempt
+
evaluate
+
create result

Promotion

Create new enrollment
+
record movement

Either the entire operation succeeds or it rolls back.

⸻

58. Audit Log

Important administrative operations must be recorded.

AuditLog
--------
id
actorId
actorRole
action
entityType
entityId
oldValue
newValue
timestamp
ipAddress

Examples:

STUDENT_CREATED
STUDENT_DEACTIVATED
STUDENT_PROMOTED
STUDENT_ROLLED_BACK
EXAM_CREATED
EXAM_ASSIGNED
EXAM_UPDATED
RETAKE_APPROVED
RESULT_RECALCULATED
GRADE_CHANGED

⸻

59. File Storage

Uploaded HTML files and future assets should not be stored directly inside the database.

Store files in object/file storage.

Database stores:

fileUrl
fileName
fileType
fileSize
uploadedBy
uploadedAt

Logo and report assets use the same architecture.

⸻

60. HTML Parser Security

Uploaded HTML is untrusted input.

Never render uploaded HTML directly with unrestricted permissions.

The parser must:

1. Validate structure.
2. Extract allowed fields.
3. Sanitize content.
4. Reject unsupported scripts.
5. Never execute arbitrary uploaded JavaScript on the main application origin.

This is especially important because the HTML contains exam content.

⸻

61. Exam Rendering

The preferred architecture is:

Uploaded HTML
      ↓
Parser
      ↓
Validated exam structure
      ↓
Database
      ↓
Safe exam renderer

The student should ideally receive a sanitized representation of the exam rather than arbitrary uploaded HTML executing inside the application.

⸻

62. Frontend State

Use a predictable state architecture.

Exam state:

Current question
Selected answers
Timer
Save status
Question navigation
Submission state

Server data should remain authoritative.

⸻

63. UI Architecture

Recommended structure:

app/
├── admin/
│   ├── dashboard
│   ├── students
│   ├── exams
│   ├── results
│   ├── analytics
│   ├── attendance
│   ├── leaderboard
│   └── settings
│
├── student/
│   ├── dashboard
│   ├── exams
│   ├── exam/[id]
│   ├── results
│   ├── performance
│   ├── leaderboard
│   └── attendance
│
└── auth/
    ├── login
    └── reset-pin

⸻

64. Design System

The application should use a reusable component system.

Components:

Button
Input
Select
Modal
Table
Card
Badge
Chart
Tabs
Dropdown
Toast
Dialog
DatePicker
Pagination

Do not create visually different versions of the same component throughout the application.

⸻

65. Mobile Exam Interface

Exam page priority:

┌───────────────────────┐
│ Physics Test          │
│ Question 12 / 30      │
│ ⏱ 41:32               │
├───────────────────────┤
│                       │
│ Question text         │
│                       │
│ ○ Option A            │
│ ○ Option B            │
│ ○ Option C            │
│ ○ Option D            │
│                       │
├───────────────────────┤
│ Previous    Next      │
└───────────────────────┘

Timer must remain visible.

⸻

66. Dashboard Charts

Use a charting library compatible with React.

Charts:

* Line chart — performance over time
* Bar chart — subject performance
* Bar chart — topic performance
* Donut/pie — pass/fail distribution
* Distribution — grades
* Attendance trend

Charts must have accessible tabular alternatives where practical.

⸻

67. Search & Filtering

Admin needs global search.

Students:

Name
Roll number
Student ID
Class
Status

Exams:

Name
Subject
Class
Date
Status

Results:

Student
Exam
Class
Subject
Date
Grade
Pass/Fail

⸻

68. Pagination

Never load thousands of records into the browser.

All large datasets must use:

Server-side pagination

Examples:

20 / 50 / 100 records per page

⸻

69. Performance

Dashboard queries should use aggregation queries or precomputed summaries when necessary.

If the system eventually reaches thousands of students/tests, performance should not depend on downloading all results to the browser.

⸻

70. Caching

Public/mostly-static information can be cached.

Do not cache sensitive student results in a way that could expose another student’s data.

⸻

71. Security Boundaries

Sensitive operations must require Admin/Teacher authorization:

Change marks
Change grading
Approve retake
Promote student
Rollback student
Deactivate student
Create exam
Assign exam
View all student data

Students can only:

View own data
Take assigned exams
Request retake
Check attendance where enabled
View allowed leaderboard

⸻

72. Result Integrity

After official submission:

Student cannot modify answers
Student cannot modify marks
Student cannot modify grade

If an admin changes a result:

AuditLog
+
old result
+
new result
+
reason
+
admin
+
timestamp

⸻

73. AI Architecture

AI must be an optional service layer.

Application
     ↓
AI Evaluation Service
     ↓
AI Provider

Do not hard-code the entire application to one AI provider.

This allows future switching between:

* OpenAI
* Gemini
* Other compatible providers

The AI output should be structured:

suggestedMarks
maximumMarks
confidence
reasoningSummary
strengths
missingPoints

Teacher approval creates the official marks.

⸻

74. WhatsApp Architecture

Future:

Notification Service
        ↓
WhatsApp Provider

Application events can trigger:

EXAM_ASSIGNED
EXAM_REMINDER
RESULT_PUBLISHED
ATTENDANCE_ALERT
REPORT_READY

The notification system should be event-based so WhatsApp isn’t deeply embedded into exam logic.

⸻

75. Event Architecture

Initially events can be handled internally.

Examples:

ExamAssigned
ExamStarted
ExamSubmitted
ResultGenerated
RetakeRequested
RetakeApproved
StudentPromoted
StudentRolledBack
AttendanceMarked

Future notification/AI services can subscribe to these events.

⸻

76. Environment Configuration

Secrets must never be committed to Git.

Use environment variables:

DATABASE_URL
AUTH_SECRET
STORAGE_KEY
AI_API_KEY
WHATSAPP_API_KEY

Use:

.env.local

locally and platform secrets in production.

⸻

77. Development Environments

Maintain:

Development
Testing
Production

At minimum:

Local development
Production deployment

Do not develop directly against the production database.

⸻

78. Database Migrations

All schema changes must be migration-based.

Example:

migration_001_initial
migration_002_question_bank
migration_003_attendance

Never manually modify the production schema without a migration.

⸻

79. Seed Data

Development database should have seed data:

Admin
Classes 6–10
Subjects
Example students
Example chapters
Example questions
Example exam
Example results

This allows OpenCode to test the UI without requiring real students.

⸻

80. Automated Testing

At minimum:

Unit tests

* Grade calculation
* Pass/fail
* Leaderboard calculation
* Promotion
* Rollback
* Timer calculation
* Negative marking

Integration tests

* Login
* Exam assignment
* Exam start
* Answer save
* Exam submission
* Result creation
* Retake approval

End-to-end

Important student journey:

Login
→ Exam
→ Start
→ Answer
→ Submit
→ Result

⸻

81. Critical Exam Tests

The following scenarios must be tested:

Student starts exam
Student refreshes page
Student closes browser
Network temporarily disconnects
Timer expires
Student attempts after deadline
Student attempts exam not assigned
Student tries another student's exam
Student attempts after maximum attempts
Admin approves retake
Student submits second attempt

⸻

82. Deployment Architecture

Initial deployment should prioritize free tiers.

Conceptually:

Git Repository
      │
      ▼
Web Hosting
      │
      ├── Next.js
      │
      └── API
           │
           ▼
      PostgreSQL
           │
           ▼
      File Storage

The exact providers should be selected after checking their current free-tier limits at deployment time.

⸻

83. Backup Strategy

Database backups are essential.

At minimum:

Automated database backup
+
periodic export

The backup strategy must be documented before real student data is introduced.

⸻

84. Data Retention

Student academic history should remain available after:

* student deactivation
* class promotion
* rollback
* academic-session transition

Permanent deletion should be an explicit administrative operation with safeguards.

⸻

85. Privacy

Student information is private academic data.

The application must minimize exposure.

Public leaderboard configuration must be controlled by Admin.

Parent access must only expose their linked child’s information.

Students must not access private teacher analytics.

⸻

86. Future Parent Data Model

Plan:

Parent
------
id
name
phone
email
status

Relationship:

ParentStudent
-------------
parentId
studentId
relationship

A parent may eventually have multiple children.

⸻

87. Future Homework Architecture

Future:

Homework
Assignment
Submission
Grade
Feedback

This should use the same:

Class
Subject
Chapter
Topic
Student

relationships already created for exams.

⸻

88. Future Question Bank Exam Generator

Eventually:

Teacher selects:
Class 8
Physics
Work Energy Power
20 Questions
Easy: 5
Medium: 10
Hard: 5

Question generator:

Question Bank
      ↓
Filtering
      ↓
Selection
      ↓
Randomization
      ↓
Exam

⸻

89. Repository Structure

Recommended initial repository:

modern-learners/
│
├── app/
├── components/
├── lib/
│   ├── auth/
│   ├── exam/
│   ├── grading/
│   ├── analytics/
│   ├── attendance/
│   └── reports/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
│
├── tests/
│
├── types/
│
├── docs/
│   ├── PRD.md
│   ├── TAD.md
│   └── EXAM_FORMAT.md
│
├── .env.example
├── package.json
└── README.md

⸻

90. Development Rule for OpenCode

OpenCode must follow:

Do not rewrite unrelated working modules.

Every feature should:

1. Inspect existing architecture.
2. Reuse existing components.
3. Reuse existing types.
4. Reuse existing services.
5. Add tests.
6. Run tests.
7. Run lint/type checking.
8. Only then mark the feature complete.

⸻

91. No Fake Functionality

OpenCode must not create UI buttons that appear functional but do nothing.

If a feature isn’t implemented:

Not implemented

is preferable to fake behavior.

Every completed feature must work end-to-end.

⸻

92. No Hard-Coded Academic Data

Do not hard-code:

Class 6
Class 7
Physics
80% passing

into UI logic.

These should come from configuration/database wherever appropriate.

Default values can be seeded.

⸻

93. No Hard-Coded Student Data

Students must always come from the database.

Never use mock students in production.

Mock students only belong in development seed data.

⸻

94. Core Domain Separation

Keep these services logically separate:

StudentService
AcademicService
ExamService
QuestionService
AttemptService
GradingService
AnalyticsService
LeaderboardService
AttendanceService
ReportService
NotificationService
AIService

This is important for future expansion.

⸻

95. Source of Truth

For each major entity:

Students       → Database
Classes        → Database
Questions      → Database
Exams          → Database
Assignments    → Database
Attempts       → Database
Results        → Database
Attendance     → Database

Frontend state is temporary.

⸻

96. V1 Definition of Done

V1 is considered complete when:

Authentication

* Admin login works.
* Student login works.
* Student PINs are secure.

Students

* Add student.
* Edit student.
* Deactivate student.
* Generate roll number.
* Maintain permanent Student ID.
* Promote students.
* Rollback students.
* Preserve history.

Exams

* Create exam.
* Upload supported HTML.
* Parse questions.
* Assign to class.
* Deselect students.
* Schedule exam.
* Set duration.
* Randomize questions/options.
* Start exam.
* Autosave.
* Timer.
* Auto-submit.

Results

* Automatic scoring.
* Configurable grading.
* Pass/fail.
* Correct answers.
* Wrong answers.
* Explanations.
* Retake request.
* Admin approval.

Analytics

* Student dashboard.
* Teacher dashboard.
* Subject analytics.
* Topic analytics.
* Difficulty analytics.
* Performance trends.
* Needs-attention indicators.

Leaderboards

* Pass rate.
* Total marks.
* Average percentage.
* Filters.
* Privacy settings.

Attendance

* Teacher marking.
* Student check-in when enabled.
* Attendance statistics.

Reports

* PDF.
* CSV.
* Excel.
* Printable report card.

⸻

97. Development Priority

Implementation order:

01 Foundation
02 Database
03 Authentication
04 Student Management
05 Academic Sessions
06 Promotion/Rollback
07 Question Model
08 HTML Exam Import
09 Exam Creation
10 Exam Assignment
11 Exam Engine
12 Timer/Autosave
13 Scoring
14 Grading
15 Results
16 Retakes
17 Student Dashboard
18 Admin Dashboard
19 Analytics
20 Leaderboards
21 Attendance
22 Reports
23 Security Hardening
24 Testing
25 Deployment

Do not start AI evaluation, WhatsApp, or parent accounts until the core examination system is stable.

⸻

98. Architectural Goal

The final architecture should allow this evolution:

                    MODERN LEARNERS
                    SAIF CLASSES
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
     Exams             Students          Attendance
       │                  │                  │
       ├──────────────┐   │                  │
       │              │   │                  │
 Question Bank     Results│             Reports
       │              │   │                  │
       └──────────────┼───┘                  │
                      │                      │
                 Analytics                   │
                      │                      │
          ┌───────────┼────────────┐         │
          │           │            │         │
       Parents       AI         WhatsApp   Homework
          │           │            │         │
          └───────────┴────────────┴─────────┘

The important point is that V1 must not be architected as a disposable MCQ website. It should be the foundation of the complete Modern Learners academic platform.

My recommendation for the next step

Before giving this to OpenCode, the next document should be #3: Modern Learners HTML Exam Format Specification.

That document is particularly important because your whole workflow depends on:

Create HTML → Upload HTML → Parse → Assign → Student takes exam → Automatic evaluation

It should define the exact HTML structure, metadata, question IDs, options, correct answers, marks, topics, difficulty, future subjective questions, images, and randomization rules.

Once we have that, you can give PRD + TAD + HTML Format Specification to OpenCode and tell it to first architect the project, rather than blindly start coding.