@echo off
title INSIDEO DIA - dev server
cd /d "%~dp0"

echo.
echo ============================================================
echo   INSIDEO DIA - servidor de desarrollo
echo ============================================================
echo.
echo   Una vez que veas "Ready in ...", abre:
echo     http://localhost:3000/login
echo.
echo   Para detener el servidor: cierra esta ventana o Ctrl+C.
echo.
echo ============================================================
echo.

call npx --yes next dev
echo.
echo Servidor detenido.
pause
