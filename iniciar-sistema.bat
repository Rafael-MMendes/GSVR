@echo off
chcp 65001 >nul
title Iniciando Sistema de Escalas - 9º BPM FT

echo ==========================================
echo   SISTEMA DE ESCALAS - 9º BPM (GSVR)
echo ==========================================
echo.

REM Verifica se Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale o Node.js primeiro.
    pause
    exit /b 1
)

echo [OK] Node.js detectado.
echo.

REM Verifica se as pastas node_modules existem
if not exist "backend\node_modules" (
    echo [INFO] Instalando dependencias do Backend...
    cd backend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias do Backend.
        pause
        exit /b 1
    )
)

if not exist "frontend\node_modules" (
    echo [INFO] Instalando dependencias do Frontend...
    cd frontend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias do Frontend.
        pause
        exit /b 1
    )
)

echo.
echo ==========================================
echo   INICIANDO SERVICOS
echo ==========================================
echo.

REM Inicia o Backend em uma nova janela (desabilita cores ANSI)
start "Backend - Servidor API" cmd /k "set NO_COLOR=1 && set TERM=dumb && cd /d %~dp0backend && npm start"

echo [OK] Backend iniciado na porta 3000
timeout /t 3 /nobreak >nul

REM Inicia o Frontend em uma nova janela
start "Frontend - Interface Web" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [OK] Frontend iniciado
timeout /t 2 /nobreak >nul

echo.
echo ==========================================
echo   SISTEMA PRONTO!
echo ==========================================
echo.
echo   Acesse: http://localhost:5173
echo.
echo   Para encerrar, feche as janelas abertas.
echo.
pause