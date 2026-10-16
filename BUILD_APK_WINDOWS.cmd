@echo off
setlocal
cd /d "%~dp0"
call gradlew.bat --no-daemon :app:lintDebug :app:assembleDebug
if errorlevel 1 goto failed
echo.
echo Test APK: %CD%\app\build\outputs\apk\debug\app-debug.apk
echo This is a debug build, not a production signed release.
pause
exit /b 0
:failed
echo.
echo Build failed. Read the error above and docs\BUILD.md.
pause
exit /b 1
