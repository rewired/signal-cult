@echo off
setlocal
cd /d "%~dp0plugins"
echo rewired-vfx SIGNAL CULT
echo Menu:      http://localhost:8080/
echo BROKEN FM: http://localhost:8080/broken-fm/
echo CRT SIM:   http://localhost:8080/crt-sim/
echo Press Ctrl+C to stop all tools.
python -m http.server 8080 --bind 127.0.0.1
endlocal
