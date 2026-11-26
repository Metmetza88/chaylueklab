"""Bounded, deterministic raster/vector stitch planning. All units here are mm.
Experimental only. Machine units are introduced at the pyembroidery boundary.
"""
from __future__ import annotations

import base64
import math
import re
import warnings
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from pyembroidery import (EmbPattern, STITCH, JUMP, TRIM, COLOR_CHANGE, END,
                          COMMAND_MASK, read_dst, write_dst, write_pes, write_jef)

MAX_IMAGE_BYTES = 2_500_000
MAX_REQUEST_BYTES = 3_600_000
MAX_STITCHES = 50_000
MAX_OBJECTS = 100
Image.MAX_IMAGE_PIXELS = 12_000_000
FABRICS = {"woven": "ผ้าทอ / เสื้อนักเรียน", "knit": "ผ้ายืด", "cap": "หมวก"}
CAPABILITIES = {
    "running": "experimental", "tatami": "experimental", "satin_manual": "experimental",
    "satin_auto": "not_available", "underlay": "experimental",
    "pull_compensation": "experimental", "dst": "software_roundtrip_tested",
    "pes": "experimental", "jef": "experimental", "emb": "not_available",
    "machine_test": "not_tested", "auth": "not_available", "payments": "not_available",
}


def number(value, low, high, name):
    if isinstance(value, bool):
        raise ValueError(f"{name}: ต้องเป็นตัวเลข")
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name}: ต้องเป็นตัวเลข") from None
    if not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{name}: ต้องอยู่ในช่วง {low}–{high}")
    return value


def integer(value, low, high, name):
    result = number(value, low, high, name)
    if not result.is_integer():
        raise ValueError(f"{name}: ต้องเป็นจำนวนเต็ม")
    return int(result)


def options(payload):
    if not isinstance(payload, dict):
        raise ValueError("ข้อมูลต้องเป็น JSON object")
    mode = payload.get("stitch_type", "tatami")
    if mode not in ("running", "tatami"):
        raise ValueError("Auto Satin: Not Available — ใช้เครื่องมือ Satin แบบวาดแนวกลางแทน")
    fabric = payload.get("fabric", "woven")
    if fabric not in FABRICS:
        raise ValueError("ชนิดผ้าไม่ถูกต้อง")
    for key in ("underlay", "remove_white"):
        if key in payload and not isinstance(payload[key], bool):
            raise ValueError(f"{key}: ต้องเป็น boolean")
    return {
        "width_mm": number(payload.get("width_mm", 50), 10, 120, "ความกว้าง"),
        "colors": integer(payload.get("colors", 4), 1, 15, "จำนวนสี"),
        "stitch_type": mode,
        "stitch_length": number(payload.get("stitch_length", 2.8), .5, 8, "Stitch Length"),
        "density": number(payload.get("density", .45), .3, 1.2, "ระยะห่างแถว"),
        "angle": number(payload.get("angle", 30), -180, 180, "Stitch Angle"),
        "pull_compensation": number(payload.get("pull_compensation", .15), 0, .4, "Pull Compensation"),
        "underlay": payload.get("underlay", True),
        "remove_white": payload.get("remove_white", True), "fabric": fabric,
    }


def decode_image(encoded):
    if not isinstance(encoded, str) or len(encoded) > 4 * math.ceil(MAX_IMAGE_BYTES / 3):
        raise ValueError("ภาพต้องไม่เกิน 2.5 MB")
    try:
        data = base64.b64decode(encoded, validate=True)
        if not data or len(data) > MAX_IMAGE_BYTES:
            raise ValueError("ภาพต้องไม่เกิน 2.5 MB")
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as raw:
                if raw.format not in ("PNG", "JPEG"):
                    raise ValueError("รองรับเฉพาะ PNG/JPG")
                raw.load()
                return ImageOps.exif_transpose(raw).convert("RGBA")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError,
            Image.DecompressionBombWarning, base64.binascii.Error):
        raise ValueError("อ่านภาพไม่ได้ หรือภาพมีความละเอียดเกิน 12 ล้านพิกเซล") from None


