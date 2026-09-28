import fs from "fs";
import path from "path";

const STATE_FILE = ".agent/project-state.json";

export type PhaseStatus = "PLANNED" | "IN_PROGRESS" | "VERIFYING" | "COMPLETED" | "FAILED";

export interface Phase {
  id: string;
  title: string;
  objective: string;
  scope: string[];
  verificationCommands: string[];
  status: PhaseStatus;
}

export interface State {
  currentPhaseId: string;
  phases: Phase[];
  lastRun?: {
    runId: string;
    startedAt: string;
    completedAt?: string;
    exitCode?: number;
    logPath?: string;
    status: "SUCCESS" | "FAILED" | "INTERRUPTED";
  } | null;
}

const PHASES: Phase[] = [
  { id: "FOUNDATION", title: "Foundation", objective: "Core codebase scaffolding", scope: ["*"], verificationCommands: ["npm run build"], status: "COMPLETED" },
  { id: "STUDENT_ACADEMIC", title: "Student Academic Domain", objective: "Student enrollment & session management", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "QUESTION_SYSTEM", title: "Question System", objective: "Core question bank & types", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "EXAM_ENGINE", title: "Exam Engine", objective: "Exam creation & assignment", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "GRADING", title: "Grading", objective: "Objective grading engine", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "ANALYTICS", title: "Analytics", objective: "Performance metrics", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "LEADERBOARD_ATTENDANCE", title: "Leaderboard & Attendance", objective: "Aggregation & tracking", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "REPORTS", title: "Reports", objective: "Report card generation", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "PRODUCTION_HARDENING", title: "Production Hardening", objective: "Security, audit logs, sanitization", scope: ["lib/services/"], verificationCommands: ["npm run build"], status: "COMPLETED" },
  { id: "QUESTION_PAPER", title: "Question Paper Domain", objective: "Question paper snapshots", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "EXAM_ELIGIBILITY", title: "Exam Eligibility", objective: "Student assignment eligibility", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "ANSWER_PERSISTENCE", title: "Answer Persistence", objective: "Fix student answer saving", scope: ["lib/services/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "RESULT_CORRECTION", title: "Result Correction", objective: "Mark correction & result voiding", scope: ["lib/services/", "components/admin/", "app/"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "AI_01A", title: "AI Foundation", objective: "Subjective evaluation models", scope: ["prisma/schema.prisma", "prisma/migrations/", "tests/ai-evaluation-foundation.test.ts"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "AI_01B", title: "AI Gateway", objective: "OmniRoute integration", scope: ["lib/ai/", "lib/services/ai-gateway.service.ts", "tests/ai-gateway.test.ts"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "AI_01C", title: "Subjective Evaluation", objective: "Evaluation service abstraction", scope: ["*"], verificationCommands: ["npm test"], status: "COMPLETED" },
  { id: "AI_01D", title: "Human Review UI", objective: "Teacher review interface", scope: ["*"], verificationCommands: ["npm test"], status: "PLANNED" },
];

export function loadState(): State {
  if (!fs.existsSync(STATE_FILE)) {
    const initialState: State = {
      currentPhaseId: "AI_01D",
      phases: PHASES,
    };
    saveState(initialState);
    return initialState;
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

export function saveState(state: State) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function getIncompletePhase(state: State): Phase | undefined {
  return state.phases.find((p) => p.status !== "COMPLETED");
}
