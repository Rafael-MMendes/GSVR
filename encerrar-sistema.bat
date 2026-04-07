@echo off
chcp 65001 >nul
title Encerrar Sistema de Escalas - 9º BPM FT

echo ==========================================
echo   ENCERRANDO SISTEMA DE ESCALAS
echo ==========================================
echo.

echo [INFO] Encerrando processos do Node.js...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo [OK] Sistema encerrado com sucesso!
echo.
pause