def rounded(points):
    return [[round(float(x), 3), round(float(y), 3)] for x, y in points]


def outline_paths(mask, scale, kind="running"):
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    paths = []
    h, w = mask.shape
    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        if len(contour) < 2 or cv2.arcLength(contour, True) / scale < .6:
            continue
        contour = cv2.approxPolyDP(contour, .1 * scale, True)
        if len(contour) < 2:
            continue
        points = contour[:, 0, :].astype(float)
        points = np.vstack((points, points[0]))
        points[:, 0] = (points[:, 0] + .5 - w / 2) / scale
        points[:, 1] = (points[:, 1] + .5 - h / 2) / scale
        paths.append({"kind": kind, "points": rounded(points)})
    return paths


def fill_paths(mask, scale, spacing, stitch_length, angle, kind="tatami"):
    """Rotated clipped rows with quarter-length stagger; preserve holes.
    Connect rows only when the entire connector lies inside the region.
    """
    h, w = mask.shape
    center = ((w - 1) / 2, (h - 1) / 2)
    side = int(math.ceil(math.hypot(w, h))) + 4
    matrix = cv2.getRotationMatrix2D(center, angle, 1)
    matrix[:, 2] += [(side - w) / 2, (side - h) / 2]
    inverse = cv2.invertAffineTransform(matrix)
    rotated = cv2.warpAffine(mask, matrix, (side, side), flags=cv2.INTER_NEAREST)
    paths, current, previous = [], None, None
    step = max(1, round(spacing * scale))
    for row, y in enumerate(range(step // 2, side, step)):
        xs = np.flatnonzero(rotated[y])
        if not len(xs):
            current, previous = None, None
            continue
        starts = xs[np.r_[True, np.diff(xs) > 1]]
        ends = xs[np.r_[np.diff(xs) > 1, True]]
        runs = list(zip(starts, ends))
        if row % 2:
            runs.reverse()
        for left, right in runs:
            if right - left < 1:
                continue
            pitch = stitch_length * scale
            phase = (row % 4) * pitch / 4
            first = left + ((phase - left) % pitch)
            row_xs = [float(left)] + [float(v) for v in np.arange(first, right, pitch) if v - left >= .35 * scale and right - v >= .35 * scale] + [float(right)]
            if row % 2:
                row_xs.reverse()
            start = (row_xs[0], y)
            connect = False
            if previous is not None and math.dist(previous, start) <= pitch:
                n = max(2, math.ceil(math.dist(previous, start) * 2))
                line = np.linspace(previous, start, n).round().astype(int)
                connect = bool(np.all(rotated[line[:, 1], line[:, 0]]))
            pts = np.array([[x, y, 1] for x in row_xs]) @ inverse.T
            pts[:, 0] = (pts[:, 0] + .5 - w / 2) / scale
            pts[:, 1] = (pts[:, 1] + .5 - h / 2) / scale
            if connect and current is not None:
                current["points"].extend(rounded(pts))
            else:
                current = {"kind": kind, "points": rounded(pts)}
                paths.append(current)
            previous = (row_xs[-1], y)
    return paths


def digitize(payload):
    opt = options(payload)
    im = decode_image(payload.get("image_base64"))
    height_mm = opt["width_mm"] * im.height / im.width
    if not 1 <= height_mm <= 120:
        raise ValueError("ความสูงเมื่อรักษาสัดส่วนต้องอยู่ในช่วง 1–120 มม.")
    scale = 8  # 0.125 mm planning grid; independent of image pixel resolution.
    size = (round(opt["width_mm"] * scale), max(1, round(height_mm * scale)))
    rgba = im.resize(size, Image.Resampling.LANCZOS)
    alpha = np.array(rgba.getchannel("A")) > 127
    bg = Image.new("RGBA", size, "white")
    bg.alpha_composite(rgba)
    rgb = np.array(bg.convert("RGB"))
    foreground = alpha & ((np.min(rgb, axis=2) <= 245) if opt["remove_white"] else True)
    selected = rgb[foreground]
    if len(selected) < 3:
        raise ValueError("ไม่พบพื้นที่สำหรับปัก ลองปิดการตัดพื้นขาว")
    # Quantize only the foreground so '1 color' never loses the logo to white.
    training = Image.fromarray(selected.reshape((-1, 1, 3)))
    palette_image = training.quantize(colors=opt["colors"], method=Image.Quantize.MEDIANCUT, kmeans=3)
    labels = np.array(bg.convert("RGB").quantize(palette=palette_image, dither=Image.Dither.NONE))
    palette = palette_image.getpalette()
    objects, omitted = [], 0
    counts = [(int(np.count_nonzero((labels == idx) & foreground)), idx) for idx in np.unique(labels[foreground])]
    for _, idx in sorted(counts, reverse=True):
        color = "#%02x%02x%02x" % tuple(palette[int(idx) * 3:int(idx) * 3 + 3])
        mask = ((labels == idx) & foreground).astype("uint8") * 255
        count, components, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        for component in sorted(range(1, count), key=lambda n: int(stats[n, cv2.CC_STAT_AREA]), reverse=True):
            if stats[component, cv2.CC_STAT_AREA] < 8:
                omitted += 1
                continue
            region = (components == component).astype("uint8") * 255
            paths = []
            if opt["underlay"] and opt["stitch_type"] == "tatami":
                inset = cv2.erode(region, np.ones((7, 7), np.uint8))
                paths.extend(outline_paths(inset, scale, "underlay"))
                paths.extend(fill_paths(inset, scale, 2.0, opt["stitch_length"], opt["angle"] + 90, "underlay"))
            radius = round(opt["pull_compensation"] * scale)
            compensated = cv2.dilate(region, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))) if radius else region
            if opt["stitch_type"] == "running":
                paths.extend(outline_paths(compensated, scale))
            else:
                paths.extend(fill_paths(compensated, scale, opt["density"], opt["stitch_length"], opt["angle"]))
            if not paths:
                omitted += 1
                continue
            if len(objects) >= MAX_OBJECTS:
                raise ValueError("เกิน 100 วัตถุ กรุณาลดสีหรือใช้โลโก้ที่เรียบง่ายขึ้น")
            objects.append({"id": f"r{int(idx)}c{component}", "name": f"พื้นที่ {len(objects) + 1}", "color": color,
                            "type": opt["stitch_type"], "visible": True, "offset": [0, 0], "paths": paths})
    if not objects:
        raise ValueError("พื้นที่เล็กเกินไปสำหรับสร้างฝีเข็ม")
    notes = ["Experimental — ยังไม่ทดสอบกับเครื่อง Tajima จริง",
             "ตัวหนังสือไทยขนาดเล็กและขอบละเอียดต้องตรวจด้วยคน ไม่มี OCR หรือการสร้างตัวอักษรทดแทน",
             "DST ไม่เก็บสีด้ายจริง ให้ใช้ไฟล์ thread-sequence.json คู่กัน",
             "Tatami เป็น fill แบบ staggered พร้อม clipping แต่ยังไม่มีการปรับคุณภาพระดับงานผลิตอัตโนมัติ",
             f"ผ้า: {FABRICS[opt['fabric']]} — เป็นข้อมูลประกอบ ต้องเลือกเข็ม/รองปัก/ความตึงด้วยผู้เชี่ยวชาญ"]
    if omitted:
        notes.append(f"ตัดพื้นที่ขนาดเล็กที่ปักไม่ได้ {omitted} พื้นที่ โปรดตรวจตัวอักษรและขอบภาพ")
    if opt["fabric"] == "cap":
        notes.append("หมวก: ยังไม่มีการจัดลำดับจากกลางออกข้างหรือชดเชยตะเข็บหมวก")
    return {"version": 1, "name": "WORAMET design", "width_mm": opt["width_mm"], "height_mm": round(height_mm, 3),
            "settings": opt, "objects": objects, "warnings": notes}


