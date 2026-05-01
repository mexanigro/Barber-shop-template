/**
 * CSV export helpers used by admin tabs.
 *
 * UTF-8 BOM (﻿) is prepended to every file so that Excel on Windows
 * auto-detects the encoding and renders Hebrew / accented characters correctly
 * without the import wizard. Modern browsers and text editors ignore the BOM.
 */

type Column = { key: string; label: string };

function escapeCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Wrap in double-quotes when value contains comma, double-quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replaceAll('"', '""') + '"';
  }
  return s;
}

export function buildCsvBlob(rows: Record<string, unknown>[], columns: Column[]): Blob {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","))
    .join("\n");
  const csv = "﻿" + header + "\n" + body;
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
