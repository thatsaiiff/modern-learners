import { loadState, saveState, getIncompletePhase, State, Phase } from "./state";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { redactSecrets, getGitStatus, getChangedFiles } from "./utils";
import { saveHistory } from "./history";

const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0];
const PID_FILE = ".agent/controller.pid";

function checkSafety() {
  if (path.basename(process.cwd()) !== "Modern_Learners") {
    console.error("Safety check failed: Not in Modern_Learners repo root.");
    process.exit(1);
  }
}

function cleanupPid() {
  if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
}

process.on("SIGINT", () => {
    cleanupPid();
    process.exit(1);
});

async function runCommand() {
  checkSafety();
  let state = loadState();
  const phase = getIncompletePhase(state);

  if (!phase) {
    console.log("All phases completed.");
    return;
  }

  // Lockfile
  if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, "utf-8");
      try {
          process.kill(parseInt(pid), 0);
          console.error(`Agent already running (PID: ${pid}).`);
          process.exit(1);
      } catch {
          console.warn("Stale PID found, cleaning up...");
          cleanupPid();
      }
  }
  fs.writeFileSync(PID_FILE, process.pid.toString());

  // Inbox Task
  const taskPath = ".agent/inbox/next-task.md";
  if (!fs.existsSync(taskPath)) {
      console.error("No task found in .agent/inbox/next-task.md");
      cleanupPid();
      process.exit(1);
  }
  const taskContent = fs.readFileSync(taskPath, "utf-8");

  const runId = Date.now().toString();
  const logPath = `.agent/logs/${phase.id}-${runId}.log`;
  if (!fs.existsSync(".agent/logs")) fs.mkdirSync(".agent/logs", { recursive: true });
  const logStream = fs.createWriteStream(logPath);

  state.lastRun = {
    runId,
    startedAt: new Date().toISOString(),
    status: "INTERRUPTED",
    logPath,
  };
  saveState(state);

  console.log(`Starting phase: ${phase.id}. Logging to ${logPath}`);

  try {
    const opencode = spawn("npx", ["opencode", "run", "--auto"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, CI: "true" },
    });
    
    opencode.stdin.write(taskContent);
    opencode.stdin.end();

    opencode.stdout.on("data", (data) => logStream.write(redactSecrets(data.toString())));
    opencode.stderr.on("data", (data) => logStream.write(redactSecrets(data.toString())));

    opencode.on("close", (code) => {
      logStream.end();
      cleanupPid();
      
      const finishedState = loadState();
      
      // Git scope safety check
      const changedFiles = getChangedFiles();
      // Ignore .agent/ directory in scope check
      const scopeViolation = changedFiles.filter(f => !f.startsWith(".agent/") && !phase.scope.some(s => f.startsWith(s) || s === "*"));

      if (scopeViolation.length > 0) {
        console.error("Scope violation detected! Files changed outside allowed scope:", scopeViolation);
        finalizeRun(phase.id, finishedState, code || 1, "FAILED", runId, logPath, false);
        return;
      }

      if (code === 0) {
        console.log("Task finished, verifying...");
        const verified = runVerification(phase);
        finalizeRun(phase.id, finishedState, 0, verified ? "SUCCESS" : "FAILED", runId, logPath, verified);
      } else {
        console.error(`Task process failed with code ${code}`);
        finalizeRun(phase.id, finishedState, code || 1, "FAILED", runId, logPath, false);
      }
    });

  } catch (err) {
    cleanupPid();
    throw err;
  }
}

function finalizeRun(phaseId: string, state: State, exitCode: number, status: "SUCCESS" | "FAILED" | "INTERRUPTED", runId: string, logPath: string, verified: boolean) {
    const phase = state.phases.find((p) => p.id === phaseId);
    if (phase) {
        if (verified) phase.status = "COMPLETED";
        else phase.status = "FAILED";
        
        state.lastRun = {
            runId,
            startedAt: state.lastRun!.startedAt,
            completedAt: new Date().toISOString(),
            exitCode,
            status,
            logPath
        };
        saveState(state);
        saveHistory(phaseId, runId, state.lastRun);
        console.log(`Run ${runId} finalized with status ${status}`);
    }
}

function runVerification(phase: Phase): boolean {
    try {
        for (const cmd of phase.verificationCommands) {
            console.log(`-> Running: ${cmd}`);
            execSync(cmd, { stdio: "inherit" });
        }
        return true;
    } catch {
        console.error("Verification failed.");
        return false;
    }
}

switch (COMMAND) {
  case "status":
    console.log(JSON.stringify(loadState(), null, 2));
    break;
  case "run":
    runCommand();
    break;
  case "next":
    let s = loadState();
    const incompleteIndex = s.phases.findIndex((p) => p.status !== "COMPLETED");
    if (incompleteIndex !== -1 && s.phases[incompleteIndex].status === "COMPLETED") {
       s.currentPhaseId = s.phases[incompleteIndex + 1]?.id || s.currentPhaseId;
       saveState(s);
       console.log(`Advanced to phase ${s.currentPhaseId}`);
    } else {
       console.log(`Cannot advance: Current phase ${s.phases[incompleteIndex]?.id || "unknown or complete"} is ${s.phases[incompleteIndex]?.status}.`);
    }
    break;
  default:
    console.log("Commands: status, run, next");
}