def validate_design(design):
    if not isinstance(design, dict) or design.get("version") != 1:
        raise ValueError("เวอร์ชันแบบไม่ถูกต้อง")
    number(design.get("width_mm"), 1, 120, "ความกว้างแบบ")
    number(design.get("height_mm"), 1, 120, "ความสูงแบบ")
    settings = options(design.get("settings", {}))
    objects = design.get("objects")
    if not isinstance(objects, list) or not 1 <= len(objects) <= MAX_OBJECTS:
        raise ValueError("ต้องมี 1–100 วัตถุ")
    total = 0
    ids = set()
    for obj in objects:
        if not isinstance(obj, dict):
            raise ValueError("วัตถุไม่ถูกต้อง")
        oid = obj.get("id")
        if not isinstance(oid, str) or len(oid) > 80 or oid in ids:
            raise ValueError("รหัสวัตถุต้องไม่ซ้ำ")
        ids.add(oid)
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(obj.get("color"))):
            raise ValueError("สีด้ายไม่ถูกต้อง")
        if not isinstance(obj.get("visible", True), bool):
            raise ValueError("visible ต้องเป็น boolean")
        offset = obj.get("offset", [0, 0])
        if not isinstance(offset, list) or len(offset) != 2:
            raise ValueError("ตำแหน่งวัตถุไม่ถูกต้อง")
        ox, oy = [number(v, -120, 120, "ตำแหน่ง") for v in offset]
        paths = obj.get("paths")
        if not isinstance(paths, list) or not 1 <= len(paths) <= 6000:
            raise ValueError("จำนวนเส้นเกินขีดจำกัด")
        for path in paths:
            if path.get("kind") not in ("running", "tatami", "satin", "underlay"):
                raise ValueError("ประเภทเส้นไม่ถูกต้อง")
            pts = path.get("points")
            if not isinstance(pts, list) or len(pts) < 2:
                raise ValueError("เส้นต้องมีอย่างน้อยสองจุด")
            total += len(pts)
            if total > 100_000:
                raise ValueError("จำนวนจุดเกินขีดจำกัด")
            for pt in pts:
                if not isinstance(pt, list) or len(pt) != 2:
                    raise ValueError("พิกัดไม่ถูกต้อง")
                x, y = [number(v, -180, 180, "พิกัด") for v in pt]
                if abs(x + ox) > 150 or abs(y + oy) > 150:
                    raise ValueError("พิกัดออกนอกพื้นที่ 300 × 300 มม.")
    return settings


