@echo off
REM Database setup script for Windows

setlocal enabledelayedexpansion

echo === Nivano MVP Database Setup ===
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo .env created with default values
)

echo Loading environment from .env...
for /f "delims== tokens=1,2" %%A in (.env) do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" (
        set "%%A=%%B"
    )
)

echo Database configuration:
echo - Host: %DB_HOST%
echo - Database: %DB_NAME%
echo - User: %DB_USER%
echo.

echo Running Alembic migrations...
alembic upgrade head

echo.
echo === Database setup complete! ===

endlocal
