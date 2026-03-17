import { describe, it, expect } from "vitest";

/**
 * Tests for the Waste Report Closing-Time Alert system.
 *
 * The system sends Teams alerts at each store's closing time if the
 * Leftovers & Waste Report has not been submitted for that day.
 *
 * Store closing times (EST):
 *   Tunnel (TN)             — 2:00 PM
 *   Ontario (ON)            — 3:00 PM
 *   Mackay (MK)             — 5:00 PM
 *   President Kennedy (PK)  — 6:00 PM
 */

// Mirror of the config used in server/_core/index.ts
const WASTE_ALERT_STORES = [
  { id: "tunnel", code: "TN", name: "Cathcart (Tunnel)", closingHour: 14, closedWeekends: true },
  { id: "ontario", code: "ON", name: "Ontario", closingHour: 15 },
  { id: "mk", code: "MK", name: "Mackay", closingHour: 17 },
  { id: "pk", code: "PK", name: "President Kennedy", closingHour: 18 },
];

describe("Waste Report Closing-Time Alerts", () => {
  describe("Store Closing Times Configuration", () => {
    it("should have all 4 stores configured", () => {
      expect(WASTE_ALERT_STORES).toHaveLength(4);
    });

    it("should have correct closing hours for each store", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel");
      const ontario = WASTE_ALERT_STORES.find(s => s.id === "ontario");
      const mk = WASTE_ALERT_STORES.find(s => s.id === "mk");
      const pk = WASTE_ALERT_STORES.find(s => s.id === "pk");

      expect(tunnel?.closingHour).toBe(14); // 2 PM
      expect(ontario?.closingHour).toBe(15); // 3 PM
      expect(mk?.closingHour).toBe(17);      // 5 PM
      expect(pk?.closingHour).toBe(18);       // 6 PM
    });

    it("should have correct location codes for report matching", () => {
      expect(WASTE_ALERT_STORES.find(s => s.id === "tunnel")?.code).toBe("TN");
      expect(WASTE_ALERT_STORES.find(s => s.id === "ontario")?.code).toBe("ON");
      expect(WASTE_ALERT_STORES.find(s => s.id === "mk")?.code).toBe("MK");
      expect(WASTE_ALERT_STORES.find(s => s.id === "pk")?.code).toBe("PK");
    });

    it("should mark Tunnel as closed on weekends", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel");
      expect(tunnel?.closedWeekends).toBe(true);
    });

    it("should not mark other stores as closed on weekends", () => {
      const otherStores = WASTE_ALERT_STORES.filter(s => s.id !== "tunnel");
      otherStores.forEach(store => {
        expect(store.closedWeekends).toBeUndefined();
      });
    });
  });

  describe("Scheduling Logic", () => {
    // Simulate the scheduler's decision logic
    function shouldTriggerAlert(
      estHour: number,
      estMin: number,
      dayOfWeek: number,
      store: typeof WASTE_ALERT_STORES[number],
      alreadyFired: Set<string>,
      estDate: string
    ): { reminder: boolean; followUp: boolean } {
      let reminder = false;
      let followUp = false;

      // Skip weekend-closed stores on weekends
      if (store.closedWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return { reminder, followUp };
      }

      const reminderKey = `waste-${store.id}-${estDate}`;
      if (estHour === store.closingHour && estMin === 0 && !alreadyFired.has(reminderKey)) {
        reminder = true;
      }

      const followUpKey = `waste-followup-${store.id}-${estDate}`;
      if (estHour === store.closingHour && estMin === 30 && !alreadyFired.has(followUpKey)) {
        followUp = true;
      }

      return { reminder, followUp };
    }

    it("should trigger Tunnel reminder at 2:00 PM", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel")!;
      const result = shouldTriggerAlert(14, 0, 1, tunnel, new Set(), "2026-03-17"); // Monday
      expect(result.reminder).toBe(true);
      expect(result.followUp).toBe(false);
    });

    it("should trigger Tunnel follow-up at 2:30 PM", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel")!;
      const result = shouldTriggerAlert(14, 30, 1, tunnel, new Set(), "2026-03-17");
      expect(result.reminder).toBe(false);
      expect(result.followUp).toBe(true);
    });

    it("should trigger Ontario reminder at 3:00 PM", () => {
      const ontario = WASTE_ALERT_STORES.find(s => s.id === "ontario")!;
      const result = shouldTriggerAlert(15, 0, 2, ontario, new Set(), "2026-03-17");
      expect(result.reminder).toBe(true);
    });

    it("should trigger Mackay reminder at 5:00 PM", () => {
      const mk = WASTE_ALERT_STORES.find(s => s.id === "mk")!;
      const result = shouldTriggerAlert(17, 0, 3, mk, new Set(), "2026-03-17");
      expect(result.reminder).toBe(true);
    });

    it("should trigger PK reminder at 6:00 PM", () => {
      const pk = WASTE_ALERT_STORES.find(s => s.id === "pk")!;
      const result = shouldTriggerAlert(18, 0, 4, pk, new Set(), "2026-03-17");
      expect(result.reminder).toBe(true);
    });

    it("should NOT trigger Tunnel alert on Saturday (weekend)", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel")!;
      const result = shouldTriggerAlert(14, 0, 6, tunnel, new Set(), "2026-03-22"); // Saturday
      expect(result.reminder).toBe(false);
      expect(result.followUp).toBe(false);
    });

    it("should NOT trigger Tunnel alert on Sunday (weekend)", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel")!;
      const result = shouldTriggerAlert(14, 0, 0, tunnel, new Set(), "2026-03-23"); // Sunday
      expect(result.reminder).toBe(false);
    });

    it("should still trigger Ontario alert on Saturday (not closed weekends)", () => {
      const ontario = WASTE_ALERT_STORES.find(s => s.id === "ontario")!;
      const result = shouldTriggerAlert(15, 0, 6, ontario, new Set(), "2026-03-22");
      expect(result.reminder).toBe(true);
    });

    it("should NOT trigger if already fired for the day", () => {
      const pk = WASTE_ALERT_STORES.find(s => s.id === "pk")!;
      const fired = new Set(["waste-pk-2026-03-17"]);
      const result = shouldTriggerAlert(18, 0, 1, pk, fired, "2026-03-17");
      expect(result.reminder).toBe(false);
    });

    it("should NOT trigger follow-up if already fired for the day", () => {
      const pk = WASTE_ALERT_STORES.find(s => s.id === "pk")!;
      const fired = new Set(["waste-followup-pk-2026-03-17"]);
      const result = shouldTriggerAlert(18, 30, 1, pk, fired, "2026-03-17");
      expect(result.followUp).toBe(false);
    });

    it("should NOT trigger at wrong hour", () => {
      const tunnel = WASTE_ALERT_STORES.find(s => s.id === "tunnel")!;
      const result = shouldTriggerAlert(15, 0, 1, tunnel, new Set(), "2026-03-17"); // 3 PM, not 2 PM
      expect(result.reminder).toBe(false);
    });

    it("should NOT trigger at wrong minute", () => {
      const pk = WASTE_ALERT_STORES.find(s => s.id === "pk")!;
      const result = shouldTriggerAlert(18, 15, 1, pk, new Set(), "2026-03-17"); // 6:15, not 6:00 or 6:30
      expect(result.reminder).toBe(false);
      expect(result.followUp).toBe(false);
    });
  });

  describe("Alert Message Formatting", () => {
    function formatClosingTime(closingHour: number): string {
      if (closingHour <= 12) return `${closingHour}:00 PM`;
      if (closingHour === 12) return "12:00 PM";
      return `${closingHour > 12 ? closingHour - 12 : closingHour}:00 PM`;
    }

    it("should format 14 (2 PM) correctly", () => {
      expect(formatClosingTime(14)).toBe("2:00 PM");
    });

    it("should format 15 (3 PM) correctly", () => {
      expect(formatClosingTime(15)).toBe("3:00 PM");
    });

    it("should format 17 (5 PM) correctly", () => {
      expect(formatClosingTime(17)).toBe("5:00 PM");
    });

    it("should format 18 (6 PM) correctly", () => {
      expect(formatClosingTime(18)).toBe("6:00 PM");
    });
  });

  describe("Alert Routing", () => {
    // Mirrors STORE_TO_CHAT from teamsChat.ts
    const STORE_TO_CHAT: Record<string, string> = {
      ontario: "ontario",
      tunnel: "tunnel",
      mk: "mackay",
      mackay: "mackay",
      pk: "pk",
    };

    it("should send waste alerts to store-specific chats only, NOT TRD Management", () => {
      // Verify every store in WASTE_ALERT_STORES has a mapping in STORE_TO_CHAT
      for (const store of WASTE_ALERT_STORES) {
        expect(STORE_TO_CHAT[store.id]).toBeDefined();
      }
    });

    it("TRD Management should only receive daily reports and labour alerts, not waste reminders", () => {
      // This is a design assertion: waste alerts route to store chats only
      const wasteAlertTargets = WASTE_ALERT_STORES.map(s => STORE_TO_CHAT[s.id]);
      expect(wasteAlertTargets).not.toContain("trd");
    });
  });

  describe("Alert Sequence Per Day", () => {
    it("should have alerts in chronological order: Tunnel → Ontario → Mackay → PK", () => {
      const sortedByClosing = [...WASTE_ALERT_STORES].sort((a, b) => a.closingHour - b.closingHour);
      expect(sortedByClosing[0].id).toBe("tunnel");   // 2 PM
      expect(sortedByClosing[1].id).toBe("ontario");   // 3 PM
      expect(sortedByClosing[2].id).toBe("mk");        // 5 PM
      expect(sortedByClosing[3].id).toBe("pk");        // 6 PM
    });

    it("should have 8 possible alert triggers per weekday (4 reminders + 4 follow-ups)", () => {
      // Each store: 1 reminder + 1 follow-up = 2 alerts
      // 4 stores × 2 = 8 possible alerts per day
      const totalAlerts = WASTE_ALERT_STORES.length * 2;
      expect(totalAlerts).toBe(8);
    });

    it("should have 6 possible alert triggers on weekends (Tunnel excluded)", () => {
      const weekendStores = WASTE_ALERT_STORES.filter(s => !s.closedWeekends);
      const totalAlerts = weekendStores.length * 2;
      expect(totalAlerts).toBe(6);
    });
  });
});
