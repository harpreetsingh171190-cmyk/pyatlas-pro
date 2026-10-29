@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 -m pyatlas serve
) else (
  python -m pyatlas serve
)
if errorlevel 1 pause
