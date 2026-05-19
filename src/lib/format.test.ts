import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatHa,
  formatInt,
  formatLongDate,
  formatNumber,
} from "./format";

describe("formatNumber", () => {
  it("formats integers with thousands separator", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(-1234)).toBe("-1.234");
  });

  it("formats decimals with comma", () => {
    expect(formatNumber(1234.5, { decimals: 1 })).toBe("1.234,5");
    expect(formatNumber(0.4, { decimals: 2 })).toBe("0,40");
    expect(formatNumber(208.02, { decimals: 1 })).toBe("208,0");
    expect(formatNumber(208.02, { decimals: 2 })).toBe("208,02");
  });

  it("can skip thousands separator", () => {
    expect(formatNumber(1234, { thousands: false })).toBe("1234");
    expect(formatNumber(1234.5, { decimals: 1, thousands: false })).toBe(
      "1234,5",
    );
  });

  it("returns the fallback for invalid input", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber("")).toBe("—");
    expect(formatNumber("abc")).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatNumber(null, { fallback: "0" })).toBe("0");
  });

  it("coerces string numerics", () => {
    expect(formatNumber("1234.5", { decimals: 1 })).toBe("1.234,5");
  });
});

describe("formatHa / formatInt", () => {
  it("formatHa defaults to 1 decimal", () => {
    expect(formatHa(208.04)).toBe("208,0");
    expect(formatHa(12345.6)).toBe("12.345,6");
    expect(formatHa(null)).toBe("—");
  });

  it("formatHa with custom decimals", () => {
    expect(formatHa(208.025, 2)).toBe("208,03");
    expect(formatHa(208, 0)).toBe("208");
  });

  it("formatInt rounds to zero decimals with thousands", () => {
    expect(formatInt(1234567)).toBe("1.234.567");
    expect(formatInt(null)).toBe("—");
  });
});

describe("formatDate / formatDateTime", () => {
  it("formats ISO strings as DD/MM/YYYY", () => {
    // Use a UTC-noon timestamp so it lands on the expected calendar day
    // in any reasonable system timezone.
    expect(formatDate("2026-05-18T12:00:00Z").endsWith("/2026")).toBe(true);
    const parts = formatDate("2026-05-18T12:00:00Z").split("/");
    expect(parts).toHaveLength(3);
    expect(parts[2]).toBe("2026");
  });

  it("formats Date objects", () => {
    const d = new Date(2026, 4, 18, 14, 5); // local 2026-05-18 14:05
    expect(formatDate(d)).toBe("18/05/2026");
    expect(formatDateTime(d)).toBe("18/05/2026 14:05");
  });

  it("returns the fallback for invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("formatLongDate", () => {
  it("renders Spanish month names", () => {
    const d = new Date(2026, 4, 18); // May
    expect(formatLongDate(d)).toBe("18 de mayo de 2026");
    const d2 = new Date(2026, 11, 3); // December
    expect(formatLongDate(d2)).toBe("3 de diciembre de 2026");
  });

  it("returns the fallback for invalid input", () => {
    expect(formatLongDate("")).toBe("—");
  });
});
