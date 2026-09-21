Yes — OpenCode + OmniRoute is enough to build this website, especially if you use it as the coding agent and give it a strong PRD/specification. But for a system this large, I would not ask OpenCode to build the entire thing in one prompt. We should give it the PRD, establish the architecture, then build it module-by-module and test each module.

Modern Learners — Saif Classes

Product Requirements Document (PRD) — V1

Product: Modern Learners — Saif Classes
Type: Tuition Academic Management & Student Performance Platform
Primary users: Admin/Teacher, Students
Future user: Parents
Primary device: Mobile-first web application
Initial cost target: ₹0 / free-tier hosting where practical

⸻

1. Product Vision

Modern Learners — Saif Classes will be a centralized academic platform where:

Students → receive assigned exams → take exams → receive instant results → performance is recorded → analytics identify strengths/weaknesses → teacher manages academic progress.

The system will eventually evolve into a complete tuition-management platform containing:

* Exams
* Question bank
* Performance analytics
* Attendance
* Homework
* Assignments
* Study material
* Parent dashboard
* AI subjective evaluation
* Notifications
* WhatsApp integration

However, V1 will concentrate on the academic examination and performance system.

⸻

2. Academic Structure

Classes

The platform initially supports:

* Class 6
* Class 7
* Class 8
* Class 9
* Class 10

Subjects

General:

* Mathematics
* Physics
* Chemistry
* Biology
* Computer

Class 9/10 Computer:

* BlueJ / Java

The subject system must be configurable so additional subjects can be created later.

⸻

3. Academic Sessions

Example:

2026–27

The platform maintains academic sessions.

At the end of the academic year, the system can automatically promote:

Class 6 → Class 7
Class 7 → Class 8
Class 8 → Class 9
Class 9 → Class 10

Students who complete Class 10 leave the active academic progression.

Rollback

Admin can manually roll a student back.

Example:

Student
2026–27 → Class 8
Promotion:
2027–28 → Class 9
Admin rollback:
2027–28 → Class 8

The system must preserve:

* Promotion history
* Rollback history
* Date
* Previous class
* New class
* Reason
* Admin who performed the action

Dashboard statistic:

Students rolled back this academic year: 3

⸻

4. Student Identity

Students receive a permanent internal Student ID.

Example:

STU-000001

This never changes.

The academic roll number is separate.

⸻

5. Roll Number System

The user prefers:

06 2627 001

Conceptually:

06     = Class
2627   = Academic session
001    = Roll number

Example:

06-2627-001

Class 8:

08-2627-001

Class 10:

10-2627-001

If more than 99 students exist:

06-2627-101

If 1,000+ students eventually exist, the numeric roll portion can expand without changing the Student ID architecture.

The system should generate these automatically.

⸻

6. Student Profile

Each student has:

Permanent Student ID
Name
Current Roll Number
Class
Section (optional)
Academic Session
Password/PIN
Status
Date Joined
Profile Photo (optional)

Status

* Active
* Inactive
* Archived

Students leaving tuition are deactivated, not deleted.

Historical records remain intact.

⸻

7. Student Authentication

Students login using:

Roll Number + 4-digit numeric PIN

Example:

Roll Number:
08-2627-017
PIN:
••••

After login, the system identifies the student through the permanent Student ID.

The student should not be able to enter another student’s roll number after authentication.

⸻

8. Admin / Teacher Authentication

V1:

Admin account

Architecture must support multiple teachers later.

Roles:

ADMIN
TEACHER
STUDENT
PARENT (future)

Admin has full control.

Teacher permissions can be introduced later without redesigning the database.

⸻

9. Exam Creation

Admin can create an examination.

Fields:

Exam Name
Class
Subject
Chapter
Topics
Description
Instructions
Total Questions
Total Marks
Passing Percentage
Duration
Exam Start Date
Exam Start Time
Exam End Date
Exam End Time
Negative Marking
Question Randomization
Option Randomization
Maximum Attempts
Result Visibility
Question/Answer Explanation Visibility

⸻

10. HTML Exam Upload

Admin can upload a prepared HTML question paper.

The HTML must contain machine-readable:

* Question
* Options
* Correct answer
* Marks
* Question ID
* Topic
* Difficulty
* Question type

The platform parses the uploaded HTML.

Admin then confirms:

Class: 8
Subject: Physics
Chapter: Work Energy Power

and assigns the exam.

⸻

11. Question Bank Architecture

Even though complete question-bank management can be expanded later, V1 database architecture must support it.

Structure:

Class
 ↓
Subject
 ↓
Chapter
 ↓
Topic
 ↓
Question
 ↓
Question Type
 ↓
Difficulty
 ↓
Answer
 ↓
Marks

Question types:

V1

