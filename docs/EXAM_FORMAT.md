Modern Learners — Saif Classes

HTML Exam Format Specification

Version: 1.0
Status: Development Standard
Purpose: Define the official HTML format accepted by Modern Learners for importing and rendering examinations.

⸻

1. Purpose

Modern Learners will support uploading HTML files as examination papers.

The HTML file is an import format, not the permanent source of truth.

The workflow is:

HTML Exam
    ↓
Upload
    ↓
Validation
    ↓
Parser
    ↓
Structured Exam Data
    ↓
Database
    ↓
Exam Assignment
    ↓
Student Attempt
    ↓
Automatic Evaluation

Once imported, the database becomes the authoritative source for the examination.

⸻

2. Design Goals

The format must be:

* Human-readable
* AI-generatable
* Easy for OpenCode to generate
* Easy for Modern Learners to parse
* Safe
* Versioned
* Extensible
* Compatible with mobile rendering
* Capable of supporting future question types
* Independent of a specific frontend framework

⸻

3. File Extension

Standard:

.html

Example:

class8-physics-work-energy-test-01.html

Recommended naming convention:

[class]-[subject]-[topic]-[test-name].html

Example:

class8-physics-work-energy-test-01.html

The filename is for human convenience.

The system must not rely on the filename for correctness.

Metadata inside the HTML is authoritative.

⸻

4. Document Structure

Every Modern Learners exam must have:

<!DOCTYPE html>
<html lang="en">
<head>
    ...
</head>
<body>
    ...
</body>
</html>

The document must declare the Modern Learners exam format version.

Example:

<meta
    name="modern-learners-format"
    content="1.0">

This allows future versions such as:

1.1
2.0

without breaking older papers.

⸻

5. Exam Metadata

The HTML must contain machine-readable exam metadata.

Recommended:

<script type="application/json" id="modern-learners-exam">
{
  "formatVersion": "1.0",
  "exam": {
    "title": "Work, Energy & Power Test 1",
    "class": 8,
    "subject": "Physics",
    "chapter": "Work, Energy & Power",
    "description": "Class 8 Physics assessment",
    "totalMarks": 30,
    "durationMinutes": 45
  }
}
</script>

The system parses this JSON.

The visual HTML is separate from the structured metadata.

⸻

6. Required Metadata

The following fields should be supported:

{
  "formatVersion": "1.0",
  "exam": {
    "title": "...",
    "class": 8,
    "subject": "...",
    "chapter": "...",
    "totalMarks": 30,
    "durationMinutes": 45
  }
}

Required:

* formatVersion
* title
* class
* subject

Recommended:

* chapter
* totalMarks
* durationMinutes
* description

⸻

7. Metadata Fields

Full structure:

{
  "formatVersion": "1.0",
  "exam": {
    "title": "Work, Energy & Power Test 1",
    "class": 8,
    "subject": "Physics",
    "chapter": "Work, Energy & Power",
    "description": "Assessment covering basic concepts and numericals",
    "totalMarks": 30,
    "durationMinutes": 45
  }
}

The Admin UI can override:

* duration
* passing percentage
* availability window
* negative marking
* randomization
* assignment

The uploaded file should provide sensible defaults but Admin remains authoritative.

⸻

8. Question Structure

Every question requires a unique Question ID.

Example:

{
  "id": "PHY8-WEP-001"
}

Recommended format:

[SUBJECT][CLASS]-[CHAPTER]-[NUMBER]

Example:

PHY8-WEP-001
PHY8-WEP-002
PHY8-WEP-003

Question IDs must be unique within the question bank.

⸻

9. Question Metadata

Each question should support:

{
  "id": "PHY8-WEP-001",
  "type": "mcq",
  "topic": "Work",
  "difficulty": "easy",
  "marks": 1
}

Supported question types:

mcq
true_false
multiple_correct
numerical
short_answer
long_answer
image_based

⸻

10. MCQ Example

A complete MCQ:

<article
    class="ml-question"
    data-question-id="PHY8-WEP-001"
    data-question-type="mcq"
    data-topic="Work"
    data-difficulty="easy"
    data-marks="1">
    <div class="question-text">
        What is the SI unit of work?
    </div>
    <div class="options">
        <div
            class="option"
            data-option-id="A"
            data-correct="false">
            Newton
        </div>
        <div
            class="option"
            data-option-id="B"
            data-correct="true">
            Joule
        </div>
        <div
            class="option"
            data-option-id="C"
            data-correct="false">
            Watt
        </div>
        <div
            class="option"
            data-option-id="D"
            data-correct="false">
            Pascal
        </div>
    </div>
</article>

However, the preferred canonical representation is the structured JSON format described later.

⸻

11. Canonical JSON Question Format

The parser should ultimately convert every question into:

{
  "id": "PHY8-WEP-001",
  "type": "mcq",
  "topic": "Work",
  "difficulty": "easy",
  "marks": 1,
  "question": {
    "text": "What is the SI unit of work?"
  },
  "options": [
    {
      "id": "A",
      "text": "Newton",
      "correct": false
    },
    {
      "id": "B",
      "text": "Joule",
      "correct": true
    },
    {
      "id": "C",
      "text": "Watt",
      "correct": false
    },
    {
      "id": "D",
      "text": "Pascal",
      "correct": false
    }
  ],
  "explanation": "The SI unit of work is the joule."
}

This structured representation becomes the database import model.

⸻

12. Why Both HTML and JSON?

The HTML is useful for:

* Visual preview
* Human inspection
* AI generation
* Import/export

JSON is useful for:

* Reliable parsing
* Validation
* Database insertion
* Automatic grading

Therefore the HTML should contain a structured JSON payload.

⸻

13. Recommended Complete HTML Pattern

The preferred file structure:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0">
    <meta
        name="modern-learners-format"
        content="1.0">
    <script
        type="application/json"
        id="modern-learners-exam">
    {
      "formatVersion": "1.0",
      "exam": {
        "title": "Work, Energy & Power Test 1",
        "class": 8,
        "subject": "Physics",
        "chapter": "Work, Energy & Power"
      },
      "questions": [
        {
          "id": "PHY8-WEP-001",
          "type": "mcq",
          "topic": "Work",
          "difficulty": "easy",
          "marks": 1,
          "question": {
            "text": "What is the SI unit of work?"
          },
          "options": [
            {
              "id": "A",
              "text": "Newton",
              "correct": false
            },
            {
              "id": "B",
              "text": "Joule",
              "correct": true
            },
            {
              "id": "C",
              "text": "Watt",
              "correct": false
            },
            {
              "id": "D",
              "text": "Pascal",
              "correct": false
            }
          ],
          "explanation":
            "The SI unit of work is the joule."
        }
      ]
    }
    </script>
    <title>
        Work, Energy & Power Test 1
    </title>
</head>
<body>
    <!-- Human-readable exam content -->
</body>
</html>

⸻

14. Important Rule

The parser should treat:

#modern-learners-exam

JSON as the canonical import source.

The visible HTML should be treated as presentation/preview content.

This avoids unreliable HTML scraping.

⸻

15. Question Text Formatting

Question text can contain:

* Bold
* Italic
* Superscript
* Subscript
* Mathematical notation
* Line breaks
* Lists
* Images

Example:

{
  "text": "Calculate the work done when a force of <strong>10 N</strong> moves an object through <strong>5 m</strong>."
}

The renderer must sanitize HTML.

⸻

16. Mathematical Expressions

Future-proof support should allow:

LaTeX / MathJax-style expressions.

Example:

W = F × s

or:

\( W = F \times s \)

The exam renderer can convert supported mathematical expressions for students.

⸻

17. Images

Questions may contain images.

Example:

{
  "image": {
    "src": "images/question-01.png",
    "alt": "Diagram showing force applied to a box",
    "width": 600
  }
}

However, for uploaded standalone HTML files, relative paths must be validated.

Preferred future package:

exam/
├── exam.html
└── assets/
    ├── q01.png
    ├── q02.png
    └── diagram01.png

The upload system should eventually support ZIP packages.

