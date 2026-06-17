@echo off
title Plano de Comunicacao - Novacap
cd /d "%~dp0"

echo ========================================
echo   Plano de Comunicacao - Novacap ASCOM
echo ========================================
echo.

REM Detectar IP local para acesso em rede
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" /c:"IPv4" 2^>nul') do set "IP=%%a"
set "IP=%IP: =%"
if "%IP%"=="" for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"Endere" 2^>nul') do set "IP=%%a"
set "IP=%IP: =%"

echo ========================================
echo   Iniciando Servidores em Janelas Separadas...
echo.
echo   Acesso local:    http://localhost:5173
if not "%IP%"=="" echo   Acesso rede:     http://%IP%:5173
echo ========================================
echo.
echo  Limpando processos antigos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":3001 "') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":5173 "') do taskkill /f /pid %%a >nul 2>nul
timeout /t 1 /nobreak >nul
echo.

echo  [1/3] Iniciando Backend (porta 3001)...
start "Backend - Novacap" cmd /k "title Backend - Novacap && cd /d "%~dp0backend" && echo [Backend] Iniciando servidor... && npm run dev"

echo  [2/3] Iniciando Frontend (porta 5173)...
start "Frontend - Novacap" cmd /k "title Frontend - Novacap && cd /d "%~dp0frontend" && echo [Frontend] Iniciando servidor... && npm run dev"

if exist "%~dp0python_service\main.py" (
    echo  [3/3] Iniciando Servico Python (porta 8000)...
    start "Python NLP - Novacap" cmd /k "title Python NLP - Novacap && cd /d "%~dp0python_service" && echo [Python] Iniciando servico NLP... && uvicorn main:app --port 8000"
)

echo.
echo  Abrindo navegador em http://localhost:5173 ...
timeout /t 5 /nobreak >nul
start http://localhost:5173
echo.
echo ========================================
echo   Concluido! As janelas dos servidores
echo   estao abertas em segundo plano.
echo   Pode fechar esta janela principal.
echo ========================================
timeout /t 3 >nul
