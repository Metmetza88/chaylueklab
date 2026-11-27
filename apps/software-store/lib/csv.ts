export function csvCell(value: unknown) {
  const text = String(value ?? "");
  const escaped = (
    /^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text
  ).replaceAll('"', '""');
  return `"${escaped}"`;
}
