"""Isolated Vercel Python Function; no auth/payment/main-site dependencies."""
from http.server import BaseHTTPRequestHandler
import json
import logging
from embroidery.engine import CAPABILITIES, MAX_REQUEST_BYTES, handle_payload


class handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
        if len(body) > 4_000_000:
            status, body = 422, b'{"error":"Design response too large; simplify image"}'
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.respond(200, {"service": "WORAMET Embroidery", "status": "experimental", "capabilities": CAPABILITIES,
                           "max_image_bytes": 2_500_000, "storage": "browser_local_only"})

    def do_POST(self):
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            self.respond(415, {"error": "รองรับเฉพาะ application/json"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= MAX_REQUEST_BYTES:
                self.respond(413, {"error": "คำขอใหญ่เกินไป (สูงสุด 3.6 MB)"})
                return
            payload = json.loads(self.rfile.read(size))
            self.respond(200, handle_payload(payload))
        except (ValueError, KeyError, TypeError, AttributeError, OverflowError) as exc:
            self.respond(400, {"error": str(exc)[:240]})
        except Exception:
            logging.exception("Embroidery conversion failed")
            self.respond(500, {"error": "สร้างลายไม่ได้ กรุณาลดความซับซ้อนของภาพ"})
