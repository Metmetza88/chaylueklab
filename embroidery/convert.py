#!/usr/bin/env python3
"""Experimental raster-to-DST generator for simple flat-color logos.
NOT production-ready digitizing; test on scrap fabric before using a Tajima.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageOps
from pyembroidery import EmbPattern, write_dst

def main():
    p = argparse.ArgumentParser()
    p.add_argument("image", type=Path)
    p.add_argument("--output", type=Path, default=Path("sample.dst"))
    p.add_argument("--width-mm", type=float, default=50)
    p.add_argument("--colors", type=int, default=4)
    p.add_argument("--row-mm", type=float, default=0.45)
    args = p.parse_args()
    if not 10 <= args.width_mm <= 150 or not 1 <= args.colors <= 8:
        p.error("width-mm must be 10..150 and colors 1..8")
    if not 0.3 <= args.row_mm <= 1:
        p.error("row-mm must be 0.3..1")
    im = Image.open(args.image).convert("RGBA")
    bg = Image.new("RGBA", im.size, "white")
    bg.alpha_composite(im)
    im = bg.convert("RGB")
    # Use 2 pixels per mm; avoid tiny pixel islands.
    width = round(args.width_mm * 2)
    height = max(1, round(width * im.height / im.width))
    if height > 300:
        p.error("image too tall; reduce aspect ratio or width")
    im = ImageOps.contain(im, (width, height)).quantize(colors=args.colors, method=Image.Quantize.MEDIANCUT)
    pixels = im.load()
    palette = im.getpalette()
    counts = im.getcolors() or []
    ordered = [idx for _, idx in sorted(counts, reverse=True)]
    pattern = EmbPattern()
    # DST uses 0.1 mm machine units; raster scale = 0.5 mm/pixel.
    step = args.width_mm * 10 / width
    row_step = max(1, round(args.row_mm * 10 / step))
    segments = 0
    for idx in ordered:
        rgb = tuple(palette[idx*3:idx*3+3])
        # Skip near-white background, but retain light colors if required manually.
        if min(rgb) > 245:
            continue
        pattern.add_thread({"color": "#%02x%02x%02x" % rgb})
        had_color = False
        for y in range(0, im.height, row_step):
            runs = []
            x = 0
            while x < im.width:
                if pixels[x, y] != idx:
                    x += 1
                    continue
                start = x
                while x < im.width and pixels[x, y] == idx:
                    x += 1
                if x-start >= 3:
                    runs.append((start, x-1))
            if (y // row_step) % 2:
                runs.reverse()
            for left, right in runs:
                if segments >= 12000:
                    raise RuntimeError("Too many segments: simplify logo or reduce colors")
                x1, x2 = (left, right) if (y // row_step) % 2 == 0 else (right, left)
                yy = round((y - im.height / 2) * step)
                pattern.add_stitch_absolute(1, round((x1-im.width/2)*step), yy) # JUMP
                pattern.add_stitch_absolute(0, round((x2-im.width/2)*step), yy) # STITCH
                segments += 1
                had_color = True
        if had_color:
            pattern.add_stitch_absolute(5, 0, 0)  # COLOR_CHANGE
    if not segments:
        raise RuntimeError("No colored regions found")
    pattern.end()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_dst(pattern, str(args.output))
    print(f"Experimental DST: {args.output}; {segments} line segments; verify stitch simulation.")

if __name__ == "__main__":
    main()