def make_pattern(design):
    settings = validate_design(design)
    pattern = EmbPattern()
    sequence, current_color, current = [], None, (0, 0)
    count = 0
    for obj in design["objects"]:
        if not obj.get("visible", True):
            continue
        color = obj["color"].lower()
        if current_color != color:
            if current_color is not None:
                pattern.add_stitch_absolute(COLOR_CHANGE, *current)
            pattern.add_thread({"color": color, "description": f"WORAMET {len(sequence) + 1}"})
            sequence.append({"stop": len(sequence) + 1, "color": color})
            current_color = color
        ox, oy = obj.get("offset", [0, 0])
        for path in obj["paths"]:
            points = [(round((x + ox) * 10), round((y + oy) * 10)) for x, y in path["points"]]
            if current != points[0]:
                pattern.add_stitch_absolute(JUMP, *points[0])
                current = points[0]
            # Penetrate the first point after needle-up travel. A zero displacement
            # stitch is intentional here, not a hidden long stitch or a tie-in.
            pattern.add_stitch_absolute(STITCH, *current)
            count += 1
            if count > MAX_STITCHES:
                raise ValueError("เกิน 50,000 ฝีเข็ม กรุณาลดขนาดหรือเพิ่มระยะห่างแถว")
            for target in points[1:]:
                distance = math.dist(current, target)
                if distance == 0:
                    continue
                n = math.ceil(distance / (settings["stitch_length"] * 10))
                start = current
                for i in range(1, n + 1):
                    nxt = (round(start[0] + (target[0] - start[0]) * i / n), round(start[1] + (target[1] - start[1]) * i / n))
                    if nxt == current:
                        continue
                    pattern.add_stitch_absolute(STITCH, *nxt)
                    current = nxt
                    count += 1
                    if count > MAX_STITCHES:
                        raise ValueError("เกิน 50,000 ฝีเข็ม กรุณาลดขนาดหรือเพิ่มระยะห่างแถว")
    if not count:
        raise ValueError("ไม่มีฝีเข็มที่เปิดใช้งาน")
    pattern.end()
    return pattern, sequence


