import { describe, it, expect, vi } from "vitest";

/**
 * Tests for the scorecard data query and score computation logic.
 * Validates that getReportsByDateRange returns correct data shape
 * and that the frontend score computation logic works correctly.
 */

// ─── Score computation helpers (mirrored from frontend) ──────────

function parseScore(totalScore: string | null): number | null {
  if (!totalScore) return null;
  const n = parseFloat(totalScore);
  return isNaN(n) ? null : n;
}

function getScoreColor(score: number, max: number = 5): string {
  const pct = score / max;
  if (pct >= 0.8) return "text-emerald-600";
  if (pct >= 0.6) return "text-amber-600";
  return "text-red-600";
}

function computeStoreAvg(
  reports: Array<{ reportType: string; totalScore: string | null; location: string }>,
  storeCode: string
): number | null {
  const SCORED_TYPES = ["manager-checklist", "Manager Checklist", "ops-manager-checklist", "performance-evaluation"];
  const storeReports = reports.filter((r) => r.location === storeCode);
  const scored = storeReports.filter((r) => SCORED_TYPES.includes(r.reportType) && r.totalScore);
  const scores = scored.map((r) => parseScore(r.totalScore)).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function hasWeeklyAudit(
  reports: Array<{ reportType: string; location: string }>,
  storeCode: string
): boolean {
  return reports.some((r) => r.location === storeCode && r.reportType === "ops-manager-checklist");
}

// ─── Tests ───────────────────────────────────────────────────────

describe("scorecard", () => {
  describe("parseScore", () => {
    it("should parse valid score strings", () => {
      expect(parseScore("5.00")).toBe(5.0);
      expect(parseScore("4.49")).toBe(4.49);
      expect(parseScore("3.5")).toBe(3.5);
      expect(parseScore("0")).toBe(0);
    });

    it("should return null for invalid or missing scores", () => {
      expect(parseScore(null)).toBeNull();
      expect(parseScore("")).toBeNull();
      expect(parseScore("N/A")).toBeNull();
      expect(parseScore("abc")).toBeNull();
    });
  });

  describe("getScoreColor", () => {
    it("should return green for scores >= 80%", () => {
      expect(getScoreColor(4.0)).toBe("text-emerald-600");
      expect(getScoreColor(4.5)).toBe("text-emerald-600");
      expect(getScoreColor(5.0)).toBe("text-emerald-600");
    });

    it("should return amber for scores >= 60% but < 80%", () => {
      expect(getScoreColor(3.0)).toBe("text-amber-600");
      expect(getScoreColor(3.5)).toBe("text-amber-600");
      expect(getScoreColor(3.99)).toBe("text-amber-600");
    });

    it("should return red for scores < 60%", () => {
      expect(getScoreColor(2.0)).toBe("text-red-600");
      expect(getScoreColor(1.0)).toBe("text-red-600");
      expect(getScoreColor(2.99)).toBe("text-red-600");
    });
  });

  describe("computeStoreAvg", () => {
    const sampleReports = [
      { reportType: "manager-checklist", totalScore: "5.00", location: "MK" },
      { reportType: "manager-checklist", totalScore: "4.00", location: "MK" },
      { reportType: "Manager Checklist", totalScore: "4.49", location: "PK" },
      { reportType: "waste-report", totalScore: null, location: "MK" },
      { reportType: "ops-manager-checklist", totalScore: "3.50", location: "PK" },
    ];

    it("should compute average for scored report types only", () => {
      const mkAvg = computeStoreAvg(sampleReports, "MK");
      expect(mkAvg).toBe(4.5); // (5 + 4) / 2
    });

    it("should include ops-manager-checklist in scored types", () => {
      const pkAvg = computeStoreAvg(sampleReports, "PK");
      expect(pkAvg).toBeCloseTo(3.995); // (4.49 + 3.50) / 2
    });

    it("should return null for stores with no scored reports", () => {
      const onAvg = computeStoreAvg(sampleReports, "ON");
      expect(onAvg).toBeNull();
    });

    it("should exclude waste-report from scored types", () => {
      const wasteOnly = [
        { reportType: "waste-report", totalScore: "3.00", location: "TN" },
      ];
      expect(computeStoreAvg(wasteOnly, "TN")).toBeNull();
    });
  });

  describe("hasWeeklyAudit", () => {
    const reports = [
      { reportType: "manager-checklist", location: "MK" },
      { reportType: "ops-manager-checklist", location: "PK" },
      { reportType: "manager-checklist", location: "PK" },
    ];

    it("should return true when ops-manager-checklist exists for store", () => {
      expect(hasWeeklyAudit(reports, "PK")).toBe(true);
    });

    it("should return false when no ops-manager-checklist for store", () => {
      expect(hasWeeklyAudit(reports, "MK")).toBe(false);
    });

    it("should return false for stores with no reports", () => {
      expect(hasWeeklyAudit(reports, "ON")).toBe(false);
    });
  });

  describe("getReportsByDateRange (integration)", () => {
    it("should return reports from the database for a valid date range", async () => {
      const { getReportsByDateRange } = await import("./db");
      const reports = await getReportsByDateRange("2026-03-03", "2026-03-03");
      expect(Array.isArray(reports)).toBe(true);
      // Each report should have the expected shape
      for (const r of reports) {
        expect(r).toHaveProperty("id");
        expect(r).toHaveProperty("reportType");
        expect(r).toHaveProperty("location");
        expect(r).toHaveProperty("reportDate");
        expect(r).toHaveProperty("totalScore");
        expect(r).toHaveProperty("status");
      }
    });

    it("should return empty array for a date range with no data", async () => {
      const { getReportsByDateRange } = await import("./db");
      const reports = await getReportsByDateRange("2020-01-01", "2020-01-01");
      expect(reports).toEqual([]);
    });
  });
});
