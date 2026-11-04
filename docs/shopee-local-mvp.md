# CHAYLUEKLAB Shopee Local MVP

Windows app prototype prepared as downloadable ZIP in ChatGPT. Architecture: Python Tkinter + SQLite Memory HUB, product intake, commission estimates, CSV export, storyboard and FFmpeg image-based MP4 rendering.

## Local installation
Install Python 3.11+ on Windows. Extract the ZIP, double-click start.bat. Install FFmpeg and add to PATH to enable MP4 creation. For EXE, run: pip install pyinstaller && pyinstaller --onefile --windowed --name CHAYLUEKLAB-Shopee app.py.

## Scope and safety
This is a local MVP, not a Botpress clone or fully autonomous affiliate agent. No Shopee scraping, no unapproved auto-posting, no fabricated affiliate links or sales. Shopee seller/affiliate account integration and ChatGPT Memory HUB sync require authorized APIs. Do not merge until Windows tests and code review pass.

## Existing systems
Keep website, LINE OA, Supabase and existing income assistant unchanged. Product database already contains duplicates and suspicious event totals; do not treat recorded totals as verified income.
