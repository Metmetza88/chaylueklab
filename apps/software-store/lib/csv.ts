export function csvCell(value: unknown) {
  const text = String(value ?? "");
  const escaped = (
    /^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text
  ).replaceAll('"', '""');
  return `"${escaped}"`;
}

export function downloadCsv(filename: string, rows: unknown[][]) {
  const csv =
    "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
