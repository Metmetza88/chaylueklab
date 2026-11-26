export const COMMAND = { STITCH: 0, JUMP: 1, TRIM: 2, END: 4, COLOR_CHANGE: 5 };
export function bounds(object) {
  const pts = object.paths.flatMap((p) => p.points);
  if (!pts.length) return [0, 0, 0, 0];
  const [ox, oy] = object.offset || [0, 0];
  let x1 = Infinity,
    y1 = Infinity,
    x2 = -Infinity,
    y2 = -Infinity;
  for (const [x, y] of pts) {
    x1 = Math.min(x1, x + ox);
    y1 = Math.min(y1, y + oy);
    x2 = Math.max(x2, x + ox);
    y2 = Math.max(y2, y + oy);
  }
  return [x1, y1, x2, y2];
}
export function sequence(design) {
  const result = [];
  for (const obj of design?.objects || []) {
    if (obj.visible === false) continue;
    const color = obj.color.toLowerCase();
    if (result.at(-1)?.color !== color)
      result.push({ stop: result.length + 1, color });
  }
  return result;
}
export function moveObject(design, id, delta) {
  const index = design.objects.findIndex((o) => o.id === id);
  if (index < 0 || index + delta < 0 || index + delta >= design.objects.length)
    return false;
  const [obj] = design.objects.splice(index, 1);
  design.objects.splice(index + delta, 0, obj);
  return true;
}
export function clientDesign(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.objects) ||
    !value.objects.length ||
    value.objects.length > 100
  )
    throw new Error("ไฟล์แบบไม่ถูกต้อง");
  for (const key of ["width_mm", "height_mm"])
    if (!Number.isFinite(value[key]) || value[key] < 1 || value[key] > 120)
      throw new Error("ขนาดแบบไม่ถูกต้อง");
  let total = 0;
  const ids = new Set();
  for (const obj of value.objects) {
    if (
      typeof obj.id !== "string" ||
      ids.has(obj.id) ||
      obj.id.length > 80 ||
      !/^#[a-f0-9]{6}$/i.test(obj.color)
    )
      throw new Error("รหัสวัตถุหรือสีไม่ถูกต้อง");
    ids.add(obj.id);
    if (!Array.isArray(obj.paths) || obj.paths.length > 6000)
      throw new Error("จำนวนเส้นเกินขีดจำกัด");
    for (const path of obj.paths) {
      if (!Array.isArray(path.points) || path.points.length < 2)
        throw new Error("เส้นไม่ถูกต้อง");
      total += path.points.length;
      if (total > 100000) throw new Error("จำนวนจุดเกินขีดจำกัด");
      for (const pt of path.points)
        if (
          !Array.isArray(pt) ||
          pt.length !== 2 ||
          pt.some((n) => !Number.isFinite(n) || Math.abs(n) > 180)
        )
          throw new Error("พิกัดไม่ถูกต้อง");
    }
    if (
      obj.offset &&
      (!Array.isArray(obj.offset) ||
        obj.offset.length !== 2 ||
        obj.offset.some((n) => !Number.isFinite(n) || Math.abs(n) > 120))
    )
      throw new Error("ตำแหน่งไม่ถูกต้อง");
  }
  return value;
}
export function designSVG(design) {
  clientDesign(design);
  const visible = design.objects.filter((o) => o.visible !== false);
  const boxes = visible.map(bounds);
  const left = Math.min(-design.width_mm / 2, ...boxes.map((b) => b[0])) - 1;
  const top = Math.min(-design.height_mm / 2, ...boxes.map((b) => b[1])) - 1;
  const width =
    Math.max(design.width_mm / 2, ...boxes.map((b) => b[2])) - left + 1;
  const height =
    Math.max(design.height_mm / 2, ...boxes.map((b) => b[3])) - top + 1;
  const paths = visible
    .flatMap((obj) =>
      obj.paths.map(
        (p) =>
          `<polyline fill="none" stroke="${obj.color}" stroke-width="${p.kind === "underlay" ? ".1" : ".18"}" points="${p.points.map(([x, y]) => `${x + (obj.offset?.[0] || 0)},${y + (obj.offset?.[1] || 0)}`).join(" ")}"/>`,
      ),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${left} ${top} ${width} ${height}"><title>WORAMET experimental stitch paths</title>${paths}</svg>`;
}
export function parseRecord(raw) {
  const record = JSON.parse(raw);
  const design = clientDesign(record.design || record);
  // Imported metadata is plain text only; source data may only be a local raster URL.
  const source =
    typeof record.source === "string" &&
    /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(record.source) &&
    record.source.length < 3400000
      ? record.source
      : null;
  return {
    design,
    source,
    customer:
      typeof record.customer === "string" ? record.customer.slice(0, 100) : "",
    note: typeof record.note === "string" ? record.note.slice(0, 1000) : "",
  };
}
