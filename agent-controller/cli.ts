import { loadState, saveState, getIncompletePhase, State, Phase } from "./state";
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { redactSecrets, getGitStatus } from "./utils";

const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0];

function checkSafety() {
  if (path.basename(process.cwd()) !== "Modern_Learners") {
    console.error("Safety check failed: Not in Modern_Learners repo root.");
    process.exit(1);
  }
}

async function runCommand() {
  checkSafety();
  const state = loadState();
  const phase = getIncompletePhase(state);

  if (!phase) {
    console.log("All phases completed.");
    return;
  }

  const pidFile = ".agent/controller.pid";
  if (fs.existsSync(pidFile)) {
    const pid = fs.readFileSync(pidFile, "utf-8");
    console.error(`Agent is already running (PID: ${pid}). Check .agent/controller.pid`);
    process.exit(1);
  }

  fs.writeFileSync(pidFile, process.pid.toString());
  
  const INBOX_TASK = ".agent/inbox/next-task.md";
  const taskPath = fs.existsSync(INBOX_TASK) ? INBOX_TASK : ".agent/current-task.md";
  
  if (!fs.existsSync(taskPath)) {
    console.error("No task found in .agent/inbox/next-task.md or .agent/current-task.md");
    fs.unlinkSync(pidFile);
    process.exit(1);
  }

  const gitPreCheck = getGitStatus();
  console.log("Git state before run:\n", gitPreCheck);

  const runId = Date.now().toString();
  const logPath = `.agent/logs/${phase.id}-${runId}.log`;
  if (!fs.existsSync(".agent/logs")) fs.mkdirSync(".agent/logs");
  const logStream = fs.createWriteStream(logPath);

  state.lastRun = {
    runId,
    startedAt: new Date().toISOString(),
    status: "INTERRUPTED",
    logPath,
  };
  saveState(state);

  try {
    console.log(`Starting phase: ${phase.id} - ${phase.title}`);
    
    // Launch opencode
    const opencode = spawn("npx", ["opencode", "run", taskPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    opencode.stdout.on("data", (data) => logStream.write(redactSecrets(data.toString())));
    opencode.stderr.on("data", (data) => logStream.write(redactSecrets(data.toString())));

    opencode.on("close", (code) => {
      logStream.end();
      fs.unlinkSync(pidFile);
      
      const finishedState = loadState();
      
      const gitPostCheck = getGitStatus();
      console.log("Git state after run:\n", gitPostCheck);

      if (code === 0) {
        console.log("Phase task process finished successfully.");
        updatePhaseStatus(phase.id, "VERIFYING", finishedState, {
            runId,
            exitCode: code,
            status: "SUCCESS"
        });
        runVerification(phase);
      } else {
        console.error(`Task process failed with code ${code}`);
        updatePhaseStatus(phase.id, "FAILED", finishedState, {
            runId,
            exitCode: code,
            status: "FAILED"
        });
      }
    });

  } catch (err) {
    fs.unlinkSync(pidFile);
    throw err;
  }
}

function updatePhaseStatus(phaseId: string, status: any, state: State, runDetails: any) {
  const phase = state.phases.find((p) => p.id === phaseId);
  if (phase) {
    phase.status = status;
    state.lastRun = {
        ...state.lastRun!,
        completedAt: new Date().toISOString(),
        ...runDetails
    };
    saveState(state);
  }
}

function runVerification(phase: Phase) {
    console.log(`Running verification for ${phase.id}...`);
    for (const cmd of phase.verificationCommands) {
        console.log(`-> Running: ${cmd}`);
        execSync(cmd, { stdio: "inherit" });
    }
    updatePhaseStatus(phase.id, "COMPLETED", loadState(), {});
    console.log("Phase verification finished.");
}

switch (COMMAND) {
  case "status":
    const s = loadState();
    console.log(JSON.stringify(s, null, 2));
    break;
  case "run":
    runCommand();
    break;
  default:
    console.log("Commands: status, run, next, verify, stop");
}

