@echo off
title PokeWeed - restaurar dados
cd /d "%~dp0"

echo.
echo === PokeWeed: restaurar contas e posts ===
echo.
echo Use isso se voce tem um arquivo "pokeweed.db" antigo guardado
echo (de uma pasta velha do PokeWeed, da Lixeira, ou de um backup).
echo.
echo Deixe o PokeWeed DESLIGADO enquanto faz isso.
echo.

if not exist node_modules (
  echo Instalando o necessario, aguarde...
  call npm install
  echo.
)

echo Onde estao seus dados hoje:
call node onde-estao-os-dados.js
echo.

set /p ARQ="Arraste aqui o arquivo pokeweed.db antigo e aperte Enter: "
if "%ARQ%"=="" (
  echo Nenhum arquivo informado. Saindo.
  pause
  exit /b 1
)

set /p MIDIA="Arraste aqui a pasta de midia/uploads antiga (ou deixe vazio): "

echo.
if "%MIDIA%"=="" (
  call node restaurar.js %ARQ%
) else (
  call node restaurar.js %ARQ% %MIDIA%
)

echo.
pause