* MCQ
* True/False
* Multiple correct
* Numerical

Future

* Short answer
* Long answer
* Image-based
* Diagram-based

⸻

12. Question Tags

Each question can have:

Topic
Chapter
Difficulty
Question Type
Marks

Difficulty:

* Easy
* Medium
* Hard

This enables advanced analytics later.

⸻

13. Exam Assignment

When Admin selects:

Class 8

the system automatically selects all active Class 8 students.

Admin can deselect individual students.

Example:

☑ 08-2627-001 Rahul
☑ 08-2627-002 Armaan
☐ 08-2627-003 Zaid
☑ 08-2627-004 Sameer

The exam is assigned only to selected students.

⸻

14. Multiple Paper Sets

The system must support:

Set-based exams

Set A
Set B
Set C

and:

Randomized exams

Questions may be randomized per student.

Options may also be randomized.

The exact questions and option ordering shown to each student must be permanently recorded with the attempt.

⸻

15. Exam Scheduling

An exam has a login window.

Example:

Exam availability:
5:00 PM
       ↓
       ↓ Students can enter
       ↓
10:00 PM

A student must log in/start within this window.

However, the window does NOT mean:

“Student gets 5 hours to write the exam.”

Example:

Exam window:
5 PM – 10 PM
Exam duration:
90 minutes

Student starts at:

5:00 PM → gets 90 minutes

Student starts at:

8:30 PM → gets 90 minutes

Student starts at:

9:00 PM → gets 90 minutes

Student starts at:

10:01 PM → ❌ Cannot start

This matches your requirement.

Important edge case

If a student starts at 9:45 PM and has a 90-minute exam, the system should allow the full 90 minutes unless you specifically configure a hard exam-end time.

We should therefore have:

End exam at availability-window end? YES/NO

Default:

NO

⸻

16. Exam Timer

When student clicks:

START EXAM

the system:

1. Creates an attempt
2. Starts timer
3. Saves answers automatically
4. Records start time
5. Records expected submission time

Example:

Start: 8:30 PM
Duration: 90 minutes
Auto-submit:
10:00 PM

When timer reaches zero:

Automatically submit.

⸻

17. Auto-Save

Answers must automatically save.

For example:

Question 1 → saved
Question 2 → saved
Question 3 → saved

The student should not lose answers because of accidental navigation or a temporary network interruption.

Mobile experience is particularly important.

⸻

18. Exam Attempt

Default:

One attempt.

Student can request another attempt.

Workflow:

Student
 ↓
Request Retake
 ↓
Admin dashboard
 ↓
Approve / Reject
 ↓
If approved
 ↓
New attempt enabled

Admin can configure maximum attempts per exam.

⸻

19. Result Selection

If multiple attempts exist:

Admin chooses which attempt counts.

Options:

* First
* Latest
* Best
* Teacher-selected

The selected result is the result used for official performance analytics.

⸻

20. Grading

Default:

Percentage	Performance
100%	OP — Outstandingly Perfect
95–99%	Outstanding
90–94%	Excellent
80–89%	Pass
≤79%	Fail — Needs Improvement

Default passing:

80%

Everything is configurable.

Each exam stores its own grading rules.

Therefore changing the global grading system does not modify historical results.

⸻

21. Result Page

Immediately after submission, the student can see:

Score
Percentage
Grade
Pass/Fail
Correct answers
Wrong answers
Unanswered questions
Correct answer
Explanation
Time taken

Teacher controls whether these are visible for each exam.

⸻

22. Improvement Analysis

If a student fails or performs poorly, the system identifies relevant weak areas.

Example:

Physics — 64%
Strong:
✓ Work — 87%
✓ Energy — 82%
Needs Improvement:
⚠ Power — 58%
⚠ Numericals — 42%

Question tags make this possible.

⸻

23. Student Performance Dashboard

Student sees:

Overall Average
Pass Rate
Tests Attempted
Tests Passed
Tests Failed
Highest Score
Lowest Score
Outstanding Tests
Current Grade

Charts:

* Performance over time
* Subject performance
* Topic performance
* Recent tests
* Upcoming tests

⸻

24. Teacher Dashboard

Admin dashboard contains:

KPI Cards

Total Students
Active Students
Tests This Month
Upcoming Tests
Average Score
Overall Pass Rate
Outstanding Students
Students Needing Attention

Analytics

* Monthly test count
* Upcoming tests
* Pass/fail distribution
* Class performance
* Subject performance
* Topic performance
* Difficulty performance
* Individual student trends
* Attendance
* Students requiring intervention

⸻

25. Performance Trend Engine

The system should detect patterns.

Example:

92%
88%
84%
79%
73%

→ Performance declining

Another:

48%
55%
63%
71%
82%