V1 may initially support embedded/base64 images or approved uploaded assets.

⸻

18. MCQ Rules

MCQ requires:

type = "mcq"

Exactly one correct option.

Validation must reject:

0 correct

or:

2+ correct

for a normal MCQ.

⸻

19. True/False

Example:

{
  "id": "PHY8-WEP-010",
  "type": "true_false",
  "topic": "Work",
  "difficulty": "easy",
  "marks": 1,
  "question": {
    "text": "Work can be negative."
  },
  "answer": true,
  "explanation":
    "Work is negative when force and displacement are opposite in direction."
}

⸻

20. Multiple Correct Answers

Example:

{
  "id": "PHY8-WEP-011",
  "type": "multiple_correct",
  "marks": 2,
  "question": {
    "text": "Which quantities are scalar?"
  },
  "options": [
    {
      "id": "A",
      "text": "Mass",
      "correct": true
    },
    {
      "id": "B",
      "text": "Velocity",
      "correct": false
    },
    {
      "id": "C",
      "text": "Energy",
      "correct": true
    },
    {
      "id": "D",
      "text": "Displacement",
      "correct": false
    }
  ]
}

The scoring policy must be defined separately.

Supported future policies:

all_or_nothing
partial_credit

V1 can use:

all_or_nothing

⸻

21. Numerical Questions

Example:

{
  "id": "PHY8-WEP-020",
  "type": "numerical",
  "marks": 2,
  "question": {
    "text":
      "A force of 10 N moves an object by 5 m. Calculate the work done."
  },
  "answer": {
    "value": 50,
    "unit": "J",
    "tolerance": 0
  }
}

Future tolerance:

"tolerance": 0.5

could allow answers from:

49.5 → 50.5

⸻

22. Short Answer

Future format:

{
  "id": "PHY8-WEP-030",
  "type": "short_answer",
  "marks": 3,
  "question": {
    "text":
      "Define work in physics."
  },
  "evaluation": {
    "mode": "teacher_or_ai"
  }
}

The system should not automatically award marks without an evaluation engine.

⸻

23. Long Answer

Future format:

{
  "id": "PHY8-WEP-031",
  "type": "long_answer",
  "marks": 10,
  "question": {
    "text":
      "Explain the different situations in which work can be positive, negative and zero."
  },
  "evaluation": {
    "mode": "teacher_or_ai",
    "rubric": {
      "concept": 4,
      "examples": 3,
      "clarity": 2,
      "accuracy": 1
    }
  }
}

⸻

24. AI Evaluation

For subjective questions:

{
  "evaluation": {
    "mode": "teacher_or_ai",
    "ai": {
      "enabled": true,
      "requiresTeacherApproval": true
    }
  }
}

AI returns:

{
  "suggestedMarks": 7,
  "maximumMarks": 10,
  "summary": "Student correctly explained...",
  "missingPoints": [
    "Did not explain zero work"
  ]
}

Official marks are not created until teacher approval.

⸻

25. AI Evaluation Rule

The following is mandatory:

AI Suggested Mark
        ↓
Teacher Review
        ↓
Approve / Edit
        ↓
Official Mark

Never:

AI
 ↓
Official Result

without teacher control.

⸻

26. Difficulty

Every question should have:

easy
medium
hard

Validation should reject unknown values.

⸻

27. Topic

Every question should ideally contain:

"topic": "Power"

This is required for meaningful topic-level analytics.

⸻

28. Chapter

Every question should inherit or explicitly specify its chapter.

Example:

"chapter": "Work, Energy & Power"

The importer should verify that the chapter exists or ask Admin to create/map it.

⸻

29. Marks

Every question should have:

"marks": 1

Marks must be positive unless a future question type explicitly supports another scoring model.

⸻

30. Negative Marking

Negative marking should not normally be encoded as a question property.

It belongs to the exam.

Example:

{
  "exam": {
    "negativeMarking": {
      "enabled": false,
      "wrongAnswerMarks": 0
    }
  }
}

Admin can override this after upload.

⸻

31. Exam Duration

HTML may provide:

"durationMinutes": 45

