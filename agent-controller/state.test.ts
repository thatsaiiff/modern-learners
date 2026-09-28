import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { loadState, saveState, getIncompletePhase } from "./state";

vi.mock("fs");

describe("Agent Controller State Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize state if file does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockReturnValue();

    const state = loadState();
    expect(state.currentPhaseId).toBe("AI_01D");
    expect(state.phases.length).toBeGreaterThan(0);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it("should return the first non-completed phase", () => {
    const state: any = {
      phases: [
        { id: "P1", status: "COMPLETED" },
        { id: "P2", status: "PLANNED" },
        { id: "P3", status: "PLANNED" },
      ],
    };

    const next = getIncompletePhase(state);
    expect(next?.id).toBe("P2");
  });
});
