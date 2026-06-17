@echo off
title Logs - Plano de Comunicacao
cd /d "%~dp0backend"
echo ========================================
echo   Visualizador de Logs
echo ========================================
echo.
echo   Logs disponiveis:
echo.
dir /b /o-d "logs\*.log" 2>nul | findstr /r ".*" >nul
if %errorlevel% neq 0 (
    echo   (nenhum log encontrado ainda)
    echo.
    echo   Inicie o sistema pelo start.bat primeiro.
    pause
    exit /b
)

dir /b /o-d "logs\*.log" 2>nul
echo.
set /p file="Digite o nome do arquivo (Enter = ultimo): "
if "%file%"=="" (
    for /f "delims=" %%a in ('dir /b /o-d "logs\*.log" 2^>nul') do set "file=%%a" & goto tail
)
:tail
if not exist "logs\%file%" (
    echo Arquivo nao encontrado: %file%
    pause
    exit /b
)
echo.
echo Monitorando: %file%  (Ctrl+C para sair)
echo ========================================
type "logs\%file%" | more
echo.
echo --- Fim do log. Aguardando novas entradas ---
powershell -Command "Get-Content -Path 'logs\%file%' -Wait -Tail 20"