But Admin controls the final assignment configuration.

This allows the same HTML to be reused for:

30 minutes
45 minutes
60 minutes

without recreating the paper.

⸻

32. Passing Percentage

The HTML may optionally contain:

"passingPercentage": 80

But Admin can change it before publishing.

The final exam stores its own grading configuration.

⸻

33. Grade Rules

The HTML may optionally contain default grade rules:

"grading": [
  {
    "min": 100,
    "max": 100,
    "label": "OP — Outstandingly Perfect"
  },
  {
    "min": 95,
    "max": 99.99,
    "label": "Outstanding"
  },
  {
    "min": 90,
    "max": 94.99,
    "label": "Excellent"
  },
  {
    "min": 80,
    "max": 89.99,
    "label": "Pass"
  },
  {
    "min": 0,
    "max": 79.99,
    "label": "Fail — Needs Improvement"
  }
]

Admin can override these.

⸻

34. Explanation

Each automatically evaluated question may contain an explanation.

Example:

"explanation": "Work is calculated using W = F × s."

After submission, Admin controls whether students see it.

⸻

35. Answer Security

Correct answers must not be exposed to the student before submission.

The server should parse and store them.

When serving an active exam to a student:

correct = true/false

must not be sent to the browser.

Instead:

Student-facing question

contains only:

question
options

The server retains:

correctAnswer

⸻

36. Randomization

The exam configuration can contain:

{
  "randomization": {
    "questions": true,
    "options": true
  }
}

When enabled, Modern Learners generates the student’s specific exam instance.

The exact order must be stored with the attempt.

⸻

37. Fixed Question Count

Future question-bank generated exams may specify:

{
  "selection": {
    "questionCount": 20
  }
}

Example:

Question bank = 100 questions
Exam = 20 questions

The system selects 20.

⸻

38. Difficulty Distribution

Future:

{
  "selection": {
    "questionCount": 20,
    "difficulty": {
      "easy": 5,
      "medium": 10,
      "hard": 5
    }
  }
}

This is mainly for future Question Bank → Exam generation.

⸻

39. Topic Distribution

Future:

{
  "selection": {
    "topics": {
      "Work": 5,
      "Energy": 8,
      "Power": 7
    }
  }
}

This enables balanced tests.

⸻

40. Exam Version

Every uploaded exam should receive an internal version.

Example:

Exam:
PHY8-WEP-TEST-01
Version:
1

If the paper is replaced:

Version 2

Existing attempts remain tied to Version 1.

⸻

41. Import Validation

When Admin uploads an HTML file:

UPLOAD
 ↓
Read file
 ↓
Detect format version
 ↓
Parse JSON
 ↓
Validate schema
 ↓
Validate questions
 ↓
Validate answers
 ↓
Validate marks
 ↓
Validate question IDs
 ↓
Validate total marks
 ↓
Show preview
 ↓
Admin confirms
 ↓
Import

⸻

42. Import Error Handling

The system must provide useful errors.

Example:

❌ Import failed
Question PHY8-WEP-004:
Missing correct answer.
Question PHY8-WEP-009:
Invalid difficulty "medium-hard".
Question PHY8-WEP-012:
Multiple correct answers found for MCQ.

Do not simply display:

“Invalid HTML.”

⸻

43. Import Preview

Before saving an exam:

┌───────────────────────────────────┐
│ Import Preview                    │
├───────────────────────────────────┤
│ Exam: Work Energy Power Test 1    │
│ Class: 8                          │
│ Subject: Physics                  │
│ Questions: 30                     │
│ Marks: 30                         │
│                                   │
│ MCQ: 25                           │
│ Numerical: 5                      │
│                                   │
│ Easy: 12                          │
│ Medium: 13                        │
│ Hard: 5                           │
│                                   │
│ ✓ No validation errors            │
│                                   │
│ [Cancel]          [Import Exam]  │
└───────────────────────────────────┘

⸻

44. Total Marks Validation

The parser calculates:

sum(question.marks)

and compares it with:

exam.totalMarks

If mismatch:

