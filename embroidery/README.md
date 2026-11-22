# WORAMET AI EMBROIDERY — experimental DST converter

This is a **local proof of concept**, not automatic professional embroidery digitizing.

## Setup (Windows)

Install Python 3.11+ and run:

```powershell
py -m pip install Pillow pyembroidery
py embroidery/convert.py logo.png --output sample.dst --width-mm 50 --colors 4
```

The converter quantizes a simple logo, scans horizontal runs, and writes actual machine-stitch commands in Tajima DST format. **It does not implement proper tatami fills, satin columns, underlay, pull compensation, tie-ins, trims, thread palettes, fabric-specific tension or path optimization.** It is unsuitable for production without professional review and test stitching. Fine Thai lettering and intricate school emblems require manual digitizing. The DST format does not reliably embed real thread colors: match the ordered color stops on the Tajima manually.

This script is not wired to the public website; running Python on a server requires a separate secure processing service. No deployment or machine operation is performed.
