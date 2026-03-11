import { describe, expect, it } from "vitest";

import {
  createSummary,
  createTable,
  formatDelta,
  formatSize
} from "../scripts/report-build-size.mjs";

describe("report-build-size", () => {
  it("formats byte sizes into aligned human-readable units", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2.00 KB");
    expect(formatSize(15_360)).toBe("15.0 KB");
    expect(formatSize(1_572_864)).toBe("1.50 MB");
  });

  it("formats saved ratio with one decimal place", () => {
    expect(formatDelta(1000, 250)).toBe("75.0%");
    expect(formatDelta(0, 0)).toBe("0.0%");
  });

  it("renders a stable table layout and summary", () => {
    const rows = [
      { file: "index.cjs", raw: 17060, gzip: 5100, brotli: 4420, saved: "70.1%" },
      { file: "index.js", raw: 15370, gzip: 4710, brotli: 4100, saved: "69.4%" }
    ];

    const table = createTable(rows);
    const [header, separator, firstRow] = table.split("\n");
    const summary = createSummary(rows);

    expect(header).toContain("File");
    expect(header).toContain("Raw");
    expect(separator).toMatch(/^-+/);
    expect(firstRow.startsWith("index.cjs")).toBe(true);
    expect(summary).toEqual({
      raw: 32430,
      gzip: 9810,
      brotli: 8520,
      saved: "69.8%"
    });
  });
});
