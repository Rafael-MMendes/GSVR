@echo off
chcp 65001 >nul
title Popular Banco de Dados - Força Tarefa

echo ==========================================
echo   POPULANDO BANCO DE DADOS (bd.sql)
echo ==========================================
echo.

cd backend

REM Verifica se node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias necessarias...
    call npm install
)

echo [PROCESSANDO] Executando seed.js no PostgreSQL...
node seed.js

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu uma falha ao popular o banco.
    echo Verifique se o Docker/PostgreSQL está rodando.
) else (
    echo.
    echo [SUCESSO] Banco de Dados populado com dados de teste.
)

echo.
echo ==========================================
echo   TESTE DE LOGIN (SEED):
echo ==========================================
echo.
echo   Matrícula: 151197
echo   Senha/CPF: 5626561463
echo.
cd ..
pause
