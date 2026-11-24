@echo off
rem Kendin Yap sitesini baslatir ve tarayicida acar.
cd /d "%~dp0"
if not exist node_modules (
  echo Ilk kurulum yapiliyor...
  call npm install
)
start "" http://127.0.0.1:8200/
call npm run dev
