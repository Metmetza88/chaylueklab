#!/usr/bin/env python3
"""Local CLI using the same engine and validation as /api/embroidery."""
import argparse
import base64
import json
from pathlib import Path
import sys

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from embroidery.engine import handle_payload, MAX_IMAGE_BYTES


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("image", type=Path)
    p.add_argument("--output", type=Path, default=Path("sample.dst"))
    p.add_argument("--width-mm", type=float, default=50)
    p.add_argument("--colors", type=int, default=4)
    p.add_argument("--row-mm", type=float, default=.45)
    p.add_argument("--stitch-length", type=float, default=2.8)
    p.add_argument("--angle", type=float, default=30)
    p.add_argument("--type", choices=["running", "tatami"], default="tatami")
    p.add_argument("--no-underlay", action="store_true")
    p.add_argument("--keep-white", action="store_true")
    p.add_argument("--pull", type=float, default=.15)
    p.add_argument("--fabric", choices=["woven", "knit", "cap"], default="woven")
    args = p.parse_args()
    if args.output.suffix.lower() not in (".dst", ".pes", ".jef"):
        p.error("รองรับ .dst / .pes / .jef จริงเท่านั้น; EMB Not Available")
    try:
        if args.image.stat().st_size > MAX_IMAGE_BYTES:
            raise ValueError("ภาพต้องไม่เกิน 2.5 MB")
        result = handle_payload({"image_base64": base64.b64encode(args.image.read_bytes()).decode(),
                                 "width_mm": args.width_mm, "colors": args.colors, "density": args.row_mm,
                                 "stitch_length": args.stitch_length, "angle": args.angle, "stitch_type": args.type,
                                 "underlay": not args.no_underlay, "remove_white": not args.keep_white,
                                 "pull_compensation": args.pull, "fabric": args.fabric})
        design = result["design"]
        if args.output.suffix.lower() != ".dst":
            result = handle_payload({"action": "export", "design": design, "format": args.output.suffix[1:].lower()})
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(base64.b64decode(result["file_base64"]))
        args.output.with_suffix(".threads.json").write_text(json.dumps(result["thread_sequence"], indent=2), encoding="utf-8")
        args.output.with_suffix(".woramet.json").write_text(json.dumps({"design": design}, ensure_ascii=False), encoding="utf-8")
        args.output.with_suffix(".report.json").write_text(json.dumps({"metrics": result["metrics"], "warnings": design["warnings"] + result["warnings"]}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Experimental {args.output}: {result['metrics']['stitch_count']} stitches. SOFTWARE ONLY; no machine test.")
    except (ValueError, OSError) as exc:
        p.error(str(exc))


if __name__ == "__main__":
    main()
