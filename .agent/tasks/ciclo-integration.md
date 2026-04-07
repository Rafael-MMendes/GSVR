# Plano de Implementação: Módulo de Ciclos ✅

Este documento descreve as etapas para implementar a funcionalidade completa da tabela `CICLOS`, integrando backend e frontend.

## 🏗️ 1. Backend (PostgreSQL & Express)

### 1.1. Banco de Dados
- [x] Criar View `vw_detalhes_ciclos` para facilitar a listagem com informações agregadas (OPM, total de inscritos, etc).
- [x] Garantir que a tabela `CICLOS` tenha índices adequados para `referencia_mes_ano`.

### 1.2. API (server.js)
- [x] **GET `/api/ciclos`**: Retornar todos os ciclos (usando a view).
- [x] **POST `/api/ciclos`**: Criar novo ciclo (validando duplicidade de `referencia_mes_ano`).
- [x] **PUT `/api/ciclos/:id`**: Atualizar datas ou status (Aberto/Fechado).
- [x] **DELETE `/api/ciclos/:id`**: Remover ciclo (validar se há requerimentos vinculados).

## 🎨 2. Frontend (React)

### 2.1. Componentes
- [x] Criar `CicloManager.jsx`: Interface administrativa para gerenciar os ciclos.
- [x] Adicionar navegação no `App.jsx` para administradores.

### 2.2. Integração
- [x] Substituir o uso de `/api/months` por `/api/ciclos` em componentes que dependem de seleção de período (AdminDashboard, Financeiro).

## ✅ 3. Validação e Finalização
- [x] Testar fluxo de criação de novo ciclo.
- [x] Verificar se a restrição de exclusão de ciclos com dados vinculados está funcionando.
- [x] Atualizar `VERSION.md` com a versão `v1.8.5`.

---
**Desenvolvedor:** Alan Kleber
**Status:** 🏁 Concluído
