@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 goto runpy
where python >nul 2>nul
if %errorlevel%==0 goto runpython
echo Python is not installed. Install Python 3.11 or newer from https://www.python.org/downloads/windows/
echo During installation, enable Add Python to PATH.
pause
exit /b 1
:runpy
py -3 app.py
if errorlevel 1 pause
exit /b
:runpython
python app.py
if errorlevel 1 pause
