export interface SizeRow {
  file: string;
  raw: number;
  gzip: number;
  brotli: number;
  saved: string;
}

export interface SizeSummary {
  raw: number;
  gzip: number;
  brotli: number;
  saved: string;
}

export function formatSize(bytes: number): string;
export function formatDelta(rawBytes: number, compressedBytes: number): string;
export function createSizeRows(filePaths: string[]): SizeRow[];
export function createTable(rows: SizeRow[]): string;
export function createSummary(rows: SizeRow[]): SizeSummary;