⚠ Total marks mismatch
Declared: 30
Calculated: 29

Admin must fix or explicitly confirm.

⸻

45. Question ID Validation

Every question must have a unique ID.

Invalid:

PHY8-WEP-001
PHY8-WEP-001

The importer rejects duplicates.

⸻

46. Required Fields by Question Type

MCQ

Required:

id
type
question
options
correct answer
marks

True/False

Required:

id
type
question
answer
marks

Multiple Correct

Required:

id
type
question
options
at least two correct/incorrect validation
marks

Numerical

Required:

id
type
question
answer
marks

Short/Long Answer

Required:

id
type
question
marks

⸻

47. Accessibility

Questions should support:

alt text for images
semantic HTML
keyboard navigation
screen-reader labels
sufficient contrast

Do not encode essential information only through color.

⸻

48. Mobile Compatibility

The HTML source may contain styling, but Modern Learners should preferably render the imported question data using its own responsive UI.

This guarantees consistent experience across:

* iPhone
* Android
* Tablet
* Desktop

⸻

49. Styling Rule

Uploaded HTML styling must not override the main application.

The exam renderer should use sanitized content.

Avoid:

<script>
...
</script>

inside question content.

JavaScript inside uploaded papers should be rejected or stripped.

⸻

50. Script Security

Uploaded exam HTML is untrusted.

Modern Learners must never blindly execute:

<script>
alert(...)
</script>

or arbitrary external scripts.

Allowed:

Safe text
Images
Basic formatting
Math notation
Question metadata

Not allowed by default:

JavaScript
iframes
external tracking
external scripts
forms posting to arbitrary URLs

⸻

51. External Links

External links should generally be rejected or sanitized.

An exam question should not be able to redirect students to an arbitrary external website.

⸻

52. Asset Security

Images/assets must be validated.

Allowed types initially:

PNG
JPEG
WebP
SVG — sanitized

File size limits should be enforced.

⸻

53. JSON Schema

Modern Learners should maintain a formal JSON Schema.

Conceptually:

modern-learners-exam.schema.json

This becomes the machine-readable contract.

The parser validates against the schema before import.

⸻

54. Example Complete Exam Payload

{
  "formatVersion": "1.0",
  "exam": {
    "title": "Work, Energy & Power Test 1",
    "class": 8,
    "subject": "Physics",
    "chapter": "Work, Energy & Power",
    "description":
      "Conceptual and numerical assessment",
    "totalMarks": 10,
    "durationMinutes": 30
  },
  "questions": [
    {
      "id": "PHY8-WEP-001",
      "type": "mcq",
      "topic": "Work",
      "difficulty": "easy",
      "marks": 1,
      "question": {
        "text":
          "What is the SI unit of work?"
      },
      "options": [
        {
          "id": "A",
          "text": "Newton",
          "correct": false
        },
        {
          "id": "B",
          "text": "Joule",
          "correct": true
        },
        {
          "id": "C",
          "text": "Watt",
          "correct": false
        },
        {
          "id": "D",
          "text": "Pascal",
          "correct": false
        }
      ],
      "explanation":
        "The SI unit of work is the joule."
    },
    {
      "id": "PHY8-WEP-002",
      "type": "numerical",
      "topic": "Work",
      "difficulty": "medium",
      "marks": 2,
      "question": {
        "text":
          "A force of 10 N moves an object through 5 m. Calculate the work done."
      },
      "answer": {
        "value": 50,
        "unit": "J",
        "tolerance": 0
      },
      "explanation":
        "W = F × s = 10 × 5 = 50 J."
    },
    {
      "id": "PHY8-WEP-003",
      "type": "true_false",
      "topic": "Work",
      "difficulty": "easy",
      "marks": 1,
      "question": {
        "text":
          "Work can be negative."
      },
      "answer": true,
      "explanation":
        "Work is negative when force and displacement are opposite in direction."
    }
  ]
}

⸻

55. HTML Generator Standard

Whenever an AI is asked to create a Modern Learners exam, the prompt should contain:

