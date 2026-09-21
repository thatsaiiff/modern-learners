import { describe, it, expect } from "vitest";
import { formatRollNumber } from "@/lib/utils";

describe("Academic Roll Number Generator Helper", () => {
  it("should generate proper format 08-2627-001 for Class 8, Session 2026-27, Roll 1", () => {
    const roll = formatRollNumber(8, "2026-27", 1);
    expect(roll).toBe("08-2627-001");
  });

  it("should format rolls greater than 99 without truncating (e.g. 06-2627-105)", () => {
    const roll = formatRollNumber(6, "2026-27", 105);
    expect(roll).toBe("06-2627-105");
  });

  it("should format Class 10 properly (10-2627-042)", () => {
    const roll = formatRollNumber(10, "2026-27", 42);
    expect(roll).toBe("10-2627-042");
  });
});
