"""Local Windows/Linux development server. Publishes only built _site files."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import sys
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("embroidery_api", ROOT / "api/embroidery.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LocalHandler(SimpleHTTPRequestHandler):
    respond = module.handler.respond

    def do_GET(self):
        if self.path.split("?")[0] in ("/api/embroidery", "/api/embroidery/"):
            return module.handler.do_GET(self)
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] in ("/api/embroidery", "/api/embroidery/"):
            return module.handler.do_POST(self)
        self.send_error(404)

    def list_directory(self, path):
        self.send_error(404)

    def translate_path(self, path):
        result = super().translate_path(path)
        if Path(result).is_symlink() or any(p.startswith(".") for p in Path(result).relative_to(ROOT / "_site").parts):
            return str(ROOT / "_site" / "not-found")
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4175)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    if not (ROOT / "_site/embroidery-studio.html").is_file():
        parser.error("Run node scripts/build-public-site.mjs first")
    print(f"WORAMET local: http://{args.host}:{args.port}/embroidery-studio.html", flush=True)
    ThreadingHTTPServer((args.host, args.port), partial(LocalHandler, directory=str(ROOT / "_site"))).serve_forever()


if __name__ == "__main__":
    main()
