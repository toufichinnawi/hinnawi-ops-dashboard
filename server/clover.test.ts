import { describe, expect, it } from "vitest";
import { aggregatePaymentsByDay, aggregateShifts, getDateRange } from "./clover";
import type { CloverPayment, CloverShift } from "./clover";

describe("Clover aggregation helpers", () => {
  describe("aggregatePaymentsByDay", () => {
    it("groups successful payments by date and converts cents to dollars", () => {
      const payments: CloverPayment[] = [
        {
          id: "p1",
          amount: 2500, // $25.00
          tipAmount: 500, // $5.00
          taxAmount: 375, // $3.75
          createdTime: new Date("2026-03-01T10:00:00Z").getTime(),
          result: "SUCCESS",
        },
        {
          id: "p2",
          amount: 1800, // $18.00
          tipAmount: 300, // $3.00
          taxAmount: 270, // $2.70
          createdTime: new Date("2026-03-01T14:00:00Z").getTime(),
          result: "SUCCESS",
        },
        {
          id: "p3",
          amount: 3200, // $32.00
          tipAmount: 600, // $6.00
          taxAmount: 480, // $4.80
          createdTime: new Date("2026-03-02T09:00:00Z").getTime(),
          result: "SUCCESS",
        },
      ];

      const result = aggregatePaymentsByDay(payments);

      expect(result).toHaveLength(2);

      // March 1 aggregate
      const day1 = result.find((d) => d.date === "2026-03-01");
      expect(day1).toBeDefined();
      expect(day1!.totalSales).toBeCloseTo(43.0); // 25 + 18
      expect(day1!.totalTips).toBeCloseTo(8.0); // 5 + 3
      expect(day1!.totalTax).toBeCloseTo(6.45); // 3.75 + 2.70
      expect(day1!.orderCount).toBe(2);
      expect(day1!.netSales).toBeCloseTo(36.55); // 43 - 6.45

      // March 2 aggregate
      const day2 = result.find((d) => d.date === "2026-03-02");
      expect(day2).toBeDefined();
      expect(day2!.totalSales).toBeCloseTo(32.0);
      expect(day2!.orderCount).toBe(1);
    });

    it("ignores non-SUCCESS payments", () => {
      const payments: CloverPayment[] = [
        {
          id: "p1",
          amount: 2500,
          tipAmount: 0,
          taxAmount: 0,
          createdTime: new Date("2026-03-01T10:00:00Z").getTime(),
          result: "SUCCESS",
        },
        {
          id: "p2",
          amount: 1000,
          tipAmount: 0,
          taxAmount: 0,
          createdTime: new Date("2026-03-01T11:00:00Z").getTime(),
          result: "DECLINED",
        },
      ];

      const result = aggregatePaymentsByDay(payments);
      expect(result).toHaveLength(1);
      expect(result[0].totalSales).toBeCloseTo(25.0);
      expect(result[0].orderCount).toBe(1);
    });

    it("handles refunds (negative amounts)", () => {
      const payments: CloverPayment[] = [
        {
          id: "p1",
          amount: 5000,
          tipAmount: 0,
          taxAmount: 750,
          createdTime: new Date("2026-03-01T10:00:00Z").getTime(),
          result: "SUCCESS",
        },
        {
          id: "p2",
          amount: -1500,
          tipAmount: 0,
          taxAmount: 0,
          createdTime: new Date("2026-03-01T12:00:00Z").getTime(),
          result: "SUCCESS",
        },
      ];

      const result = aggregatePaymentsByDay(payments);
      expect(result).toHaveLength(1);
      expect(result[0].totalSales).toBeCloseTo(50.0);
      expect(result[0].refundAmount).toBeCloseTo(15.0);
      expect(result[0].netSales).toBeCloseTo(27.5); // (50 - 7.5) + (-15)
    });

    it("returns empty array for empty input", () => {
      expect(aggregatePaymentsByDay([])).toEqual([]);
    });

    it("sorts results by date ascending", () => {
      const payments: CloverPayment[] = [
        {
          id: "p1",
          amount: 1000,
          tipAmount: 0,
          taxAmount: 0,
          createdTime: new Date("2026-03-05T10:00:00Z").getTime(),
          result: "SUCCESS",
        },
        {
          id: "p2",
          amount: 1000,
          tipAmount: 0,
          taxAmount: 0,
          createdTime: new Date("2026-03-01T10:00:00Z").getTime(),
          result: "SUCCESS",
        },
        {
          id: "p3",
          amount: 1000,
          tipAmount: 0,
          taxAmount: 0,
          createdTime: new Date("2026-03-03T10:00:00Z").getTime(),
          result: "SUCCESS",
        },
      ];

      const result = aggregatePaymentsByDay(payments);
      expect(result.map((r) => r.date)).toEqual([
        "2026-03-01",
        "2026-03-03",
        "2026-03-05",
      ]);
    });
  });

  describe("aggregateShifts", () => {
    it("calculates total hours and shift count per employee", () => {
      const shifts: CloverShift[] = [
        {
          id: "s1",
          employee: { id: "e1", name: "Alice" },
          inTime: new Date("2026-03-01T08:00:00Z").getTime(),
          outTime: new Date("2026-03-01T16:00:00Z").getTime(),
        },
        {
          id: "s2",
          employee: { id: "e1", name: "Alice" },
          inTime: new Date("2026-03-02T08:00:00Z").getTime(),
          outTime: new Date("2026-03-02T14:00:00Z").getTime(),
        },
        {
          id: "s3",
          employee: { id: "e2", name: "Bob" },
          inTime: new Date("2026-03-01T09:00:00Z").getTime(),
          outTime: new Date("2026-03-01T17:00:00Z").getTime(),
        },
      ];

      const result = aggregateShifts(shifts);
      expect(result).toHaveLength(2);

      const alice = result.find((r) => r.employeeId === "e1");
      expect(alice).toBeDefined();
      expect(alice!.totalHours).toBeCloseTo(14); // 8 + 6
      expect(alice!.shiftCount).toBe(2);

      const bob = result.find((r) => r.employeeId === "e2");
      expect(bob).toBeDefined();
      expect(bob!.totalHours).toBeCloseTo(8);
      expect(bob!.shiftCount).toBe(1);
    });

    it("skips open shifts (no outTime)", () => {
      const shifts: CloverShift[] = [
        {
          id: "s1",
          employee: { id: "e1", name: "Alice" },
          inTime: new Date("2026-03-01T08:00:00Z").getTime(),
          outTime: new Date("2026-03-01T16:00:00Z").getTime(),
        },
        {
          id: "s2",
          employee: { id: "e2", name: "Bob" },
          inTime: new Date("2026-03-01T09:00:00Z").getTime(),
          // no outTime — still clocked in
        },
      ];

      const result = aggregateShifts(shifts);
      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe("e1");
    });

    it("returns empty array for empty input", () => {
      expect(aggregateShifts([])).toEqual([]);
    });
  });

  describe("getDateRange", () => {
    it("returns start and end timestamps spanning the correct number of days", () => {
      const { startTime, endTime } = getDateRange(7);

      const start = new Date(startTime);
      const end = new Date(endTime);

      // End should be today at 23:59:59
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);

      // Start should be 7 days before end at 00:00:00
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);

      const diffDays = (endTime - startTime) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(7);
      expect(diffDays).toBeLessThan(8);
    });

    it("returns valid timestamps for daysBack=1", () => {
      const { startTime, endTime } = getDateRange(1);
      expect(endTime).toBeGreaterThan(startTime);

      const diffHours = (endTime - startTime) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(24);
      expect(diffHours).toBeLessThan(48);
    });
  });
});
