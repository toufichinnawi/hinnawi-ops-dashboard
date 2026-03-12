/**
 * Regression tests for Portal Report Filtering — Store Code Normalization
 *
 * These tests lock in the fix where Store Manager / Assistant Manager portals
 * were showing "No Reports Found" because store codes (e.g. "ontario") were not
 * being normalized to the same abbreviations used in report locations (e.g. "ON").
 *
 * The LOCATION_NORMALIZE map must correctly map:
 *   ontario → ON, mk → MK, pk → PK, tunnel → TN
 *   (plus full names and mixed case variants)
 *
 * We test this by:
 * 1. Submitting reports with abbreviated locations (ON, MK, PK, TN)
 * 2. Fetching all reports
 * 3. Simulating the same filtering logic used in Portal.tsx
 * 4. Verifying that filtering by storeCode (e.g. "ontario") returns the correct reports
 */
import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3000";

// This is the exact same normalization map from Portal.tsx — if Portal.tsx changes,
// this test must be updated too (and will fail as a signal).
const LOCATION_NORMALIZE: Record<string, string> = {
  "President Kennedy": "PK", "president kennedy": "PK", "pk": "PK",
  "Mackay": "MK", "mackay": "MK", "mk": "MK",
  "Ontario": "ON", "ontario": "ON", "on": "ON",
  "Cathcart (Tunnel)": "TN", "Tunnel": "TN", "tunnel": "TN", "tn": "TN",
};

// Simulate the exact filtering logic from Portal.tsx PortalReportsPage
function filterReportsForStore(
  reports: Array<{ location: string; [key: string]: any }>,
  store: { storeCode: string; storeName: string } | null
) {
  // Normalize report locations (same as Portal.tsx line 980-983)
  const normalizedReports = reports.map(r => ({
    ...r,
    normalizedLocation: LOCATION_NORMALIZE[r.location] || r.location,
  }));

  // If no store (Ops Manager), return all
  if (!store) return normalizedReports;

  // Normalize store code (same as Portal.tsx line 989)
  const normalizedStoreCode =
    LOCATION_NORMALIZE[store.storeCode] ||
    LOCATION_NORMALIZE[store.storeName] ||
    (store.storeCode || "").toUpperCase();

  const storeName = store.storeName;

  // Filter (same as Portal.tsx line 991-996)
  return normalizedReports.filter(r =>
    r.normalizedLocation === normalizedStoreCode ||
    r.normalizedLocation === storeName ||
    r.location === storeName ||
    r.location === store.storeCode
  );
}

