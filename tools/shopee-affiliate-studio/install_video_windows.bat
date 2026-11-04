@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m pip install -r requirements-video.txt
) else (
  python -m pip install -r requirements-video.txt
)
echo.
echo Video libraries are installed if no error is shown above.
pause
