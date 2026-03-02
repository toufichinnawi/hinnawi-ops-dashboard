import { describe, expect, it, vi } from "vitest";
import {
  buildLabourAlert,
  buildReportOverdueAlert,
  buildSalesDropAlert,
  buildDailySummaryAlert,
} from "./teams";
import type { AlertPayload } from "./teams";

describe("Teams Alert Payload Builders", () => {
  describe("buildLabourAlert", () => {
    it("returns warning severity when slightly over threshold", () => {
      const alert = buildLabourAlert("President Kennedy", 32, 30);
      expect(alert.severity).toBe("warning");
      expect(alert.title).toBe("Labour Cost Alert");
      expect(alert.storeName).toBe("President Kennedy");
      expect(alert.currentValue).toBe("32.0%");
      expect(alert.threshold).toBe("30%");
      expect(alert.metric).toBe("Labour %");
    });

    it("returns critical severity when far over threshold", () => {
      const alert = buildLabourAlert("Mackay", 40, 30);
      expect(alert.severity).toBe("critical");
      expect(alert.storeName).toBe("Mackay");
      expect(alert.currentValue).toBe("40.0%");
    });

    it("returns warning at exactly threshold + 5", () => {
      const alert = buildLabourAlert("Ontario", 35, 30);
      expect(alert.severity).toBe("warning");
    });

    it("returns critical above threshold + 5", () => {
      const alert = buildLabourAlert("Ontario", 35.1, 30);
      expect(alert.severity).toBe("critical");
    });
  });

  describe("buildReportOverdueAlert", () => {
    it("builds correct payload with manager name", () => {
      const alert = buildReportOverdueAlert("Tunnel", "Daily Report", "John");
      expect(alert.severity).toBe("warning");
      expect(alert.title).toBe("Overdue Report");
      expect(alert.storeName).toBe("Tunnel");
      expect(alert.message).toContain("Daily Report");
      expect(alert.message).toContain("John");
    });

    it("builds correct payload without manager name", () => {
      const alert = buildReportOverdueAlert("Ontario", "Scorecard");
      expect(alert.message).toContain("Scorecard");
      expect(alert.message).toContain("Ontario");
      expect(alert.message).not.toContain("Assigned to");
    });
  });

  describe("buildSalesDropAlert", () => {
    it("returns warning for moderate drop", () => {
      const alert = buildSalesDropAlert("President Kennedy", 3000, 3500, 15);
      expect(alert.severity).toBe("warning");
      expect(alert.title).toBe("Sales Drop Alert");
      expect(alert.currentValue).toBe("$3,000");
      expect(alert.threshold).toBe("$3,500 (previous)");
    });

    it("returns critical for large drop", () => {
      const alert = buildSalesDropAlert("Mackay", 2000, 3500, 25);
      expect(alert.severity).toBe("critical");
    });

    it("returns warning at exactly 20% drop", () => {
      const alert = buildSalesDropAlert("Mackay", 2800, 3500, 20);
      expect(alert.severity).toBe("warning");
    });
  });

  describe("buildDailySummaryAlert", () => {
    it("builds correct summary payload", () => {
      const alert = buildDailySummaryAlert(15000, 28.5, 3, 4, 4);
      expect(alert.severity).toBe("info");
      expect(alert.title).toBe("Daily Operations Summary");
      expect(alert.message).toContain("4 stores");
      expect(alert.currentValue).toContain("$15,000");
      expect(alert.currentValue).toContain("28.5%");
      expect(alert.currentValue).toContain("3/4");
    });
  });
});

describe("Teams Adaptive Card Structure", () => {
  it("all alert builders return valid AlertPayload shape", () => {
    const payloads: AlertPayload[] = [
      buildLabourAlert("Test", 35, 30),
      buildReportOverdueAlert("Test", "Daily Report"),
      buildSalesDropAlert("Test", 3000, 4000, 25),
      buildDailySummaryAlert(10000, 25, 4, 4, 4),
    ];

    for (const payload of payloads) {
      expect(payload).toHaveProperty("title");
      expect(payload).toHaveProperty("message");
      expect(payload).toHaveProperty("severity");
      expect(["critical", "warning", "info", "success"]).toContain(payload.severity);
      expect(typeof payload.title).toBe("string");
      expect(typeof payload.message).toBe("string");
    }
  });
});
