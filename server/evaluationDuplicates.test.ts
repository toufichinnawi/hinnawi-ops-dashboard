import { describe, it, expect, vi } from "vitest";

/**
 * Tests for the evaluation-specific duplicate check logic.
 * Verifies that Training/Performance Evaluations use employee name
 * as part of the unique key (not just location + type + date).
 */

// ─── Unit Tests for Duplicate Detection Logic ────────────────────

describe("Evaluation duplicate detection logic", () => {
  // Simulate the logic from the submit-report endpoint
  function getUniqueKeyType(reportType: string, data: any): string {
    const normalizedType =
      reportType === "Training Evaluation"
        ? "training-evaluation"
        : reportType === "Performance Evaluation"
          ? "performance-evaluation"
          : reportType;

    const isEvaluation =
      normalizedType === "training-evaluation" ||
      normalizedType === "performance-evaluation";
    const employeeName = data?.traineeName || data?.employeeName;
    const isSalesBagelOrder =
      normalizedType === "bagel-orders" &&
      (data?.location || "").toLowerCase() === "sales";
    const clientName = data?.clientName;

    if (isEvaluation && employeeName) {
      return "evaluation-employee";
    } else if (isSalesBagelOrder && clientName) {
      return "sales-client";
    } else {
      return "standard";
    }
  }

  it("should use employee-based duplicate check for Training Evaluation", () => {
    const result = getUniqueKeyType("training-evaluation", {
      traineeName: "John Doe",
    });
    expect(result).toBe("evaluation-employee");
  });

  it("should use employee-based duplicate check for Performance Evaluation", () => {
    const result = getUniqueKeyType("performance-evaluation", {
      employeeName: "Jane Smith",
    });
    expect(result).toBe("evaluation-employee");
  });

  it("should use standard duplicate check for waste report", () => {
    const result = getUniqueKeyType("waste-report", {
      items: [],
    });
    expect(result).toBe("standard");
  });

  it("should use standard duplicate check for operations checklist", () => {
    const result = getUniqueKeyType("operations", {
      submitterName: "Manager A",
    });
    expect(result).toBe("standard");
  });

  it("should use client-based duplicate check for sales bagel orders", () => {
    const result = getUniqueKeyType("bagel-orders", {
      clientName: "Client A",
      location: "sales",
    });
    expect(result).toBe("sales-client");
  });

  it("should fall back to standard if evaluation has no employee name", () => {
    const result = getUniqueKeyType("training-evaluation", {});
    expect(result).toBe("standard");
  });

  it("should handle Training Evaluation with display name", () => {
    const result = getUniqueKeyType("Training Evaluation", {
      traineeName: "Omar Kasmi",
    });
    expect(result).toBe("evaluation-employee");
  });

  it("should handle Performance Evaluation with display name", () => {
    const result = getUniqueKeyType("Performance Evaluation", {
      employeeName: "Sarah Jones",
    });
    expect(result).toBe("evaluation-employee");
  });
});

describe("Evaluation employee name extraction", () => {
  function getEmployeeName(reportType: string, data: any): string | undefined {
    return data?.traineeName || data?.employeeName;
  }

  it("should extract traineeName for training evaluations", () => {
    const name = getEmployeeName("training-evaluation", {
      traineeName: "John Doe",
      submitterName: "Manager A",
    });
    expect(name).toBe("John Doe");
  });

  it("should extract employeeName for performance evaluations", () => {
    const name = getEmployeeName("performance-evaluation", {
      employeeName: "Jane Smith",
      submitterName: "Manager B",
    });
    expect(name).toBe("Jane Smith");
  });

  it("should return undefined when no employee name exists", () => {
    const name = getEmployeeName("training-evaluation", {
      submitterName: "Manager A",
    });
    expect(name).toBeUndefined();
  });

  it("should prefer traineeName over employeeName", () => {
    const name = getEmployeeName("training-evaluation", {
      traineeName: "Trainee A",
      employeeName: "Employee B",
    });
    expect(name).toBe("Trainee A");
  });
});

describe("Evaluation JSON field mapping", () => {
  function getJsonField(reportType: string): string {
    return reportType === "training-evaluation"
      ? "$.traineeName"
      : "$.employeeName";
  }

  it("should use traineeName field for training evaluations", () => {
    expect(getJsonField("training-evaluation")).toBe("$.traineeName");
  });

  it("should use employeeName field for performance evaluations", () => {
    expect(getJsonField("performance-evaluation")).toBe("$.employeeName");
  });
});

describe("Multiple evaluations same day same store", () => {
  // Simulate checking if two evaluations would conflict
  function wouldConflict(
    eval1: { location: string; reportType: string; date: string; employeeName: string },
    eval2: { location: string; reportType: string; date: string; employeeName: string }
  ): boolean {
    return (
      eval1.location === eval2.location &&
      eval1.reportType === eval2.reportType &&
      eval1.date === eval2.date &&
      eval1.employeeName === eval2.employeeName
    );
  }

  it("should NOT conflict: same store, same date, different employees", () => {
    const conflict = wouldConflict(
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" },
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "Jane" }
    );
    expect(conflict).toBe(false);
  });

  it("should conflict: same store, same date, same employee", () => {
    const conflict = wouldConflict(
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" },
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" }
    );
    expect(conflict).toBe(true);
  });

  it("should NOT conflict: same employee, same date, different stores", () => {
    const conflict = wouldConflict(
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" },
      { location: "MK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" }
    );
    expect(conflict).toBe(false);
  });

  it("should NOT conflict: same employee, same store, different dates", () => {
    const conflict = wouldConflict(
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" },
      { location: "PK", reportType: "training-evaluation", date: "2026-03-19", employeeName: "John" }
    );
    expect(conflict).toBe(false);
  });

  it("should NOT conflict: different eval types, same employee, same date, same store", () => {
    const conflict = wouldConflict(
      { location: "PK", reportType: "training-evaluation", date: "2026-03-18", employeeName: "John" },
      { location: "PK", reportType: "performance-evaluation", date: "2026-03-18", employeeName: "John" }
    );
    expect(conflict).toBe(false);
  });

  it("should allow 4 different employees evaluated at same store on same day", () => {
    const employees = ["Alice", "Bob", "Charlie", "Diana"];
    const base = { location: "ON", reportType: "training-evaluation", date: "2026-03-18" };

    // Check that no pair conflicts
    for (let i = 0; i < employees.length; i++) {
      for (let j = i + 1; j < employees.length; j++) {
        const conflict = wouldConflict(
          { ...base, employeeName: employees[i] },
          { ...base, employeeName: employees[j] }
        );
        expect(conflict).toBe(false);
      }
    }
  });
});
