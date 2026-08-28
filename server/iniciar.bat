@echo off
title PokeWeed
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo Node.js nao foi encontrado no seu PC.
  echo Baixe e instale em https://nodejs.org ^(versao LTS^) e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando o PokeWeed pela primeira vez, aguarde um instante...
  call npm install
  echo.
)

echo ============================================
echo   PokeWeed
echo ============================================
echo.
echo NAO FECHE esta janela enquanto estiver usando o app.
echo Fechar ela desliga o servidor.
echo.
echo Suas contas, posts, fotos e videos NAO ficam nesta pasta.
echo Ficam em:  %LOCALAPPDATA%\PokeWeed
echo Pode trocar ou apagar a pasta do PokeWeed a vontade que os dados continuam la.
echo.
echo Pra abrir no CELULAR: procure abaixo o endereco https://192.168.x.x:8080
echo e digite ele no navegador do celular (mesma Wi-Fi do PC).
echo.

set HTTPS=1
start "" cmd /c "timeout /t 3 /nobreak >nul & start https://localhost:8080"
call npm start
