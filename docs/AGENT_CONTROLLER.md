# Agent Controller Documentation

The Modern Learners Agent Controller is a local, node-based orchestration tool used to automate and track the progress of development phases for the Modern Learners platform, specifically designed to coordinate interactions with OpenCode.

## Architecture
The controller implements a simple state machine persistent in `.agent/project-state.json`. Each phase has an objective, scope boundaries, and verification criteria.

## Installation / Usage
Commands are exposed via npm scripts:

- `npm run agent:status`: Check the current state of phases and the active task.
- `npm run agent:run`: Launches an OpenCode session for the current task, capturing logs in `.agent/logs/`.
- `npm run agent:verify`: Runs the verification commands defined for the current phase.
- `npm run agent:stop`: Safely stops the agent process and releases locks.

## Safety Rules
- **Repository Context:** Refuses to run if outside the root `Modern_Learners` directory.
- **Process Locking:** Uses `.agent/controller.pid` to prevent concurrent orchestration attempts.
- **Credential Redaction:** Output is processed to redact values matching API keys or secrets before logging.
- **Resumability:** The state machine persists progress on disk, allowing resumption if the process terminates unexpectedly.

## Inbox Tasking
To provide a new task to the OpenCode CLI, create a file at `.agent/inbox/next-task.md`. The controller will automatically read this if the current phase status is `PLANNED` or `IN_PROGRESS`.
