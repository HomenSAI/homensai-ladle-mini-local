@echo off
setlocal
where py >nul 2>&1
if errorlevel 1 goto python
py -3 "%~dp0tools\gradle_bootstrap.py" %*
exit /b %ERRORLEVEL%
:python
where python >nul 2>&1
if errorlevel 1 goto missing
python "%~dp0tools\gradle_bootstrap.py" %*
exit /b %ERRORLEVEL%
:missing
echo Python 3.10 or newer is required by the source-only build launcher.
echo See docs\BUILD.md. Alternatively use installed Gradle 8.13.
exit /b 2