def compile_design(design, fmt="dst"):
    if fmt not in ("dst", "pes", "jef"):
        raise ValueError("รูปแบบนี้ Not Available — ไม่รองรับ EMB")
    pattern, sequence = make_pattern(design)
    out = BytesIO()
    writer = {"dst": write_dst, "pes": write_pes, "jef": write_jef}[fmt]
    writer(pattern, out)
    # Always simulate the *encoded DST*, not an unrelated image approximation.
    dst = BytesIO()
    write_dst(pattern, dst)
    dst.seek(0)
    # The default reader infers TRIM from three consecutive JUMPs.
    # Simulate literal encoded moves, and report inference separately.
    decoded = read_dst(dst, settings={"trim_at": None, "clipping": False})
    inferred = read_dst(BytesIO(dst.getvalue()))
    inferred_trims = sum((s[2] & COMMAND_MASK) == TRIM for s in inferred.stitches)
    commands, previous, lengths, jumps = [], (0, 0), [], 0
    color_index = 0
    for x, y, command in decoded.stitches:
        command &= COMMAND_MASK
        if command == COLOR_CHANGE:
            color_index += 1
        if command == STITCH:
            lengths.append(math.dist(previous, (x, y)) / 10)
        elif command == JUMP:
            jumps += 1
        commands.append([x / 10, y / 10, command, color_index])
        previous = (x, y)
    coords = [(x, y) for x, y, cmd, _ in commands if cmd in (STITCH, JUMP)]
    xs, ys = zip(*coords)
    short = sum(0 < v < .4 for v in lengths)
    anchors = sum(v == 0 for v in lengths)
    metrics = {"stitch_count": len(lengths), "color_stops": len(sequence),
               "color_changes": len(sequence) - 1, "thread_colors": len({c['color'] for c in sequence}),
               "jump_count": jumps, "trim_count": None, "explicit_trim_count": 0,
               "inferred_trim_count": inferred_trims,
               "min_stitch_mm": round(min(lengths), 3), "max_stitch_mm": round(max(lengths), 3),
               "short_stitches": short, "anchor_stitches": anchors, "width_mm": round(max(xs) - min(xs), 1),
               "height_mm": round(max(ys) - min(ys), 1),
               "estimated_minutes": round(len(lengths) / 600 + jumps * .02 + (len(sequence) - 1) * .2, 1),
               "estimate_spm": 600, "bounds": [min(xs), min(ys), max(xs), max(ys)]}
    return {"file_base64": base64.b64encode(out.getvalue()).decode("ascii"), "format": fmt,
            "thread_sequence": sequence, "metrics": metrics, "commands": commands,
            "capabilities": CAPABILITIES,
            "warnings": ["Experimental — ยังไม่ผ่านการปักจริง", f"Trim control: Not Available — ไม่สั่ง TRIM โดยตรง แต่ Jump ต่อเนื่องอาจถูกตีความว่าตัดด้าย (pyembroidery ค่าเริ่มต้นอนุมาน {inferred_trims} ครั้ง); ต้องตรวจการตั้งค่าเครื่อง",
                         f"มีฝีเข็มสั้นกว่า 0.4 มม. {short} ฝีเข็ม, จุดลงเข็มเริ่มเส้น {anchors} จุด และ Jump {jumps} ครั้ง โปรดตรวจและปรับก่อนปัก",
                         "ยังไม่มี Tie-in/Tie-off อัตโนมัติ และไม่มีการปรับความตึงด้าย ต้องตรวจการยึดต้น/ปลายด้าย"]}