Generate the exam using Modern Learners HTML Exam Format v1.0. Do not change the JSON schema. Every question must have a unique ID, type, topic, difficulty, marks, and machine-readable answer data.

This should become our standard instruction.

⸻

56. AI Generation Workflow

Your future workflow can become:

You:
"Create Class 8 Physics test on Work,
Energy & Power, 30 questions."
             ↓
AI / OpenCode
             ↓
Modern Learners HTML v1.0
             ↓
Upload
             ↓
Automatic validation
             ↓
Preview
             ↓
Assign Class 8
             ↓
Students take exam

⸻

57. Question Bank Import

The same format should eventually allow:

{
  "mode": "question_bank"
}

or the system can extract questions from uploaded exams and add them to the Question Bank.

Admin can choose:

☑ Add these questions to Question Bank

during import.

⸻

58. Duplicate Detection

When importing a question:

Question ID

is the primary identifier.

Future semantic duplicate detection may also compare:

* question text
* topic
* class
* subject

and warn:

Similar question already exists.

But it should not automatically delete or merge questions.

⸻

59. Question Bank Relationship

Imported exam:

HTML
 ↓
Question
 ↓
Question Bank
 ↓
Exam Snapshot

The exam snapshot ensures future edits to the question bank don’t alter historical exams.

⸻

60. Exam Archive

After an exam is published and attempts exist, its imported content must not be silently overwritten.

Changes should create:

new version

or require explicit administrative action.

⸻

61. Version Compatibility

Parser must support:

formatVersion 1.0

Future versions:

1.1
1.2
2.0

Older papers should remain importable if their schema is still supported.

⸻

62. Migration Strategy

If Format 2.0 changes the schema:

Old HTML v1.0
      ↓
Migration / Adapter
      ↓
Internal Exam Model

The application should not require every old paper to be manually recreated.

⸻

63. Final Import Contract

An HTML exam is considered valid only when:

✓ Format version supported
✓ Exam title present
✓ Class valid
✓ Subject valid
✓ Questions present
✓ Question IDs unique
✓ Question types valid
✓ Required fields present
✓ Marks valid
✓ Answers valid
✓ Options valid
✓ Total marks valid
✓ No unsafe content

Only then:

IMPORT EXAM

becomes available.

⸻

64. V1 Supported Question Types

V1 parser must support:

✓ MCQ
✓ True/False
✓ Multiple Correct
✓ Numerical

Architecture must reserve:

○ Short Answer
○ Long Answer
○ Image Based
○ AI Evaluated

for future versions.

⸻

65. Final Architecture Relationship

The complete Modern Learners ecosystem is:

                QUESTION CREATION
                       │
                       ▼
             Modern Learners HTML
                       │
                       ▼
                 VALIDATOR
                       │
                       ▼
                    PARSER
                       │
                       ▼
               QUESTION BANK
                       │
                       ▼
                EXAM SNAPSHOT
                       │
                       ▼
                   ASSIGNMENT
                       │
                       ▼
                    STUDENT
                       │
                       ▼
                    ATTEMPT
                       │
                       ▼
                 AUTO-SCORING
                       │
                       ▼
                    RESULT
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Student      Analytics    Leaderboard
       Dashboard

⸻

66. Non-Negotiable Rules

OpenCode must follow these rules when implementing the importer:

1. Never trust uploaded HTML.
2. Never execute arbitrary JavaScript from an uploaded paper.
3. Never expose correct answers to students before submission.
4. Never rely on frontend scoring.
5. Never rely on frontend timers for official deadlines.
6. Every question must have a stable ID.
7. Historical exam attempts must remain reproducible.
8. Imported exam content must be versionable.
9. Validate before importing.
10. Admin must preview before publishing.
11. The database, not the HTML file, is the source of truth after import.
12. AI evaluation must remain subject to teacher approval.

⸻

67. Recommended File

Store this specification in the repository as:

docs/EXAM_FORMAT.md

And the machine-readable schema as:

docs/schemas/modern-learners-exam-v1.schema.json

The PRD should be:

docs/PRD.md

The Technical Architecture:

docs/TAD.md

The three documents together become the project’s initial specification contract.