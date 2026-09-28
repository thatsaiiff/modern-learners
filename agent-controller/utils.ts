import fs from "fs";
import path from "path";

export function redactSecrets(input: string): string {
  const secrets = [
    /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
    /DATABASE_URL=["']?[^"'\s]+["']?/gi,
    /AUTH_SECRET=["']?[^"'\s]+["']?/gi,
    /OMNIROUTE_API_KEY=["']?[^"'\s]+["']?/gi,
  ];

  let output = input;
  for (const pattern of secrets) {
    output = output.replace(pattern, "REDACTED");
  }
  return output;
}

export function getRepoRoot(): string {
  return process.cwd();
}

export function isGitClean(): boolean {
  try {
    const output = require("child_process").execSync("git status --short").toString();
    return output.trim() === "";
  } catch {
    return false;
  }
}

export function getGitStatus(): string {
  try {
    return require("child_process").execSync("git status --short").toString();
  } catch {
    return "";
  }
}