→ Strong improvement

This should be presented as an analytical observation, not a permanent label attached to the student.

⸻

26. Leaderboards

You want multiple leaderboards.

Leaderboard A — Pass Rate

Rank
Student
Class
Pass Rate
Tests

Leaderboard B — Total Marks

Rank
Student
Class
Total Marks

Leaderboard C — Average Percentage

I recommend including this as well.

Rank
Student
Class
Average %

Filters:

All Classes
Class 6
Class 7
Class 8
Class 9
Class 10
All Subjects
Individual Subject
Month
Academic Year
Custom Range

Default visibility:

ON

But configurable through privacy settings.

⸻

27. Leaderboard Eligibility

Only assigned exams count.

A student shouldn’t be penalized for exams they weren’t assigned.

For total marks and average calculations, the system should record the eligible exam population separately.

⸻

28. Attendance

V1 includes attendance.

Two mechanisms:

Teacher attendance

Teacher can mark:

Present
Absent
Late

Student check-in

Student login/check-in can potentially mark attendance only if the teacher has enabled student attendance for that particular day/session.

Example:

Teacher:
Enable student check-in
10:00 AM → 11:00 AM

Students can then check in.

Otherwise:

Student cannot mark attendance themselves.

The system should record:

* Timestamp
* Student
* Class
* Session
* Method
* Teacher who enabled it

⸻

29. Attendance Dashboard

Student attendance: 94%
Present: 42
Absent: 2
Late: 1

Class-level:

Class 8
Average Attendance: 91%
Students below 75%:
5

⸻

30. Exam Calendar

Teacher sees:

September 2026
20 — Physics
22 — Mathematics
25 — Chemistry
28 — Biology

Students only see exams assigned to them.

Calendar includes:

* Exam
* Class
* Subject
* Start time
* End time
* Duration
* Status

⸻

31. Reporting

Exports:

Excel

Full performance dataset.

CSV

Raw data.

PDF

Individual student report.

Printable report card

Includes:

Modern Learners — Saif Classes
Student
Class
Session
Attendance
Subject Performance
Tests
Average
Pass Rate
Strengths
Areas for Improvement
Teacher Remarks

⸻

32. Future Parent Portal

Architecture supports:

Parent
 ↓
Linked Child
 ↓
Dashboard

Parent can eventually see:

* Attendance
* Tests
* Results
* Performance
* Improvement areas
* Upcoming exams
* Report cards

Parent accounts won’t need to be implemented in V1.

⸻

33. Future AI Evaluation

For subjective answers:

Question:
Explain why work can be negative.
Student:
[Long answer]

AI evaluates:

Suggested score: 7/10
Reason:
Student correctly explained...
Missing:
...
Teacher:
[ APPROVE 7/10 ]
[ EDIT SCORE ]

The teacher remains the final authority.

AI should never silently modify the official result.

⸻

34. Future WhatsApp

Potential notifications:

📢 New Physics test assigned.

⏰ Physics test starts at 5 PM today.

🎉 Result published — 18/20.

📊 Monthly performance report.

⚠️ Attendance has fallen below configured threshold.

WhatsApp integration can be added after the core platform works.

⸻

35. Future Modules

The database architecture should leave room for:

V2
├── Homework
├── Assignments
├── Study Material
└── Announcements
V3
├── Question Bank UI
├── AI Question Generation
├── AI Subjective Evaluation
└── Advanced Analytics
V4
├── Parent Portal
├── WhatsApp
├── Automated Reports
└── Fee Management

⸻

36. Recommended V1 Navigation

Admin

Dashboard
Students
├── All Students
├── Add Student
├── Classes
├── Promotion
└── Rollback History
Exams
├── All Exams
├── Create Exam
├── Upload HTML
├── Assignments
├── Retake Requests
└── Exam Calendar
Question Bank
├── Questions
├── Chapters
├── Topics
└── Difficulty
Results
├── All Results
├── Student Results
├── Class Results
└── Reports
Analytics
├── Overall
├── Students
├── Subjects
├── Topics
└── Trends
Attendance
Leaderboards
Reports
Settings
├── Classes
├── Subjects
├── Grading
├── Privacy
├── Exam Rules
└── System

⸻

37. Student Navigation

Dashboard
My Exams
├── Upcoming
├── Available
├── Completed
└── Retake Requests
My Results
My Performance
Leaderboard
Attendance
Profile

⸻

38. Mobile-first requirement

This is critical.

Students will probably use:

* iPhone
* Android phones
* Tablets
* Desktop

The exam interface should be designed mobile-first, not desktop-first.

Large touch-friendly buttons.

Minimal scrolling.

Clear timer.

Question navigation.

Progress:

12 / 30

Auto-save indicator:

✓ Saved

⸻

39. Security requirements

The system must prevent basic cheating/abuse as far as practical.

At minimum:

* Authentication required
* Students only see assigned exams
* Student cannot access another student’s account
* Student cannot modify results
* Student cannot change correct answers
* Exam attempt tied to Student ID
* Server-side score validation
* Timer validated server-side
* Results cannot be edited by students
* Admin actions logged
* Retake approval logged
* Promotion/rollback logged

We should not rely solely on frontend JavaScript for security.

⸻

40. The Technology Question — OpenCode + OmniRoute

Short answer: Yes.

Your OpenCode + OmniRoute setup can be used to build this.

But there is an important distinction:

OmniRoute is essentially giving OpenCode access to the model/provider.

It doesn’t itself provide:

* database
* hosting
* authentication
* file storage
* WhatsApp
* deployment

OpenCode will write the actual application.

So the complete stack needs:

OpenCode
   ↓
AI coding model via OmniRoute
   ↓
Frontend
Backend
Database
Authentication
Storage
Hosting

⸻

41. What I would ask OpenCode to build

I would not say:

“Build me this whole website.”

Instead:

Step 1

Give OpenCode the PRD.

Tell it:

Analyze this PRD and design the complete architecture. Do not code yet.

It should produce:

* architecture
* database schema
* API structure
* frontend structure
* authentication architecture
* exam engine architecture

Then we review it.

Step 2

Tell it:

Implement the database and backend.

Test.

Step 3

Build:

Authentication + Student Management.

Test.

Step 4

Build:

Exam upload + exam parser.

Test with your real HTML paper.

Step 5

Build:

Exam-taking engine + timer + autosave.

Test heavily.

Step 6

Build:

Results + grading.

Step 7

Build:

Dashboard + analytics.

Step 8

Build:

Leaderboards.

Step 9

Build:

Attendance.

Step 10

Build:

Reports/export.

Then polish the entire mobile UI.

⸻

42. One thing I strongly recommend

Don’t let OpenCode invent the HTML exam format.

We’ll create a formal Modern Learners Exam Format.

For example, your future AI prompt could simply be:

“Create a Class 8 Physics MCQ exam for Work, Energy & Power using the Modern Learners HTML Exam Format.”

OpenCode/another AI can generate the HTML.

Then you upload it.

That means your whole ecosystem becomes:

AI
 ↓
Modern Learners HTML
 ↓
Upload
 ↓
Exam Parser
 ↓
Database
 ↓
Students
 ↓
Results
 ↓
Analytics

That’s a very clean architecture.

⸻

43. And yes — we should build the Question Bank architecture now

Even though you said the question bank can come later, I wouldn’t make the mistake of designing V1 around HTML files only.

The HTML should be an import format.

The actual source of truth eventually becomes:

Database Question Bank

Then you can have both:

Upload HTML exam

and later:

Build Exam From Question Bank

This will make Modern Learners much more powerful.

⸻

44. Recommended development stages

I’d call them:

🟢 Phase 1 — Foundation

* Project setup
* Database
* Authentication
* Admin
* Student profiles
* Classes
* Academic sessions

🟢 Phase 2 — Exam Engine

* HTML upload
* Parser
* Exam creation
* Assignment
* Scheduling
* Timer
* Autosave
* Submission
* Retakes

🟢 Phase 3 — Academic Engine

* Automatic evaluation
* Grading
* Results
* Explanations
* Topic tagging
* Difficulty

🟢 Phase 4 — Analytics

* Student dashboard
* Teacher dashboard
* Subject analytics
* Topic analytics
* Trends
* Needs-attention system

🟢 Phase 5 — Leaderboards

* Pass rate
* Total marks
* Average percentage
* Filters
* Privacy settings

🟢 Phase 6 — Attendance

* Teacher attendance
* Student check-in
* Attendance reports

🟢 Phase 7 — Reports

* PDF
* Excel
* CSV
* Report cards

🟢 Phase 8 — Future

* Question bank UI
* Parents
* Homework
* AI evaluation
* WhatsApp
* Notifications

⸻

One final recommendation before we start

I would not freeze the UI yet.

First, let’s make three technical documents:

1. PRD — what the system must do ← we now have this
2. Technical Architecture Document — exactly how we’re going to build it
3. Modern Learners HTML Exam Specification — the exact format your uploaded papers must follow

Then we can give all three to OpenCode.

That will dramatically reduce the chance of OpenCode creating a beautiful-looking website whose underlying exam/result architecture becomes impossible to maintain later.

And yes: with your existing OpenCode + OmniRoute setup, this is absolutely a reasonable project to build with an AI coding agent. The key is to have the architecture and contracts defined first, rather than relying on the agent to invent the system while coding.