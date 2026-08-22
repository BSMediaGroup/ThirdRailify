@echo off
setlocal
cd /d "%~dp0"
node scripts\verify-cloudflare-state-backend.mjs
set "VERIFY_EXIT=%ERRORLEVEL%"
echo.
if not "%VERIFY_EXIT%"=="0" echo Verification did not pass. Review CURRENT, STALE, UNREACHABLE, or INCOMPATIBLE above.
pause
exit /b %VERIFY_EXIT%

