@echo off
title Plano de Comunicacao - Novacap
cd /d "%~dp0"

echo ========================================
echo   Plano de Comunicacao - Novacap ASCOM
echo   Verificando e Instalando Dependencias...
echo ========================================
echo.

REM --- 1. Verificar Node.js ---
echo  [1/4] Verificando Node.js...
node -v >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo   [ERRO] Node.js nao encontrado!
    echo   Por favor, instale o Node.js antes de continuar: https://nodejs.org/
    echo.
    pause
    exit /b
)
echo   Node.js instalado com sucesso.
echo.

REM --- 2. Verificar e instalar dependencias do Frontend e Backend ---
echo  [2/4] Verificando dependencias do Node.js...
if not exist "%~dp0backend\node_modules" (
    echo   [Node] Pasta node_modules nao encontrada no Backend.
    echo   Instalando dependencias do Backend - pode demorar alguns minutos...
    cd /d "%~dp0backend"
    call npm install
    cd /d "%~dp0"
) else (
    echo   [Node] Backend node_modules ja existe.
)

if not exist "%~dp0frontend\node_modules" (
    echo   [Node] Pasta node_modules nao encontrada no Frontend.
    echo   Instalando dependencias do Frontend - pode demorar alguns minutos...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
) else (
    echo   [Node] Frontend node_modules ja existe.
)
echo.

REM --- 3. Verificar e configurar Python ---
echo  [3/4] Verificando ambiente Python...
set "PYTHON_FOUND=0"
set "PYTHON_EXE=python"

REM 3.1. Testar se python esta no PATH
python --version >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_FOUND=1"
    goto :python_check_done
)

REM 3.2. Procurar em Local AppData (caminho comum de instalacao do usuario)
if exist "%LOCALAPPDATA%\Programs\Python" (
    for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
        if exist "%%d\python.exe" (
            set "PYTHON_EXE=%%d\python.exe"
            set "PYTHON_FOUND=1"
            goto :python_check_done
        )
    )
)

REM 3.3. Procurar em Program Files (instalacao global 64-bit)
for /d %%d in ("%ProgramFiles%\Python*") do (
    if exist "%%d\python.exe" (
        set "PYTHON_EXE=%%d\python.exe"
        set "PYTHON_FOUND=1"
        goto :python_check_done
    )
)

REM 3.4. Procurar em Program Files x86 (instalacao global 32-bit)
for /d %%d in ("%ProgramFiles(x86)%\Python*") do (
    if exist "%%d\python.exe" (
        set "PYTHON_EXE=%%d\python.exe"
        set "PYTHON_FOUND=1"
        goto :python_check_done
    )
)

:python_check_done
if "%PYTHON_FOUND%"=="1" (
    echo   Python encontrado: "%PYTHON_EXE%"
) else (
    echo   [AVISO] Python nao encontrado no PATH nem nos diretorios padrao. O Servico Python NLP nao sera iniciado.
    echo   Para usar recursos adicionais como entidades e embeddings, instale o Python.
)
echo.

if "%PYTHON_FOUND%"=="1" if exist "%~dp0python_service\main.py" (
    echo  [4/4] Verificando integridade do ambiente virtual Python...
    set "PYTHON_VENV_OK=0"
    
    if exist "%~dp0python_service\venv\Scripts\python.exe" (
        pushd "%~dp0python_service"
        venv\Scripts\python.exe -c "import fastapi, uvicorn, spacy, pdfplumber, pydantic" >nul 2>nul
        if %errorlevel% equ 0 (
            set "PYTHON_VENV_OK=1"
        )
        popd
    )
    
    if "%PYTHON_VENV_OK%"=="0" (
        echo   [Python] Ambiente virtual corrompido, incompleto ou ausente.
        echo   [Python] Preparando reinstalacao/reparo...
        if exist "%~dp0python_service\venv" (
            echo   [Python] Removendo venv antigo...
            rd /s /q "%~dp0python_service\venv"
        )
        echo   [Python] Criando novo ambiente virtual...
        "%PYTHON_EXE%" -m venv "%~dp0python_service\venv"
        
        echo   [Python] Instalando pacotes e modelos - pode demorar alguns minutos...
        pushd "%~dp0python_service"
        venv\Scripts\python.exe -m pip install -r requirements.txt
        venv\Scripts\python.exe -m spacy download pt_core_news_sm
        popd
    ) else (
        echo   [Python] Ambiente virtual validado com sucesso.
    )
)
echo.

REM --- 4. Inicializar Servidores ---
echo ========================================
echo   Iniciando Servidores em Janelas Separadas...
echo ========================================
echo.

REM Limpar portas antigas
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":3001 " 2^>nul') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":5173 " 2^>nul') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":8000 " 2^>nul') do taskkill /f /pid %%a >nul 2>nul
ping 127.0.0.1 -n 2 >nul

echo   [+] Backend:      http://localhost:3001
echo   [+] Frontend:     http://localhost:5173
if "%PYTHON_FOUND%"=="1" echo   [+] Python NLP:    http://localhost:8000
echo.

echo   Abrindo Backend...
start "Backend - Novacap" /D "%~dp0backend" cmd /k "title Backend - Novacap && echo [Backend] Iniciando servidor... && npm run dev"

if "%PYTHON_FOUND%"=="1" if exist "%~dp0python_service\main.py" (
    echo   Abrindo Python NLP...
    start "Python NLP - Novacap" /D "%~dp0python_service" cmd /k "title Python NLP - Novacap && echo [Python] Iniciando servico NLP... && venv\Scripts\uvicorn.exe main:app --port 8000"
)

echo   Aguardando inicializacao do Backend (5 segundos)...
ping 127.0.0.1 -n 6 >nul

echo   Abrindo Frontend...
start "Frontend - Novacap" /D "%~dp0frontend" cmd /k "title Frontend - Novacap && echo [Frontend] Iniciando servidor... && npm run dev"

echo.
echo ========================================
echo   Concluido! Abrindo navegador em 5 segundos...
echo ========================================
ping 127.0.0.1 -n 6 >nul
start http://localhost:5173
ping 127.0.0.1 -n 4 >nul
