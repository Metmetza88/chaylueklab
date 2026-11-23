"""Read actual browser downloads back; never interprets this as a machine test."""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image
from pyembroidery import read_dst, read_pes, read_jef, STITCH, COLOR_CHANGE, END, COMMAND_MASK


def main():
    root = Path(__file__).resolve().parent / "reports"
    results = []
    for path in sorted(root.glob("*-sample-crest.*")):
        if path.suffix == ".png":
            with Image.open(path) as image:
                assert image.width > 50 and image.height > 50
                assert any(a < b for a, b in image.convert("RGB").getextrema()), "Blank PNG"
            continue
        if path.suffix not in (".dst", ".pes", ".jef"):
            continue
        reader = {".dst": read_dst, ".pes": read_pes, ".jef": read_jef}[path.suffix]
        pattern = reader(str(path))
        stitches = [s for s in pattern.stitches if (s[2] & COMMAND_MASK) == STITCH]
        assert stitches and (pattern.stitches[-1][2] & COMMAND_MASK) == END
        result = {"file": path.name, "format": path.suffix[1:],
                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "stitch_count": len(stitches),
                  "color_changes": sum((s[2] & COMMAND_MASK) == COLOR_CHANGE for s in pattern.stitches),
                  "machine_tested": False}
        if path.suffix == ".dst":
            previous, lengths = (0, 0), []
            for x, y, command in pattern.stitches:
                if (command & COMMAND_MASK) == STITCH:
                    lengths.append(math.dist(previous, (x, y)) / 10)
                previous = (x, y)
            assert max(lengths) <= 2.8 + .142  # 0.1mm DST coordinate quantization tolerance.
            result["max_stitch_mm"] = round(max(lengths), 3)
        results.append(result)
    assert results, "Run node embroidery/check-browser.mjs first"
    (root / "browser-file-validation.json").write_text(json.dumps({
        "validation": "pyembroidery readback of actual browser downloads", "machine_tested": False,
        "results": results}, indent=2), encoding="utf-8")
    print(f"PASS {len(results)} actual browser-downloaded machine files and nonblank PNG previews")


if __name__ == "__main__":
    main()
