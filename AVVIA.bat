@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo =====================================
echo       COCCODE - MULTIPLAYER
echo =====================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non e' installato. Installa la versione LTS da https://nodejs.org/ e riapri questo file.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installazione dei componenti necessari...
  call npm install
  if errorlevel 1 (echo Errore durante npm install.& pause & exit /b 1)
)
echo Avvio del server. Non chiudere questa finestra mentre giochi.
start "" http://localhost:3000
call npm start
pause
