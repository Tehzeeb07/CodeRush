@echo off
cd /d E:\coding platform\coderush
if exist .next rmdir /s /q .next
if exist "E:\coding platform\package-lock.json" del /q "E:\coding platform\package-lock.json"
npm run dev 1> dev-out5.log 2> dev-err5.log