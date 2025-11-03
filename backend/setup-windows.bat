@echo off
REM Setup script for Windows users
REM This creates the .env file and tests the Bunny.net connection

echo ========================================
echo Bunny.net Storage Setup for Windows
echo ========================================
echo.

REM Check if .env already exists
if exist .env (
    echo [OK] .env file already exists
    echo.
    goto :test_connection
)

REM Check if .env.example exists
if not exist .env.example (
    echo [ERROR] .env.example not found!
    echo Please make sure you have the latest code.
    pause
    exit /b 1
)

REM Copy .env.example to .env
echo [INFO] Creating .env file from .env.example...
copy .env.example .env >nul
if errorlevel 1 (
    echo [ERROR] Failed to create .env file
    pause
    exit /b 1
)

echo [OK] .env file created successfully
echo.
echo [INFO] The Bunny.net credentials are already configured.
echo [INFO] You only need to update DATABASE_URL with your database info.
echo.

:test_connection
echo [INFO] Testing Bunny.net connection...
echo.
node setup-bunny-storage.js
if errorlevel 1 (
    echo.
    echo [ERROR] Connection test failed. Please check the error above.
    echo.
    echo Common solutions:
    echo - Make sure you ran 'npm install' first
    echo - Check if the .env file has the correct credentials
    echo - Verify your firewall allows FTP connections
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Update DATABASE_URL in .env with your database credentials
echo 2. Run 'npm run dev' to start the application
echo.
pause
