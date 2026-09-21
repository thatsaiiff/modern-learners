import { describe, it, expect } from "vitest";
import { sanitizeQuestionHtml } from "@/lib/services/sanitizer.service";

describe("Question Content Sanitization Security", () => {
  it("should completely strip malicious script tags", () => {
    const dirty = "Calculate the force <script>alert('XSS Attack!')</script> applied to the box.";
    const clean = sanitizeQuestionHtml(dirty);

    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert");
    expect(clean).toBe("Calculate the force  applied to the box.");
  });

  it("should strip inline event handler attributes like onload, onclick, onerror", () => {
    const dirty =
      "<p onclick='stealData()' onmouseover='hack()'>What is work done <img src='x' onerror='alert(1)' />?</p>";
    const clean = sanitizeQuestionHtml(dirty);

    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onmouseover");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("stealData");
  });

  it("should strip dangerous iframes, embeds and forms", () => {
    const dirty =
      "Question 1: <iframe src='https://malicious.com'></iframe><form action='https://evil.com'><input type='text'/></form>";
    const clean = sanitizeQuestionHtml(dirty);

    expect(clean).not.toContain("iframe");
    expect(clean).not.toContain("form");
    expect(clean).not.toContain("input");
    expect(clean).toBe("Question 1: ");
  });

  it("should preserve safe educational HTML tags (strong, em, sub, sup, p, br, code)", () => {
    const valid =
      "<p>Calculate <strong>work done</strong> where force = <em>10 N</em> and distance = 5 m. Formula: <code>W = F &times; s</code>. Water formula: H<sub>2</sub>O and 10<sup>2</sup>.</p>";
    const clean = sanitizeQuestionHtml(valid);

    expect(clean).toContain("<strong>work done</strong>");
    expect(clean).toContain("<em>10 N</em>");
    expect(clean).toContain("<code>W = F × s</code>");
    expect(clean).toContain("<sub>2</sub>");
    expect(clean).toContain("<sup>2</sup>");
  });

  it("should handle null or empty inputs gracefully", () => {
    expect(sanitizeQuestionHtml("")).toBe("");
    expect(sanitizeQuestionHtml(null)).toBe("");
    expect(sanitizeQuestionHtml(undefined)).toBe("");
  });
});
