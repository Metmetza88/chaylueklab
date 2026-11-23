import {
  COMMAND,
  bounds,
  sequence,
  moveObject,
  clientDesign,
  designSVG,
  parseRecord,
} from "./core.mjs";
import { saveJob, allJobs, deleteJob } from "./storage.mjs";
const $ = (id) => document.getElementById(id),
  copy = (value) => structuredClone(value);
const canvas = $("stage"),
  ctx = canvas.getContext("2d"),
  stage = $("stage-wrap");
const state = {
  design: null,
  result: null,
  selected: null,
  source: null,
  image: null,
  sourceView: false,
  showSource: false,
  grid: true,
  zoom: 100,
  scale: 6,
  pan: [0, 0],
  tool: "select",
  points: [],
  undo: [],
  redo: [],
  dirty: false,
  api: false,
  serial: 0,
  busy: false,
  playing: false,
  position: 1,
  jobId: null,
  filename: "sample-crest",
  revision: 0,
};
let toastTimer,
  compileTimer,
  playFrame,
  lastTime = 0;
const menus = {
  File: [
    ["แบบว่างใหม่", "new"],
    ["อัปโหลดภาพ…", "upload"],
    ["เปิดไฟล์แบบ / คำขอ…", "import"],
    ["บันทึกในเครื่อง", "save"],
    ["ดาวน์โหลดไฟล์แบบ .json", "project"],
    ["ประวัติงานในเครื่อง", "history"],
  ],
  Edit: [
    ["เลิกทำ", "undo"],
    ["ทำซ้ำ", "redo"],
    ["ลบวัตถุที่เลือก", "delete"],
  ],
  View: [
    ["พอดีจอ", "fit"],
    ["ซูมเข้า", "zoom-in"],
    ["ซูมออก", "zoom-out"],
    ["ขนาดจริง* / สอบเทียบจอ", "actual"],
    ["เปิด / ปิด Grid", "grid"],
    ["เปิด / ปิดภาพต้นฉบับ", "source"],
  ],
  Design: [
    ["แบบตัวอย่างสังเคราะห์ 50 มม.", "sample"],
    ["สร้างใหม่จากภาพ", "digitize"],
  ],
  Stitch: [
    ["เริ่ม / หยุดจำลอง DST", "play"],
    ["ตรวจสอบฝีเข็มปัจจุบัน", "inspect"],
    ["จบเส้นที่กำลังวาด", "finish-path"],
  ],
  Image: [
    ["อัปโหลด JPG / PNG", "upload"],
    ["เปิด / ปิดภาพต้นฉบับ", "source"],
  ],
  Machine: [["Tajima หัวเดียว / ข้อจำกัด", "machine"]],
  Export: [
    ["Tajima DST · Experimental", "export-dst"],
    ["Brother PES · Experimental", "export-pes"],
    ["Janome JEF · Experimental", "export-jef"],
    ["Stitch Paths SVG", "export-svg"],
    ["PNG Preview", "export-png"],
    ["ลำดับสีด้าย JSON", "threads"],
    ["EMB · Not Available", null],
  ],
};
for (const [name, entries] of Object.entries(menus)) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = name;
  details.append(summary);
  const popup = document.createElement("div");
  popup.className = "menu-popup";
  for (const [title, action] of entries) {
    const b = document.createElement("button");
    b.textContent = title;
    b.disabled = !action;
    if (action) b.dataset.action = action;
    popup.append(b);
  }
  details.append(popup);
  $("menus").append(details);
  details.addEventListener("toggle", () => {
    if (details.open)
      document.querySelectorAll(".menus details").forEach((d) => {
        if (d !== details) d.open = false;
      });
  });
}
const toolList = [
  ["select", "↖", "Select"],
  ["reshape", "⌘", "Reshape"],
  ["pen", "⌁", "Pen"],
  ["running", "┄", "Running"],
  ["satin", "≋", "Satin"],
  ["tatami", "▧", "Tatami"],
  ["outline", "⬡", "Outline"],
  ["text", "T", "Text N/A"],
  ["zoom", "⊕", "Zoom"],
  ["pan", "✥", "Pan"],
];
for (const [id, icon, label] of toolList) {
  const b = document.createElement("button");
  b.className = `tool ${["satin", "tatami", "running"].includes(id) ? "experimental-tool" : ""}`;
  b.dataset.tool = id;
  b.title =
    id === "text"
      ? "Not Available — ยังไม่มีเครื่องมือ digitize ตัวอักษรไทย"
      : `${label}${id === "reshape" ? " · เฉพาะจุดควบคุมเส้นที่วาดเอง" : ""}`;
  const span = document.createElement("span");
  span.textContent = icon;
  if (id === "select")
    span.innerHTML =
      '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3v16l4-5 4 7 3-2-4-7h7Z"/></svg>';
  const small = document.createElement("small");
  small.textContent = label;
  b.append(span, small);
  $("tools").append(b);
}
for (let n = 1; n <= 15; n++) {
  const option = document.createElement("option");
  option.value = n;
  option.textContent = `${n} สี`;
  option.selected = n === 3;
  $("colors").append(option);
}
function message(text, toast = false) {
  $("status").textContent = text;
  if (toast) {
    clearTimeout(toastTimer);
    $("toast").textContent = text;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => ($("toast").hidden = true), 6000);
  }
}
function modal(title, content) {
  $("modal-title").textContent = title;
  $("modal-body").replaceChildren();
  if (typeof content === "string") {
    const p = document.createElement("p");
    p.textContent = content;
    $("modal-body").append(p);
  } else $("modal-body").append(content);
  $("modal").showModal();
}
function selected() {
  return state.design?.objects.find((o) => o.id === state.selected);
}
function owner() {
  return $("mode").value === "owner";
}
function requireOwner() {
  if (!owner())
    throw new Error(
      "เปลี่ยนเป็นโหมดเจ้าของร้านเพื่อแก้ไขหรือส่งออก (โหมดสาธิต ไม่มีระบบยืนยันตัวตน)",
    );
}
async function api(payload) {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(
      new URL("../../api/embroidery", import.meta.url),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    const data = await response.json().catch(() => {
      throw new Error("API ยังไม่พร้อม เปิดด้วย Python server ตามคู่มือ");
    });
    if (!response.ok) throw new Error(data.error || `API ${response.status}`);
    return data;
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error("ประมวลผลเกิน 45 วินาที กรุณาลดขนาดหรือจำนวนสี");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
function settings() {
  for (const id of ["width", "length", "density", "angle", "pull"])
    if (!$(id).reportValidity()) throw new Error("กรุณาตรวจค่าที่กรอก");
  return {
    width_mm: Number($("width").value),
    colors: Number($("colors").value),
    fabric: $("fabric").value,
    stitch_type: $("stitch-type").value,
    stitch_length: Number($("length").value),
    density: Number($("density").value),
    angle: Number($("angle").value),
    pull_compensation: Number($("pull").value),
    underlay: $("underlay").checked,
    remove_white: $("remove-white").checked,
  };
}
function applySettings(design) {
  const v = design.settings;
  if (!v) return;
  for (const [id, key] of Object.entries({
    width: "width_mm",
    colors: "colors",
    fabric: "fabric",
    "stitch-type": "stitch_type",
    length: "stitch_length",
    density: "density",
    angle: "angle",
    pull: "pull_compensation",
  }))
    if (v[key] !== undefined) $(id).value = v[key];
  for (const [id, key] of [
    ["underlay", "underlay"],
    ["remove-white", "remove_white"],
  ])
    $(id).checked = v[key] !== false;
}
function dimensions() {
  const ratio = state.image
    ? state.image.naturalHeight / state.image.naturalWidth
    : state.design
      ? state.design.height_mm / state.design.width_mm
      : 1;
  $("height").value = (Number($("width").value) * ratio).toFixed(1);
}
function checkpoint() {
  if (!state.design) return;
  state.undo.push(copy(state.design));
  if (state.undo.length > 12) state.undo.shift();
  state.redo = [];
}
function edited() {
  state.revision++;
  state.serial++;
  state.dirty = true;
  state.result = null;
  message("แบบเปลี่ยนแล้ว · รอเข้ารหัสฝีเข็มใหม่…");
  stop();
  state.position = 1;
  refresh();
  scheduleCompile();
}
function scheduleCompile() {
  clearTimeout(compileTimer);
  compileTimer = setTimeout(
    () => compile().catch((e) => message(e.message, true)),
    350,
  );
}
async function compile() {
  clearTimeout(compileTimer);
  if (!state.design) return null;
  const serial = ++state.serial;
  const design = copy(state.design);
  message("กำลังตรวจและเข้ารหัสฝีเข็ม…");
  const result = await api({ action: "export", design, format: "dst" });
  if (serial !== state.serial) return null;
  state.result = result;
  state.dirty = false;
  state.position = 1;
  refresh();
  message(
    `ตรวจ DST แล้ว · ${result.metrics.stitch_count.toLocaleString("th-TH")} ฝีเข็ม · Experimental`,
  );
  return result;
}
function busy(value) {
  state.busy = value;
  document.body.classList.toggle("busy", value);
  $("digitize").disabled = value;
}
async function digitize() {
  if (!state.source) throw new Error("กรุณาอัปโหลดภาพก่อน");
  if (state.busy) return;
  const opt = settings(),
    revision = state.revision,
    serial = ++state.serial;
  busy(true);
  message("กำลังแยกสีและสร้างฝีเข็ม…");
  try {
    const result = await api({
      action: "digitize",
      image_base64: state.source.split(",")[1],
      ...opt,
    });
    if (serial !== state.serial || revision !== state.revision) return;
    checkpoint();
    state.design = clientDesign(result.design);
    state.design.name = state.filename;
    state.selected = state.design.objects[0].id;
    state.result = result;
    state.dirty = false;
    state.position = 1;
    state.revision++;
    state.sourceView = false;
    state.showSource = false;
    fit();
    refresh();
    message("สร้างฝีเข็มรุ่นทดลองแล้ว ตรวจแนวฝีเข็มและคำเตือนก่อนส่งออก", true);
    $("properties").classList.remove("open");
    $("toggle-properties").setAttribute("aria-expanded", "false");
  } finally {
    busy(false);
  }
}
async function loadRaster(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("อ่านภาพไม่ได้"));
    image.src = source;
  });
}
async function upload(file) {
  if (!file) return;
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2500000)
    throw new Error("รองรับ JPG/PNG สูงสุด 2.5 MB");
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await loadRaster(data);
  if (image.naturalWidth * image.naturalHeight > 12000000)
    throw new Error("ภาพต้องไม่เกิน 12 ล้านพิกเซล");
  state.source = data;
  state.image = image;
  state.filename = file.name.replace(/\.[^.]+$/, "");
  state.sourceView = true;
  state.showSource = true;
  state.design = null;
  state.result = null;
  state.selected = null;
  state.jobId = null;
  state.undo = [];
  state.redo = [];
  state.serial++;
  state.revision++;
  stop();
  dimensions();
  refresh();
  fit();
  message("ภาพพร้อมแล้ว ตั้งขนาดและสี จากนั้นกด Auto Digitize", true);
}
async function sample() {
  const [result, image] = await Promise.all([
    fetch(new URL("./sample.json", import.meta.url)).then((r) => {
      if (!r.ok) throw new Error("เปิดตัวอย่างไม่ได้");
      return r.json();
    }),
    loadRaster(new URL("./sample.png", import.meta.url).href),
  ]);
  const off = document.createElement("canvas");
  off.width = image.naturalWidth;
  off.height = image.naturalHeight;
  off.getContext("2d").drawImage(image, 0, 0);
  state.source = off.toDataURL("image/png");
  state.image = image;
  state.design = clientDesign(result.design);
  state.result = result;
  state.selected = state.design.objects[0].id;
  state.filename = "sample-crest";
  state.jobId = null;
  state.undo = [];
  state.redo = [];
  state.dirty = false;
  state.sourceView = false;
  state.showSource = false;
  state.position = 1;
  state.serial++;
  state.revision++;
  stop();
  applySettings(state.design);
  dimensions();
  fit();
  refresh();
  message("แบบตัวอย่างสังเคราะห์ 50 มม. · ไม่ใช่โลโก้โรงเรียนบ้านระหาร");
}
function refresh() {
  const design = state.design,
    obj = selected(),
    seq = sequence(design),
    metrics = state.result?.metrics;
  $("project-name").textContent = state.filename || "แบบใหม่";
  $("document-label").textContent =
    `${state.filename} · ${design?.width_mm || $("width").value} mm`;
  $("hoop-size").textContent =
    `พื้นที่แบบ ${design?.width_mm || $("width").value} × ${design?.height_mm || $("height").value} มม.`;
  $("actual-size").textContent = metrics
    ? `ขอบเขตฝีเข็มจริง ${metrics.width_mm} × ${metrics.height_mm} มม.`
    : "";
  $("stitch-count").textContent = metrics
    ? metrics.stitch_count.toLocaleString("th-TH")
    : "—";
  $("thread-count").textContent = metrics
    ? `${metrics.thread_colors} / ${metrics.color_stops} ช่วง`
    : "—";
  $("time").textContent = metrics ? `${metrics.estimated_minutes} นาที*` : "—";
  $("stage-caption").textContent =
    state.filename === "sample-crest"
      ? "SYNTHETIC SAMPLE · ไม่ใช่ตราโรงเรียน"
      : state.dirty
        ? "กำลังแก้แบบ · ต้องเข้ารหัสใหม่ก่อนส่งออก"
        : "EXPERIMENTAL · ตรวจแนวฝีเข็มก่อนปัก";
  $("view-stitch").classList.toggle("active", !state.sourceView);
  $("view-source").classList.toggle("active", state.sourceView);
  $("object-select").replaceChildren();
  for (const o of design?.objects || []) {
    const el = document.createElement("option");
    el.value = o.id;
    el.textContent = `${o.visible === false ? "○ " : "● "}${o.name || o.type}`;
    el.selected = o.id === state.selected;
    $("object-select").append(el);
  }
  $("object-properties").hidden = !obj;
  if (obj) {
    $("object-name").value = obj.name || "";
    $("object-color").value = obj.color;
    $("object-x").value = (obj.offset || [0, 0])[0];
    $("object-y").value = (obj.offset || [0, 0])[1];
    $("object-visible").checked = obj.visible !== false;
    const b = bounds(obj);
    $("object-info").textContent =
      `${obj.type} · ${(b[2] - b[0]).toFixed(1)} × ${(b[3] - b[1]).toFixed(1)} mm · ${obj.paths.length} เส้น · Experimental`;
  }
  $("palette").replaceChildren();
  const colors = [...new Set(design?.objects.map((o) => o.color) || [])];
  for (const color of colors) {
    const b = document.createElement("button");
    b.className = `swatch ${obj?.color === color ? "selected" : ""}`;
    b.style.background = color;
    b.title = color;
    b.setAttribute("aria-label", `เลือกด้าย ${color}`);
    b.onclick = () => {
      state.selected = design.objects.find((o) => o.color === color).id;
      refresh();
    };
    const num = document.createElement("span");
    num.textContent = colors.indexOf(color) + 1;
    b.append(num);
    $("palette").append(b);
  }
  $("color-sequence").replaceChildren();
  seq.forEach((s) => {
    const el = document.createElement("span");
    el.className = "sequence-chip";
    const dot = document.createElement("i");
    dot.style.background = s.color;
    el.append(dot, document.createTextNode(`${s.stop} ${s.color}`));
    $("color-sequence").append(el);
  });
  $("warnings").replaceChildren();
  for (const text of [
    ...(design?.warnings || []),
    ...(state.result?.warnings || []),
    "เวลาเป็นค่าประมาณที่ 600 ฝีเข็ม/นาที ไม่รวมตั้งเครื่องหรือเปลี่ยนกระสวย",
  ]) {
    const p = document.createElement("p");
    p.textContent = text;
    $("warnings").append(p);
  }
  for (const b of document.querySelectorAll('[data-action^="export-"]'))
    b.disabled = !design || !owner();
  for (const b of document.querySelectorAll('[data-action="undo"]'))
    b.disabled = !owner() || !state.undo.length;
  for (const b of document.querySelectorAll('[data-action="redo"]'))
    b.disabled = !owner() || !state.redo.length;
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.tool === state.tool),
    );
  $("drawing-bar").hidden = ![
    "pen",
    "running",
    "satin",
    "tatami",
    "outline",
  ].includes(state.tool);
  $("drawing-label").textContent =
    `${state.tool === "tatami" ? "วาด polygon ≥ 3 จุด" : "วาดเส้น ≥ 2 จุด"} · ${state.points.length} จุด · Esc ยกเลิก / Enter จบ`;
  draw();
}
function fit() {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  let dw = state.design?.width_mm || Number($("width").value),
    dh = state.design?.height_mm || Number($("height").value);
  const boxes =
    state.design?.objects.filter((o) => o.visible !== false).map(bounds) || [];
  if (boxes.length) {
    const l = Math.min(-dw / 2, ...boxes.map((b) => b[0])),
      t = Math.min(-dh / 2, ...boxes.map((b) => b[1])),
      r = Math.max(dw / 2, ...boxes.map((b) => b[2])),
      b = Math.max(dh / 2, ...boxes.map((b) => b[3]));
    dw = r - l;
    dh = b - t;
    state.pan = [-(l + r) / 2, -(t + b) / 2];
  } else state.pan = [0, 0];
  state.scale = Math.max(
    0.5,
    Math.min((w - 90) / (dw + 8), (h - 65) / (dh + 8), 11),
  );
  state.zoom = (state.scale / 3.7795) * 100;
  draw();
}
function screenPoint([x, y]) {
  return [
    stage.clientWidth / 2 + (x + state.pan[0]) * state.scale,
    stage.clientHeight / 2 + (y + state.pan[1]) * state.scale,
  ];
}
function worldPoint(event) {
  const r = canvas.getBoundingClientRect();
  return [
    (event.clientX - r.left - r.width / 2) / state.scale - state.pan[0],
    (event.clientY - r.top - r.height / 2) / state.scale - state.pan[1],
  ];
}
function draw() {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#edf0e9";
  ctx.fillRect(0, 0, w, h);
  const s = state.scale,
    origin = screenPoint([0, 0]),
    dw = state.design?.width_mm || Number($("width").value) || 50,
    dh = state.design?.height_mm || Number($("height").value) || 50;
  ctx.save();
  ctx.beginPath();
  ctx.rect(25, 25, w - 25, h - 25);
  ctx.clip();
  if (state.grid) {
    const minor = s >= 3 ? 1 : 5,
      startX = Math.floor((25 - origin[0]) / s / minor) * minor,
      endX = (w - origin[0]) / s,
      startY = Math.floor((25 - origin[1]) / s / minor) * minor,
      endY = (h - origin[1]) / s;
    for (let x = startX; x <= endX; x += minor) {
      ctx.strokeStyle = x % 5 === 0 ? "#d5ddd0" : "#e1e6dc";
      ctx.lineWidth = 0.65;
      const px = origin[0] + x * s;
      ctx.beginPath();
      ctx.moveTo(px, 25);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += minor) {
      ctx.strokeStyle = y % 5 === 0 ? "#d5ddd0" : "#e1e6dc";
      ctx.beginPath();
      ctx.moveTo(25, origin[1] + y * s);
      ctx.lineTo(w, origin[1] + y * s);
      ctx.stroke();
    }
  }
  ctx.shadowColor = "#253c2b1c";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#fffefa";
  ctx.fillRect(
    origin[0] - (dw / 2 + 4) * s,
    origin[1] - (dh / 2 + 4) * s,
    (dw + 8) * s,
    (dh + 8) * s,
  );
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#d5c9ad";
  ctx.lineWidth = 0.7;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(
    origin[0] - (dw / 2) * s,
    origin[1] - (dh / 2) * s,
    dw * s,
    dh * s,
  );
  ctx.setLineDash([]);
  ctx.strokeStyle = "#f1f0e9";
  ctx.lineWidth = 0.4;
  const pw = (dw + 8) * s,
    ph = (dh + 8) * s,
    px = origin[0] - pw / 2,
    py = origin[1] - ph / 2;
  for (let x = 0; x < pw; x += 4) {
    ctx.beginPath();
    ctx.moveTo(px + x, py);
    ctx.lineTo(px + x, py + ph);
    ctx.stroke();
  }
  for (let y = 0; y < ph; y += 4) {
    ctx.beginPath();
    ctx.moveTo(px, py + y);
    ctx.lineTo(px + pw, py + y);
    ctx.stroke();
  }
  if (state.image && (state.sourceView || state.showSource)) {
    ctx.globalAlpha = state.sourceView ? 1 : 0.25;
    ctx.drawImage(
      state.image,
      origin[0] - (dw / 2) * s,
      origin[1] - (dh / 2) * s,
      dw * s,
      dh * s,
    );
    ctx.globalAlpha = 1;
  }
  if (!state.sourceView) {
    if (state.result?.commands) {
      const commands = state.result.commands,
        limit = Math.floor(commands.length * state.position),
        seq = state.result.thread_sequence;
      let previous = screenPoint([0, 0]);
      ctx.lineCap = "round";
      for (let i = 0; i < limit; i++) {
        const [x, y, command, color] = commands[i],
          p = screenPoint([x, y]);
        if (command === COMMAND.STITCH) {
          ctx.strokeStyle = seq[color]?.color || "#15564d";
          ctx.lineWidth = Math.max(0.6, Math.min(s * 0.17, 2));
          ctx.beginPath();
          ctx.moveTo(...previous);
          ctx.lineTo(...p);
          ctx.stroke();
          if (s > 7) {
            ctx.fillStyle = "#00000030";
            ctx.beginPath();
            ctx.arc(...p, 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (command === COMMAND.JUMP && $("show-jumps").checked) {
          ctx.strokeStyle = "#c5675580";
          ctx.lineWidth = 0.7;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(...previous);
          ctx.lineTo(...p);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        previous = p;
      }
      $("simulation-count").textContent =
        `${Math.floor(state.result.metrics.stitch_count * state.position).toLocaleString()} / ${state.result.metrics.stitch_count.toLocaleString()}`;
    } else if (state.design) {
      for (const obj of state.design.objects) {
        if (obj.visible === false) continue;
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = Math.max(0.6, s * 0.15);
        for (const path of obj.paths) {
          ctx.globalAlpha = path.kind === "underlay" ? 0.35 : 1;
          ctx.beginPath();
          path.points.forEach(([x, y], i) => {
            const p = screenPoint([
              x + (obj.offset?.[0] || 0),
              y + (obj.offset?.[1] || 0),
            ]);
            i ? ctx.lineTo(...p) : ctx.moveTo(...p);
          });
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    const obj = selected();
    if (obj && owner()) {
      const box = bounds(obj),
        a = screenPoint([box[0], box[1]]),
        b = screenPoint([box[2], box[3]]);
      ctx.strokeStyle = "#509885";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(a[0] - 5, a[1] - 5, b[0] - a[0] + 10, b[1] - a[1] + 10);
      ctx.setLineDash([]);
      for (const [x, y] of [
        [a[0] - 5, a[1] - 5],
        [b[0] + 5, a[1] - 5],
        [a[0] - 5, b[1] + 5],
        [b[0] + 5, b[1] + 5],
      ]) {
        ctx.fillStyle = "#fffefa";
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
        ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
      }
      if (state.tool === "reshape" && obj.control_points) {
        for (const [x, y] of obj.control_points) {
          const p = screenPoint([
            x + (obj.offset?.[0] || 0),
            y + (obj.offset?.[1] || 0),
          ]);
          ctx.fillStyle = "#e9a64a";
          ctx.fillRect(p[0] - 4, p[1] - 4, 8, 8);
        }
      }
    }
  }
  if (state.points.length) {
    ctx.strokeStyle = "#bd7e37";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    state.points.forEach((p, i) => {
      const q = screenPoint(p);
      i ? ctx.lineTo(...q) : ctx.moveTo(...q);
    });
    ctx.stroke();
    for (const p of state.points) {
      const q = screenPoint(p);
      ctx.fillStyle = "#bd7e37";
      ctx.beginPath();
      ctx.arc(...q, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = "#e6ebe1";
  ctx.fillRect(0, 0, w, 25);
  ctx.fillRect(0, 0, 25, h);
  ctx.strokeStyle = "#bac7b5";
  ctx.fillStyle = "#7e8e78";
  ctx.font = "8px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 0.6;
  const inc = s > 3 ? 5 : 10;
  for (
    let x = Math.ceil((25 - origin[0]) / s / inc) * inc;
    x < (w - origin[0]) / s;
    x += inc
  ) {
    const a = origin[0] + x * s;
    ctx.beginPath();
    ctx.moveTo(a, 19);
    ctx.lineTo(a, 25);
    ctx.stroke();
    ctx.fillText(String(x), a, 13);
  }
  for (
    let y = Math.ceil((25 - origin[1]) / s / inc) * inc;
    y < (h - origin[1]) / s;
    y += inc
  ) {
    const a = origin[1] + y * s;
    ctx.beginPath();
    ctx.moveTo(19, a);
    ctx.lineTo(25, a);
    ctx.stroke();
    ctx.save();
    ctx.translate(12, a);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(String(y), 0, 0);
    ctx.restore();
  }
  const zoom = `${Math.round(state.zoom)}%`;
  $("zoom-label").textContent = zoom;
  $("status-zoom").textContent = zoom;
}
function zoom(factor) {
  state.scale = Math.max(0.4, Math.min(state.scale * factor, 30));
  state.zoom = (state.scale / 3.7795) * 100;
  draw();
}
function stop() {
  state.playing = false;
  cancelAnimationFrame(playFrame);
  $("play").textContent = "▶ จำลอง";
}
function play() {
  if (!state.result || state.dirty)
    throw new Error("ต้องสร้างหรือเข้ารหัสฝีเข็มให้ผ่านก่อนจำลอง");
  if (state.playing) {
    stop();
    return;
  }
  state.sourceView = false;
  state.playing = true;
  if (state.position >= 1) state.position = 0;
  lastTime = 0;
  $("play").textContent = "Ⅱ หยุด";
  function step(t) {
    if (!state.playing) return;
    if (lastTime)
      state.position = Math.min(
        1,
        state.position +
          (((t - lastTime) / 1000) * Number($("speed").value)) /
            state.result.commands.length,
      );
    lastTime = t;
    $("simulation").value = state.position * 100;
    draw();
    if (state.position >= 1) stop();
    else playFrame = requestAnimationFrame(step);
  }
  playFrame = requestAnimationFrame(step);
}
function changeTool(id) {
  requireOwner();
  if (id === "text") {
    modal(
      "Text · Not Available",
      "ยังไม่มีระบบสร้างฝีเข็มตัวอักษรไทย ใช้ภาพ PNG ของตัวอักษรแล้วตรวจด้วยคน ฟอนต์ที่ติดตั้งในเครื่องไม่ได้แปลว่าเป็นฟอนต์ปัก",
    );
    return;
  }
  state.tool = id;
  state.points = [];
  canvas.style.cursor =
    id === "pan" ? "grab" : id === "select" ? "default" : "crosshair";
  refresh();
  if (id === "reshape" && !selected()?.control_points)
    message("Reshape ใช้กับจุดควบคุมเส้นที่วาดเอง เลือกวัตถุวาดเองก่อน", true);
  $("toolbox").classList.remove("open");
  $("toggle-tools").setAttribute("aria-expanded", "false");
}
async function finishPath() {
  requireOwner();
  if (state.points.length < (state.tool === "tatami" ? 3 : 2))
    throw new Error("จำนวนจุดไม่พอสำหรับเครื่องมือนี้");
  const kind =
      state.tool === "satin"
        ? "satin"
        : state.tool === "tatami"
          ? "tatami"
          : "running",
    pts = copy(state.points);
  if (state.tool === "outline") pts.push(pts[0]);
  const rev = state.revision;
  message("กำลังสร้างแนวฝีเข็มที่วาด…");
  const result = await api({
    action: "vector",
    type: kind,
    points: pts,
    settings: settings(),
    satin_width: Number($("satin-width").value),
    color: selected()?.color || "#18685e",
  });
  if (rev !== state.revision) return;
  if (state.design) checkpoint();
  if (!state.design) {
    const opt = settings();
    state.design = {
      version: 1,
      name: "แบบวาดเอง",
      width_mm: opt.width_mm,
      height_mm: Number($("height").value),
      settings: opt,
      objects: [],
      warnings: ["ลายวาดเอง · Experimental · ยังไม่ทดสอบปักจริง"],
    };
  }
  result.object.id = `manual-${crypto.randomUUID()}`;
  state.design.objects.push(result.object);
  state.selected = result.object.id;
  state.points = [];
  state.tool = "select";
  edited();
}
let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  if (state.busy) return;
  const p = worldPoint(e);
  if (
    ["pen", "running", "satin", "tatami", "outline"].includes(state.tool) &&
    owner()
  ) {
    if (Math.abs(p[0]) > 60 || Math.abs(p[1]) > 60) {
      message("วาดได้ในพิกัด ±60 มม. กรุณาซูมหรือเลื่อนจอ", true);
      return;
    }
    if (state.points.length >= 200) {
      message("สูงสุด 200 จุดต่อเส้น", true);
      return;
    }
    state.points.push(p.map((n) => Math.round(n * 1000) / 1000));
    refresh();
    return;
  }
  if (state.tool === "zoom") {
    zoom(1.25);
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  if (state.tool === "pan" || !owner()) {
    drag = {
      kind: "pan",
      start: p,
      pan: [...state.pan],
      screen: [e.clientX, e.clientY],
    };
    return;
  }
  if (!state.design) return;
  if (state.tool === "reshape" && selected()?.control_points) {
    const obj = selected();
    const i = obj.control_points.findIndex(
      ([x, y]) =>
        Math.hypot(
          x + (obj.offset?.[0] || 0) - p[0],
          y + (obj.offset?.[1] || 0) - p[1],
        ) <
        8 / state.scale,
    );
    if (i >= 0) {
      checkpoint();
      drag = {
        kind: "reshape",
        obj,
        index: i,
        original: copy(obj.control_points),
      };
      return;
    }
  }
  const obj = [...state.design.objects].reverse().find((o) => {
    const b = bounds(o),
      m = 3 / state.scale;
    return (
      o.visible !== false &&
      p[0] >= b[0] - m &&
      p[0] <= b[2] + m &&
      p[1] >= b[1] - m &&
      p[1] <= b[3] + m
    );
  });
  if (obj) {
    state.selected = obj.id;
    checkpoint();
    drag = { kind: "move", obj, start: p, offset: [...(obj.offset || [0, 0])] };
    refresh();
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = worldPoint(e);
  if (drag.kind === "pan") {
    state.pan = [
      drag.pan[0] + (e.clientX - drag.screen[0]) / state.scale,
      drag.pan[1] + (e.clientY - drag.screen[1]) / state.scale,
    ];
    draw();
  } else if (drag.kind === "move") {
    drag.obj.offset = [
      drag.offset[0] + p[0] - drag.start[0],
      drag.offset[1] + p[1] - drag.start[1],
    ].map((n) => Math.max(-120, Math.min(120, Math.round(n * 10) / 10)));
    state.result = null;
    state.dirty = true;
    draw();
  } else {
    drag.obj.control_points[drag.index] = [
      p[0] - (drag.obj.offset?.[0] || 0),
      p[1] - (drag.obj.offset?.[1] || 0),
    ].map((n) => Math.max(-60, Math.min(60, n)));
    draw();
  }
});
async function endDrag() {
  if (!drag) return;
  const done = drag;
  drag = null;
  if (done.kind === "move") {
    edited();
  }
  if (done.kind === "reshape") {
    try {
      state.serial++;
      state.result = null;
      state.dirty = true;
      message("กำลังปรับจุดควบคุม…");
      const obj = done.obj,
        result = await api({
          action: "vector",
          type: obj.type,
          points: obj.control_points,
          settings: state.design.settings,
          satin_width: Number($("satin-width").value),
          color: obj.color,
        });
      if (!state.design.objects.includes(obj)) return;
      obj.paths = result.object.paths;
      edited();
    } catch (e) {
      done.obj.control_points = done.original;
      message(e.message, true);
      draw();
    }
  }
}
canvas.addEventListener("pointerup", () => endDrag());
canvas.addEventListener("pointercancel", () => endDrag());
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.08 : 1 / 1.08);
  },
  { passive: false },
);
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function jsonDownload(data, name) {
  download(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    name,
  );
}
function record(type = "design") {
  if (!state.design) throw new Error("สร้างแบบก่อนบันทึก");
  return {
    version: 1,
    id: state.jobId || crypto.randomUUID(),
    updated: Date.now(),
    type,
    status: type === "request" ? "draft" : "working",
    name: state.filename,
    customer: $("customer-name").value,
    note: $("customer-note").value,
    design: copy(state.design),
    source: state.source,
  };
}
async function save(type = "design") {
  const job = record(type);
  await saveJob(job);
  state.jobId = job.id;
  message(
    type === "request"
      ? "บันทึกคำขอในเครื่องแล้ว ยังไม่ส่งถึงร้าน"
      : "บันทึกแบบในเครื่องแล้ว",
    true,
  );
  if (type === "request") jsonDownload(job, `${state.filename}.request.json`);
}
async function openRecord(data) {
  state.serial++;
  state.revision++;
  const parsed =
    typeof data === "string"
      ? parseRecord(data)
      : parseRecord(JSON.stringify(data));
  state.design = parsed.design;
  state.source = parsed.source;
  state.image = parsed.source ? await loadRaster(parsed.source) : null;
  state.filename = state.design.name || "imported-design";
  state.result = null;
  state.dirty = true;
  state.selected = state.design.objects[0].id;
  state.undo = [];
  state.redo = [];
  state.points = [];
  state.jobId = typeof data === "object" ? data.id : null;
  $("customer-name").value = parsed.customer;
  $("customer-note").value = parsed.note;
  applySettings(state.design);
  dimensions();
  fit();
  refresh();
  await compile();
}
async function history() {
  const list = await allJobs(),
    root = document.createElement("div");
  const intro = document.createElement("p");
  intro.textContent =
    "เก็บเฉพาะเบราว์เซอร์นี้ ไม่ซิงค์กับร้านหรือเครื่องอื่น ดาวน์โหลดไฟล์เพื่อส่งต่อ / สำรองข้อมูล สถานะไม่ใช่การยืนยันปักจริง";
  root.append(intro);
  if (!list.length) {
    const p = document.createElement("p");
    p.textContent = "ยังไม่มีประวัติงาน";
    root.append(p);
  }
  for (const job of list) {
    const card = document.createElement("div");
    card.className = "history-card";
    const p = document.createElement("p");
    p.textContent = `${job.name} · ${job.customer || "งานเจ้าของร้าน"} · ${job.status} · ${new Date(job.updated).toLocaleString("th-TH")}`;
    card.append(p);
    const add = (text, fn) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = () =>
        Promise.resolve()
          .then(fn)
          .catch((e) => message(e.message, true));
      card.append(b);
    };
    add("เปิดแบบ", async () => {
      $("modal").close();
      await openRecord(job);
    });
    add("ดาวน์โหลดคำขอ/แบบ", () =>
      jsonDownload(job, `${job.name}.woramet.json`),
    );
    if (owner() && job.type === "request") {
      const select = document.createElement("select");
      for (const value of ["draft", "in_review", "ready_for_review"]) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = {
          draft: "ร่างคำขอ",
          in_review: "กำลังตรวจ",
          ready_for_review: "พร้อมให้ลูกค้าตรวจ",
        }[value];
        opt.selected = value === job.status;
        select.append(opt);
      }
      select.onchange = async () => {
        try {
          await saveJob({ ...job, status: select.value, updated: Date.now() });
          message(
            "เปลี่ยนสถานะในเครื่องแล้ว ดาวน์โหลดเพื่อส่งสถานะให้ลูกค้า",
            true,
          );
        } catch (e) {
          message(e.message, true);
        }
      };
      card.append(select);
    }
    add("ลบจากเครื่อง", async () => {
      await deleteJob(job.id);
      card.remove();
    });
    root.append(card);
  }
  modal("ประวัติงาน · Local only", root);
}
async function exportMachine(format) {
  requireOwner();
  if (!state.design) throw new Error("ยังไม่มีแบบ");
  const serial = state.serial;
  const result = await api({
    action: "export",
    design: copy(state.design),
    format,
  });
  if (serial !== state.serial)
    throw new Error("แบบเปลี่ยนระหว่างส่งออก กรุณาส่งออกใหม่");
  const bytes = Uint8Array.from(atob(result.file_base64), (c) =>
    c.charCodeAt(0),
  );
  download(
    new Blob([bytes], { type: "application/octet-stream" }),
    `${state.filename}.${format}`,
  );
  jsonDownload(
    {
      format,
      experimental: true,
      machine_tested: false,
      sequence: result.thread_sequence,
      metrics: result.metrics,
    },
    `${state.filename}.thread-sequence.json`,
  );
  if (format === "dst") {
    state.result = result;
    state.dirty = false;
    refresh();
  }
  message(
    `ดาวน์โหลด ${format.toUpperCase()} จริงแล้ว · ต้องทดลองปักและตรวจลำดับด้ายก่อนผลิต`,
    true,
  );
}
function undo(redo = false) {
  requireOwner();
  const from = redo ? state.redo : state.undo,
    to = redo ? state.undo : state.redo;
  if (!from.length) return;
  to.push(copy(state.design));
  state.design = from.pop();
  state.selected = state.design.objects[0]?.id;
  applySettings(state.design);
  edited();
}
async function action(name) {
  switch (name) {
    case "new":
      requireOwner();
      state.serial++;
      state.revision++;
      stop();
      Object.assign(state, {
        design: null,
        result: null,
        source: null,
        image: null,
        selected: null,
        jobId: null,
        filename: "untitled",
        points: [],
        undo: [],
        redo: [],
        tool: "select",
        dirty: false,
        sourceView: false,
        showSource: false,
      });
      dimensions();
      fit();
      refresh();
      message(
        "แบบว่างพร้อมแล้ว เลือก Running, Satin หรือ Tatami เพื่อเริ่มวาด",
      );
      break;
    case "upload":
      $("upload").click();
      break;
    case "import":
      $("project-file").click();
      break;
    case "digitize":
      await digitize();
      break;
    case "sample":
      await sample();
      break;
    case "save":
      await save();
      break;
    case "customer-request":
      await save("request");
      break;
    case "history":
      await history();
      break;
    case "project":
      jsonDownload(record(), `${state.filename}.woramet.json`);
      break;
    case "undo":
      undo();
      break;
    case "redo":
      undo(true);
      break;
    case "delete":
      requireOwner();
      if (selected()) {
        if (state.design.objects.length === 1)
          throw new Error(
            "ต้องเหลืออย่างน้อย 1 วัตถุ ใช้การอัปโหลดเพื่อเริ่มแบบใหม่",
          );
        checkpoint();
        state.design.objects = state.design.objects.filter(
          (o) => o.id !== state.selected,
        );
        state.selected = state.design.objects[0].id;
        edited();
      }
      break;
    case "move-up":
    case "move-down":
      requireOwner();
      checkpoint();
      moveObject(state.design, state.selected, name === "move-up" ? -1 : 1);
      edited();
      break;
    case "fit":
      fit();
      break;
    case "zoom-in":
      zoom(1.25);
      break;
    case "zoom-out":
      zoom(0.8);
      break;
    case "actual":
      modal(
        "ขนาดจริง* ต้องสอบเทียบจอ",
        "หน่วยมิลลิเมตรของแบบและ DST เป็นหน่วยจริง แต่ CSS pixels ไม่รับประกันขนาดบนจอ ใช้ไม้บรรทัดวัดช่วง 0–50 mm แล้วปรับ Zoom จนตรง บน iPhone ควรตรวจบนคอมพิวเตอร์ด้วย",
      );
      state.scale = 3.7795;
      state.zoom = 100;
      draw();
      break;
    case "grid":
      state.grid = !state.grid;
      draw();
      break;
    case "source":
      state.showSource = !state.showSource;
      state.sourceView = false;
      draw();
      break;
    case "play":
      play();
      break;
    case "finish-path":
      await finishPath();
      break;
    case "cancel-path":
      state.points = [];
      state.tool = "select";
      refresh();
      break;
    case "threads":
      if (!state.design) throw new Error("ยังไม่มีแบบ");
      jsonDownload(
        {
          format: "DST",
          note: "ตั้งสีด้วยตนเองบนเครื่อง DST ไม่รับประกันสีด้าย",
          sequence: sequence(state.design),
        },
        `${state.filename}.thread-sequence.json`,
      );
      break;
    case "export-dst":
    case "export-pes":
    case "export-jef":
      await exportMachine(name.split("-")[1]);
      break;
    case "export-svg":
      requireOwner();
      download(
        new Blob([designSVG(state.design)], { type: "image/svg+xml" }),
        `${state.filename}.stitches.svg`,
      );
      break;
    case "export-png": {
      requireOwner();
      const svg = designSVG(state.design),
        blob = new Blob([svg], { type: "image/svg+xml" }),
        url = URL.createObjectURL(blob);
      try {
        const image = await loadRaster(url),
          off = document.createElement("canvas");
        off.width = Math.ceil(image.naturalWidth * 4);
        off.height = Math.ceil(image.naturalHeight * 4);
        const c = off.getContext("2d");
        c.fillStyle = "white";
        c.fillRect(0, 0, off.width, off.height);
        c.drawImage(image, 0, 0, off.width, off.height);
        await new Promise((resolve) =>
          off.toBlob((b) => {
            download(b, `${state.filename}.preview.png`);
            resolve();
          }),
        );
      } finally {
        URL.revokeObjectURL(url);
      }
      break;
    }
    case "inspect":
      if (state.dirty || !state.result) await compile();
      modal(
        "ตรวจฝีเข็มจาก DST",
        JSON.stringify(state.result.metrics, null, 2) +
          "\nExperimental; Trim control ไม่พร้อม; Jump ต่อเนื่องอาจทำให้บางเครื่องตัดด้าย; ยังไม่ทดสอบกับเครื่องจริง",
      );
      break;
    case "machine":
      modal(
        "Tajima หัวเดียว · DST",
        "ใช้หน่วย 0.1 มม. จำกัดขนาดภาพ 120 × 120 มม. และ 50,000 ฝีเข็ม ไม่สั่ง Trim โดยตรงใน DST รุ่นนี้ แต่ Jump ต่อเนื่องอาจถูกเครื่องตีความเป็นการตัดด้าย ต้องตรวจ hoop, จุดเริ่ม, สีด้าย, Jump, ความตึง, รองปักและความหนาแน่นบนเครื่องจริง PES/JEF เป็น Experimental และ EMB เป็น Not Available",
      );
      break;
    case "help":
      modal(
        "คู่มือ WORAMET",
        "1. อัปโหลด PNG/JPG แล้วตั้งความกว้าง สี ผ้า และฝีเข็ม\n2. กด Auto Digitize เพื่อแทนที่แบบด้วยผลจากภาพ\n3. ใช้ Select ลากวัตถุ ปรับสีและลำดับ ↑/↓ ในแผงตั้งค่า\n4. วาด Running / Satin จากแนวกลาง / Tatami จาก polygon แล้วกดจบเส้น\n5. Reshape ใช้กับจุดวาดเองเท่านั้น\n6. กดจำลอง และเปิด Jump เพื่อตรวจคำสั่งที่อ่านกลับจาก DST\n7. ส่งออก DST พร้อมลำดับสี จากนั้นตรวจในโปรแกรมภายนอกและทดลองปักบนผ้า\n8. ประวัติและคำขอเก็บในเบราว์เซอร์ ดาวน์โหลด JSON เพื่อสำรองหรือส่งให้ร้าน\nExperimental ทุกชนิดฝีเข็ม ไม่มีบัญชี ไม่มีชำระเงิน ไม่มีการยืนยันคุณภาพบนเครื่องจริง",
      );
      break;
    case "close-modal":
      $("modal").close();
      break;
  }
}
document.addEventListener("click", (e) => {
  const tool = e.target.closest("[data-tool]"),
    button = e.target.closest("[data-action]");
  if (tool) {
    try {
      changeTool(tool.dataset.tool);
    } catch (err) {
      message(err.message, true);
    }
    return;
  }
  if (button) {
    document
      .querySelectorAll(".menus details")
      .forEach((d) => (d.open = false));
    Promise.resolve()
      .then(() => action(button.dataset.action))
      .catch((err) => message(err.message, true));
  } else if (!e.target.closest(".menus"))
    document
      .querySelectorAll(".menus details")
      .forEach((d) => (d.open = false));
});
$("digitize").onclick = () => digitize().catch((e) => message(e.message, true));
$("upload").onchange = () =>
  upload($("upload").files[0]).catch((e) => message(e.message, true));
$("width").oninput = () => {
  dimensions();
  draw();
};
for (const id of [
  "width",
  "colors",
  "fabric",
  "stitch-type",
  "length",
  "density",
  "angle",
  "pull",
  "underlay",
  "remove-white",
])
  $(id).addEventListener("change", () => {
    $("settings-note").textContent =
      "มีค่าที่เปลี่ยน: กด Auto Digitize เพื่อสร้างจากภาพใหม่ ค่านี้ยังไม่เปลี่ยนฝีเข็มเดิม";
  });
$("project-file").onchange = async () => {
  try {
    const f = $("project-file").files[0];
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) throw new Error("ไฟล์แบบต้องไม่เกิน 8 MB");
    await openRecord(await f.text());
    message("นำเข้าแบบแล้ว ตรวจสถานะและลำดับสี", true);
  } catch (e) {
    message(e.message, true);
  }
};
const MAX_IMPORT_BYTES = 8000000;
$("object-select").onchange = () => {
  state.selected = $("object-select").value;
  refresh();
};
for (const id of [
  "object-name",
  "object-color",
  "object-x",
  "object-y",
  "object-visible",
])
  $(id).onchange = () => {
    try {
      requireOwner();
      const obj = selected();
      if (!obj) return;
      if (!$(id).reportValidity()) return;
      checkpoint();
      obj.name = $("object-name").value;
      obj.color = $("object-color").value;
      obj.offset = [Number($("object-x").value), Number($("object-y").value)];
      obj.visible = $("object-visible").checked;
      edited();
    } catch (e) {
      message(e.message, true);
    }
  };
$("view-stitch").onclick = () => {
  state.sourceView = false;
  refresh();
};
$("view-source").onclick = () => {
  if (!state.image) {
    message("แบบนี้ไม่มีภาพต้นฉบับ", true);
    return;
  }
  state.sourceView = true;
  refresh();
};
$("show-jumps").onchange = draw;
$("simulation").oninput = () => {
  stop();
  state.position = Number($("simulation").value) / 100;
  state.sourceView = false;
  draw();
};
for (const [button, panel] of [
  ["toggle-tools", "toolbox"],
  ["toggle-properties", "properties"],
])
  $(button).onclick = () => {
    const open = $(panel).classList.toggle("open");
    $(button).setAttribute("aria-expanded", String(open));
  };
$("mode").onchange = () => {
  document.body.classList.toggle("customer-mode", !owner());
  state.tool = "select";
  state.points = [];
  refresh();
  message("โหมดสาธิตเท่านั้น ยังไม่มีบัญชีผู้ใช้หรือการรับชำระเงิน", true);
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    state.points = [];
    draw();
  }
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === "Enter" && state.points.length) {
    e.preventDefault();
    finishPath().catch((err) => message(err.message, true));
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    try {
      undo(e.shiftKey);
    } catch (err) {
      message(err.message, true);
    }
  }
});
new ResizeObserver(() => draw()).observe(stage);
async function health() {
  try {
    const response = await fetch(
      new URL("../../api/embroidery", import.meta.url),
      { signal: AbortSignal.timeout(6000) },
    );
    const data = await response.json();
    state.api = response.ok && data.service === "WORAMET Embroidery";
  } catch {
    state.api = false;
  }
  $("api-status").textContent = state.api
    ? "● Engine พร้อม · Experimental"
    : "○ API ไม่พร้อม · ดูตัวอย่างได้";
  $("api-status").classList.toggle("ready", state.api);
  if (!state.api)
    message(
      "API ยังไม่พร้อม · ดูแบบตัวอย่างได้ เปิด Local server ตามคู่มือเพื่อสร้างลายใหม่",
      true,
    );
}
await sample().catch((e) => message(e.message, true));
health();
