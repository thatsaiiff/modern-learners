import { execSync } from "child_process";

export function redactSecrets(input: string): string {
  const secrets = [
    /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
    /DATABASE_URL=["']?[^"'\s]+["']?/gi,
    /AUTH_SECRET=["']?[^"'\s]+["']?/gi,
    /OMNIROUTE_API_KEY=["']?[^"'\s]+["']?/gi,
    /[a-zA-Z0-9_-]{32,}/g,
  ];

  let output = input;
  for (const pattern of secrets) {
    output = output.replace(pattern, "REDACTED");
  }
  return output;
}

export function getGitStatus(): string {
  try {
    return execSync("git status --short").toString();
  } catch {
    return "";
  }
}

export function getChangedFiles(): string[] {
  try {
    return execSync("git diff --name-only HEAD~1") // Check changes against last commit or current HEAD
      .toString()
      .split("\n")
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}