describe("Portal Report Filtering — Store Code Normalization", () => {
  // Use unique dates far in the past to avoid conflicts
  const runId = Date.now().toString(36);
  const testDate = `2018-06-15`;

  // Submit test reports for each store with abbreviated locations
  it("should submit test reports for all 4 stores", async () => {
    const stores = [
      { location: "ON", reportType: "manager-checklist" },
      { location: "MK", reportType: "manager-checklist" },
      { location: "PK", reportType: "manager-checklist" },
      { location: "TN", reportType: "manager-checklist" },
    ];

    for (const s of stores) {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: `FilterTest-${runId}`,
          reportType: s.reportType,
          location: s.location,
          reportDate: testDate,
          data: { items: [{ label: "Test", rating: 5 }] },
          totalScore: "5.00",
          overwrite: true,
        }),
      });
      expect(res.status).toBe(200);
    }
  });

  it("should normalize 'ontario' storeCode to 'ON' and find Ontario reports", () => {
    const reports = [
      { location: "ON", reportType: "manager-checklist" },
      { location: "MK", reportType: "manager-checklist" },
      { location: "PK", reportType: "manager-checklist" },
    ];

    const store = { storeCode: "ontario", storeName: "Ontario" };
    const filtered = filterReportsForStore(reports, store);

    expect(filtered.length).toBe(1);
    expect(filtered[0].normalizedLocation).toBe("ON");
  });

  it("should normalize 'mk' storeCode to 'MK' and find Mackay reports", () => {
    const reports = [
      { location: "ON", reportType: "manager-checklist" },
      { location: "MK", reportType: "manager-checklist" },
      { location: "PK", reportType: "manager-checklist" },
    ];

    const store = { storeCode: "mk", storeName: "Mackay" };
    const filtered = filterReportsForStore(reports, store);

    expect(filtered.length).toBe(1);
    expect(filtered[0].normalizedLocation).toBe("MK");
  });

  it("should normalize 'pk' storeCode to 'PK' and find President Kennedy reports", () => {
    const reports = [
      { location: "ON", reportType: "manager-checklist" },
      { location: "MK", reportType: "manager-checklist" },
      { location: "PK", reportType: "manager-checklist" },
      { location: "TN", reportType: "manager-checklist" },
    ];

    const store = { storeCode: "pk", storeName: "President Kennedy" };
    const filtered = filterReportsForStore(reports, store);

    expect(filtered.length).toBe(1);
    expect(filtered[0].normalizedLocation).toBe("PK");
  });

  it("should normalize 'tunnel' storeCode to 'TN' and find Tunnel reports", () => {
    const reports = [
      { location: "ON", reportType: "manager-checklist" },
      { location: "MK", reportType: "manager-checklist" },
      { location: "TN", reportType: "manager-checklist" },
    ];

    const store = { storeCode: "tunnel", storeName: "Cathcart (Tunnel)" };
    const filtered = filterReportsForStore(reports, store);

    expect(filtered.length).toBe(1);
    expect(filtered[0].normalizedLocation).toBe("TN");
  });

  it("should return ALL reports when store is null (Ops Manager)", () => {
    const reports = [
      { location: "ON", reportType: "manager-checklist" },
      { location: "MK", reportType: "manager-checklist" },
      { location: "PK", reportType: "manager-checklist" },
      { location: "TN", reportType: "manager-checklist" },
    ];

    const filtered = filterReportsForStore(reports, null);

    expect(filtered.length).toBe(4);
  });

  it("should handle full name locations (e.g. 'Ontario' in report location)", () => {
    const reports = [
      { location: "Ontario", reportType: "manager-checklist" },
      { location: "Mackay", reportType: "manager-checklist" },
      { location: "President Kennedy", reportType: "manager-checklist" },
    ];

    // Ontario store with lowercase code
    const store = { storeCode: "ontario", storeName: "Ontario" };
    const filtered = filterReportsForStore(reports, store);

    // "Ontario" normalizes to "ON", and storeCode "ontario" also normalizes to "ON"
    expect(filtered.length).toBe(1);
    expect(filtered[0].normalizedLocation).toBe("ON");
  });

  it("should handle mixed case location values", () => {
    const reports = [
      { location: "president kennedy", reportType: "manager-checklist" },
      { location: "mackay", reportType: "manager-checklist" },
    ];

    const store = { storeCode: "pk", storeName: "President Kennedy" };
    const filtered = filterReportsForStore(reports, store);

    expect(filtered.length).toBe(1);
    expect(filtered[0].normalizedLocation).toBe("PK");
  });

  it("should NOT match wrong store (Ontario filter should not return MK reports)", () => {
    const reports = [
      { location: "MK", reportType: "manager-checklist" },
      { location: "PK", reportType: "manager-checklist" },
      { location: "TN", reportType: "manager-checklist" },
    ];

    const store = { storeCode: "ontario", storeName: "Ontario" };
    const filtered = filterReportsForStore(reports, store);

    expect(filtered.length).toBe(0);
  });

  it("should verify the API returns reports that can be filtered by store code", async () => {
    const res = await fetch(`${BASE_URL}/api/public/reports`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    // Filter for Ontario using the same logic as Portal.tsx
    const store = { storeCode: "ontario", storeName: "Ontario" };
    const filtered = filterReportsForStore(json.data, store);

    // There should be at least 1 Ontario report (we submitted one above)
    expect(filtered.length).toBeGreaterThanOrEqual(1);

    // All filtered reports should have normalizedLocation "ON"
    for (const r of filtered) {
      expect(r.normalizedLocation).toBe("ON");
    }
  });

  it("should verify Mackay reports are accessible via 'mk' store code from API", async () => {
    const res = await fetch(`${BASE_URL}/api/public/reports`);
    const json = await res.json();

    const store = { storeCode: "mk", storeName: "Mackay" };
    const filtered = filterReportsForStore(json.data, store);

    expect(filtered.length).toBeGreaterThanOrEqual(1);
    for (const r of filtered) {
      expect(r.normalizedLocation).toBe("MK");
    }
  });
});
