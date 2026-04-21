@echo off
echo ====================================
echo Merchant Nation - Setup Script
echo ====================================
echo.

echo Step 1: Stopping all Node.js processes...
taskkill //F //IM node.exe 2>nul
timeout /t 3 /nobreak >nul
echo Done!
echo.

echo Step 2: Cleaning up...
if exist .next rmdir /s /q .next
echo Cleaned .next folder
echo.

echo Step 3: Generating Prisma Client...
call npx prisma generate
echo.

echo Step 4: Seeding database...
call npx prisma db seed
echo.

echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Login Credentials:
echo Email: player@example.com
echo Password: DevPassword1!
echo.
echo Starting development server...
echo.

call npm run dev