def vector_object(payload):
    """Manual polyline running, polygon fill or narrow centerline satin."""
    opt = options(payload.get("settings", {}))
    kind = payload.get("type", "running")
    if kind not in ("running", "tatami", "satin"):
        raise ValueError("เครื่องมือนี้ Not Available")
    pts = payload.get("points")
    if not isinstance(pts, list) or not 2 <= len(pts) <= 200:
        raise ValueError("ต้องวาด 2–200 จุด")
    points = []
    for pt in pts:
        if not isinstance(pt, list) or len(pt) != 2:
            raise ValueError("พิกัดไม่ถูกต้อง")
        points.append([number(v, -60, 60, "พิกัดวาด") for v in pt])
    if sum(math.dist(a, b) for a, b in zip(points, points[1:])) < .5:
        raise ValueError("เส้นสั้นเกินไป")
    if kind == "tatami":
        if len(points) < 3:
            raise ValueError("Tatami ต้องวาด polygon อย่างน้อย 3 จุด")
        low, high = np.min(points, axis=0), np.max(points, axis=0)
        width, height = high - low
        if width < .5 or height < .5:
            raise ValueError("พื้นที่เล็กเกินไป")
        center = (low + high) / 2
        size = np.ceil((high - low) * 8).astype(int) + 8
        mask = np.zeros((size[1], size[0]), dtype=np.uint8)
        polygon = np.round((np.array(points) - center) * 8 + (size - 1) / 2).astype(np.int32)
        cv2.fillPoly(mask, [polygon], 255)
        paths = []
        if opt["underlay"]:
            paths.extend(outline_paths(cv2.erode(mask, np.ones((7, 7), np.uint8)), 8, "underlay"))
        radius = round(opt["pull_compensation"] * 8)
        if radius:
            mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*radius+1, 2*radius+1)))
        paths.extend(fill_paths(mask, 8, opt["density"], opt["stitch_length"], opt["angle"]))
        for path in paths:
            path["points"] = rounded([[x + center[0], y + center[1]] for x, y in path["points"]])
    elif kind == "satin":
        width = number(payload.get("satin_width", 2), .5, min(6, opt["stitch_length"] * .9), "Satin Width")
        # Alternate two rails along user-defined centerline; no horizontal raster alias.
        zigzag, centerline = [], []
        for a, b in zip(points, points[1:]):
            distance = math.dist(a, b)
            if distance < .05:
                continue
            normal = np.array([-(b[1]-a[1]), b[0]-a[0]]) / distance
            steps = max(1, math.ceil(distance / opt["density"]))
            for i in range(steps):
                mid = np.array(a) + (np.array(b)-a) * i / steps
                centerline.append(mid.tolist())
                zigzag.append((mid + normal * width / 2 * (1 if len(zigzag) % 2 else -1)).tolist())
        if len(zigzag) < 2:
            raise ValueError("Satin สั้นเกินไป")
        paths = ([{"kind": "underlay", "points": rounded(centerline)}] if opt["underlay"] else [])
        paths.append({"kind": "satin", "points": rounded(zigzag)})
    else:
        paths = [{"kind": "running", "points": rounded(points)}]
    if not paths:
        raise ValueError("ไม่มีพื้นที่ปัก")
    color = payload.get("color", "#136f69")
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(color)):
        raise ValueError("สีไม่ถูกต้อง")
    return {"id": "manual", "name": f"{kind} วาดเอง", "type": kind, "color": color,
            "visible": True, "offset": [0, 0], "paths": paths, "control_points": points}


def handle_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("ข้อมูลต้องเป็น JSON object")
    action = payload.get("action", "digitize")
    if action == "digitize":
        design = digitize(payload)
        result = compile_design(design)
        result["design"] = design
        return result
    if action == "vector":
        return {"object": vector_object(payload)}
    if action == "export":
        return compile_design(payload.get("design"), payload.get("format", "dst"))
    raise ValueError("ไม่รู้จักคำสั่ง")
