"""Generate original synthetic geometry; NOT a school logo or machine test."""
from pathlib import Path
from PIL import Image, ImageDraw
import base64
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from embroidery.engine import handle_payload

ROOT = Path(__file__).resolve().parents[1]


def main():
    image = Image.new("RGB", (400, 400), "white")
    d = ImageDraw.Draw(image)
    green, gold, red = "#185b52", "#cf9948", "#a35345"
    # Original crest, geometric W, leaves; no external trademark or school emblem.
    d.ellipse((30, 30, 370, 370), fill=green)
    d.ellipse((40, 40, 360, 360), fill="white")
    d.ellipse((49, 49, 351, 351), fill=gold)
    d.ellipse((62, 62, 338, 338), fill="white")
    d.polygon([(127, 104), (273, 104), (267, 240), (200, 300), (133, 240)], fill=green)
    d.line([(144, 128), (169, 232), (200, 177), (231, 232), (256, 128)], fill=gold, width=14)
    d.polygon([(200, 67), (210, 81), (200, 95), (190, 81)], fill=red)
    for y, x in [(170, 89), (198, 91), (226, 100), (254, 118), (277, 142)]:
        d.ellipse((x-10,y-14,x+8,y+6), fill=green)
        d.ellipse((392-x,y-14,410-x,y+6), fill=green)
    d.line([(89,160),(92,218),(118,264),(157,293)],fill=green,width=4)
    d.line([(311,160),(308,218),(282,264),(243,293)],fill=green,width=4)
    image.save(ROOT / "embroidery/samples/synthetic-crest.png")
    image.save(ROOT / "assets/embroidery/sample.png")
    result = handle_payload({"image_base64": base64.b64encode((ROOT / "assets/embroidery/sample.png").read_bytes()).decode(), "width_mm": 50, "colors": 3, "density": .45, "angle": 30})
    result["design"]["name"] = "sample-crest"
    (ROOT / "assets/embroidery/sample.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "embroidery/samples/synthetic-crest-50mm.dst").write_bytes(base64.b64decode(result["file_base64"]))
    (ROOT / "embroidery/samples/synthetic-crest-50mm.threads.json").write_text(json.dumps(result["thread_sequence"], indent=2), encoding="utf-8")
    (ROOT / "embroidery/samples/synthetic-crest-50mm.report.json").write_text(json.dumps({"fixture": "original synthetic crest; NOT Ban Rahan school logo", "machine_tested": False, "metrics": result["metrics"], "warnings": result["warnings"] + result["design"]["warnings"]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(result["metrics"])


if __name__ == "__main__":
    main()
