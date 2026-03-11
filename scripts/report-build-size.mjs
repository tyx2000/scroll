import { brotliCompressSync, gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");
const SIZE_COLUMNS = {
  file: 22,
  raw: 12,
  gzip: 12,
  brotli: 12,
  saved: 10
};

export function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function formatDelta(rawBytes, compressedBytes) {
  if (rawBytes === 0) {
    return "0.0%";
  }

  const savedRatio = ((rawBytes - compressedBytes) / rawBytes) * 100;
  return `${savedRatio.toFixed(1)}%`;
}

function collectFiles(dir) {
  return readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((filePath) => statSync(filePath).isFile())
    .sort((left, right) => left.localeCompare(right));
}

export function createSizeRows(filePaths) {
  return filePaths.map((filePath) => {
    const content = readFileSync(filePath);
    const raw = content.byteLength;
    const gzip = gzipSync(content).byteLength;
    const brotli = brotliCompressSync(content).byteLength;

    return {
      file: path.basename(filePath),
      raw,
      gzip,
      brotli,
      saved: formatDelta(raw, gzip)
    };
  });
}

export function createTable(rows) {
  const header = [
    "File".padEnd(SIZE_COLUMNS.file),
    "Raw".padStart(SIZE_COLUMNS.raw),
    "Gzip".padStart(SIZE_COLUMNS.gzip),
    "Brotli".padStart(SIZE_COLUMNS.brotli),
    "Saved".padStart(SIZE_COLUMNS.saved)
  ].join("  ");

  const separator = [
    "-".repeat(SIZE_COLUMNS.file),
    "-".repeat(SIZE_COLUMNS.raw),
    "-".repeat(SIZE_COLUMNS.gzip),
    "-".repeat(SIZE_COLUMNS.brotli),
    "-".repeat(SIZE_COLUMNS.saved)
  ].join("  ");

  const lines = rows.map((row) =>
    [
      row.file.padEnd(SIZE_COLUMNS.file),
      formatSize(row.raw).padStart(SIZE_COLUMNS.raw),
      formatSize(row.gzip).padStart(SIZE_COLUMNS.gzip),
      formatSize(row.brotli).padStart(SIZE_COLUMNS.brotli),
      row.saved.padStart(SIZE_COLUMNS.saved)
    ].join("  ")
  );

  return [header, separator, ...lines].join("\n");
}

export function createSummary(rows) {
  const totals = rows.reduce(
    (accumulator, row) => ({
      raw: accumulator.raw + row.raw,
      gzip: accumulator.gzip + row.gzip,
      brotli: accumulator.brotli + row.brotli
    }),
    { raw: 0, gzip: 0, brotli: 0 }
  );

  return {
    ...totals,
    saved: formatDelta(totals.raw, totals.gzip)
  };
}

function run() {
  const rows = createSizeRows(collectFiles(DIST_DIR));
  const summary = createSummary(rows);

  console.log("\nBuild size report\n");
  console.log(createTable(rows));
  console.log(
    [
      "\nTotal".padEnd(SIZE_COLUMNS.file + 2),
      formatSize(summary.raw).padStart(SIZE_COLUMNS.raw),
      formatSize(summary.gzip).padStart(SIZE_COLUMNS.gzip),
      formatSize(summary.brotli).padStart(SIZE_COLUMNS.brotli),
      summary.saved.padStart(SIZE_COLUMNS.saved)
    ].join("  ")
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
