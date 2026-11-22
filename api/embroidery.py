"""Experimental Tajima DST endpoint. Not production digitizing."""
from http.server import BaseHTTPRequestHandler
from io import BytesIO
import base64, json, math
from PIL import Image, ImageOps, UnidentifiedImageError
from pyembroidery import EmbPattern, STITCH, JUMP, COLOR_CHANGE, write_dst

MAX_BYTES = 4_000_000
Image.MAX_IMAGE_PIXELS = 12_000_000

def make_dst(payload):
    width_mm = float(payload["width_mm"])
    colors = int(payload["colors"])
    if not math.isfinite(width_mm) or not 10 <= width_mm <= 120 or not 2 <= colors <= 8:
        raise ValueError("Invalid width or colors")
    data = base64.b64decode(payload["image_base64"], validate=True)
    if len(data) > MAX_BYTES:
        raise ValueError("Image too large")
    with Image.open(BytesIO(data)) as raw:
        if raw.format not in ("PNG", "JPEG"):
            raise ValueError("Only PNG/JPEG supported")
        raw.load()
        im = ImageOps.exif_transpose(raw).convert("RGBA")
    bg = Image.new("RGBA", im.size, "white")
    bg.alpha_composite(im)
    im = bg.convert("RGB")
    width_px = round(width_mm * 2)
    height_px = max(1, round(width_px * im.height / im.width))
    if height_px > 240:
        raise ValueError("Image aspect ratio too tall")
    im = im.resize((width_px, height_px), Image.Resampling.LANCZOS).quantize(colors=colors)
    px = im.load()
    pal = im.getpalette()
    order = sorted(im.getcolors() or [], reverse=True)
    pattern = EmbPattern()
    unit = width_mm * 10 / width_px
    count = 0
    stops = []
    for _, idx in order:
        rgb = pal[idx * 3:idx * 3 + 3]
        if min(rgb) > 245:
            continue
        runs = []
        for y in range(0, height_px, 2):
            x = 0
            while x < width_px:
                if px[x, y] != idx:
                    x += 1
                    continue
                start = x
                while x < width_px and px[x, y] == idx:
                    x += 1
                if x - start >= 3:
                    runs.append((y, start, x - 1))
        if not runs:
            continue
        pattern.add_thread({"color": "#%02x%02x%02x" % tuple(rgb)})
        stops.append("#%02x%02x%02x" % tuple(rgb))
        for y, left, right in runs:
            if count > 6000:
                raise ValueError("Image too complex for prototype")
            x1, x2 = (left, right) if (y // 2) % 2 == 0 else (right, left)
            yy = round((y - height_px / 2) * unit)
            pattern.add_stitch_absolute(JUMP, round((x1 - width_px / 2) * unit), yy)
            pattern.add_stitch_absolute(STITCH, round((x2 - width_px / 2) * unit), yy)
            count += 1
        pattern.add_stitch_absolute(COLOR_CHANGE, 0, 0)
    if count == 0:
        raise ValueError("No stitchable colored regions found")
    pattern.end()
    out = BytesIO()
    write_dst(pattern, out)
    return base64.b64encode(out.getvalue()).decode("ascii"), stops, count

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 6_000_000:
                raise ValueError("Request exceeds size limit")
            payload = json.loads(self.rfile.read(size))
            result, colors, count = make_dst(payload)
            body = json.dumps({"dst_base64": result, "thread_colors": colors, "segments": count}).encode()
            status = 200
        except (ValueError, KeyError, TypeError, UnidentifiedImageError, base64.binascii.Error) as exc:
            body = json.dumps({"error": str(exc)}).encode()
            status = 400
        except Exception:
            body = json.dumps({"error": "Conversion failed"}).encode()
            status = 500
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
