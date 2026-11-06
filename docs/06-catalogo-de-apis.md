# 06. Catálogo de APIs REST

## 1. Padrões de Comunicação e Resposta

A API RESTful do **GSVR** opera sob o prefixo `/api` e adota contratos padronizados em JSON:

### 1.1. Resposta de Sucesso (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso."
}
```

### 1.2. Resposta de Erro (HTTP 400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "error": {
    "code": "CODIGO_DE_ERRO",
    "message": "Descrição amigável da falha para o usuário."
  }
}
```

### 1.3. Cabeçalho de Autenticação Obrigatório
Para todas as rotas protegidas (exceto login e primeiro acesso):
```http
Authorization: Bearer <access_token_jwt>
```

---

## 2. Endpoints de Autenticação e Sessão

| Método | Rota | Autenticação | Descrição |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/login` | Pública | Login primário por CPF normalizado (11 dígitos) e senha. |
| `POST` | `/api/auth/refresh` | Pública | Renova o Access Token (15 min) utilizando o Refresh Token rotativo (7 dias). |
| `POST` | `/api/auth/logout` | `Bearer JWT` | Invalida e revoga o Refresh Token no banco de dados. |
| `POST` | `/api/auth/first-access/verify` | Pública | Validação anti-sequestro cruzando CPF e Matrícula. Retorna token de 15 min. |
| `POST` | `/api/auth/first-access/setup` | Pública | Define a senha forte inicial associada ao token de primeiro acesso. |
| `POST` | `/api/auth/password/change` | `Bearer JWT` | Permite ao usuário logado alterar sua própria senha. |
| `POST` | `/api/auth/password/forgot` | Pública | Solicita token de recuperação de senha. |
| `POST` | `/api/auth/password/reset` | Pública | Redefine senha utilizando o token de recuperação emitido. |

#### Exemplo de Payload: `POST /api/login`
```json
{
  "cpf": "05626561463",
  "password": "Senha@Forte2026",
  "totp_code": "123456" // Obrigatório se mfa_enabled = true
}
```

---

## 3. Endpoints de Perfil e Usuário Autenticado

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/me` | `Bearer JWT` | Qualquer | Retorna dados completos do policial logado, papéis e permissões. |
| `PUT` | `/api/me/profile` | `Bearer JWT` | Qualquer | Atualiza e-mail pessoal e telefone/WhatsApp de contato. |
| `POST` | `/api/me/avatar` | `Bearer JWT` | Qualquer | Upload de imagem de avatar pessoal (multipart/form-data, máx 5MB). |
| `DELETE` | `/api/me/avatar` | `Bearer JWT` | Qualquer | Remove a foto de perfil personalizada. |

---

## 4. Endpoints de Gestão de Usuários e RBAC

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/usuarios` | `Bearer JWT` | `usuarios:read` | Lista contas de usuários cadastradas com status e papéis. |
| `PUT` | `/api/usuarios/:id/status` | `Bearer JWT` | `usuarios:admin` | Altera status da conta (`ativo`, `inativo`). |
| `POST` | `/api/usuarios/:id/desbloquear` | `Bearer JWT` | `usuarios:bloquear` | Desbloqueia conta travada por tentativas consecutivas incorretas. |
| `POST` | `/api/usuarios/:id/reset-primeiro-acesso` | `Bearer JWT` | `usuarios:reset` | Reseta credenciais forçando novo fluxo de 1º acesso seguro. |
| `PUT` | `/api/usuarios/:id/roles` | `Bearer JWT` | `usuarios:admin` | Atualiza a atribuição de papéis (`roles`) do usuário. |
| `GET` | `/api/roles` | `Bearer JWT` | `usuarios:admin` | Lista todos os papéis configurados no sistema. |
| `POST` | `/api/roles` | `Bearer JWT` | `usuarios:admin` | Cria um novo papel personalizado. |
| `PUT` | `/api/roles/:id` | `Bearer JWT` | `usuarios:admin` | Altera nome, descrição e permissões vinculadas ao papel. |
| `DELETE` | `/api/roles/:id` | `Bearer JWT` | `usuarios:admin` | Remove papel (protegendo papéis de sistema como SUPERUSER). |
| `GET` | `/api/permissions` | `Bearer JWT` | `usuarios:admin` | Lista catálogo geral de permissões agrupadas por módulo. |

---

## 5. Endpoints de Ciclos, OPMs e Metas

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/ciclos` | `Bearer JWT` | `ciclos:read` | Lista ciclos cadastrados com status e período de vigência. |
| `POST` | `/api/ciclos` | `Bearer JWT` | `ciclos:manage` | Cadastra novo ciclo com verba prevista e limites de guarnições. |
| `PUT` | `/api/ciclos/:id` | `Bearer JWT` | `ciclos:manage` | Altera parâmetros de orçamento ou encerra ciclo. |
| `GET` | `/api/metas/:cicloId` | `Bearer JWT` | `ciclos:read` | Retorna metas diárias de equipes e cenários A/B calculados. |
| `POST` | `/api/metas/recalcular/:cicloId` | `Bearer JWT` | `ciclos:manage` | Dispara o `ScaleOptimizer` para reequilibrar o orçamento restante. |
| `GET` | `/api/opm` | `Bearer JWT` | `opm:read` | Lista OPMs e unidades subordinadas cadastradas. |
| `POST` | `/api/opm` | `Bearer JWT` | `opm:manage` | Cadastra nova subunidade policial. |

---

## 6. Endpoints de Efetivo e Voluntários

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/efetivo` | `Bearer JWT` | `efetivo:read` | Consulta relação completa de policiais com filtros e paginação. |
| `POST` | `/api/efetivo` | `Bearer JWT` | `efetivo:edit` | Cadastro individual de militar. |
| `PUT` | `/api/efetivo/:id` | `Bearer JWT` | `efetivo:edit` | Edição cadastral (posto, nome de guerra, telefone, motorista). |
| `POST` | `/api/efetivo/import` | `Bearer JWT` | `efetivo:import` | Importação em lote de planilha Excel (.xlsx / .xls). |
| `GET` | `/api/volunteers` | `Bearer JWT` | `escalas:read` | Retorna banco de voluntários aptos para o ciclo selecionado. |
| `GET` | `/api/voluntarios/disponibilidade` | `Bearer JWT` | `escalas:read` | Retorna a matriz de turnos do militar no ciclo para exibição. |

---

## 7. Endpoints de Escala e Planejamento Operacional

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/escalas` | `Bearer JWT` | `escalas:read` | Lista guarnições planejadas para determinada data/ciclo. |
| `POST` | `/api/escalas/batch` | `Bearer JWT` | `escalas:create` | **Persistência Manual**: Grava em bloco a escala montada no painel. |
| `DELETE` | `/api/escalas/:id` | `Bearer JWT` | `escalas:delete` | Remove uma equipe ou militar planejado. |
| `GET` | `/api/escalas/memorando/:cicloId` | `Bearer JWT` | `escalas:publish` | Gera dados consolidados para emissão do Memorando Oficial SVR. |
| `GET` | `/api/minhas-escalas` | `Bearer JWT` | Qualquer | Retorna exclusivamente as escalas do policial autenticado. |

#### Exemplo de Payload: `POST /api/escalas/batch`
```json
{
  "id_ciclo": 12,
  "data_servico": "2026-07-20",
  "guarnicoes": [
    {
      "id_guarnicao": "FT-01",
      "cartao_viatura": "VTR-9102",
      "local_embarque": "Sede 9º BPM",
      "horario_servico": "07:00 ÀS 13:00",
      "efetivo": [
        { "id_militar": 45, "funcao": "COMANDANTE", "id_disponibilidade": 1823 },
        { "id_militar": 89, "funcao": "MOTORISTA",  "id_disponibilidade": 1845 },
        { "id_militar": 12, "funcao": "PATRULHEIRO", "id_disponibilidade": 1890 }
      ]
    }
  ]
}
```

---

## 8. Endpoints de Serviços Executados e Relatórios

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/servicos-executados` | `Bearer JWT` | `escalas:read` | Lista serviços confirmados em campo com valor apurado. |
| `POST` | `/api/servicos-executados` | `Bearer JWT` | `escalas:create` | Registra atesto presencial de militar em serviço. |
| `GET` | `/api/conferencia/discrepancias` | `Bearer JWT` | `escalas:read` | Aponta divergências entre militares planejados vs. executados. |
| `GET` | `/api/reports/financeiro-resumo` | `Bearer JWT` | `financeiro:read` | Resumo financeiro consolidado do ciclo vigente. |
| `GET` | `/api/reports/gastos-ft` | `Bearer JWT` | `financeiro:read` | Demonstrativo analítico de despesas por OPM e tipo de turno. |

---

## 9. Endpoints Técnicos e Auditoria (Restritos ao SUPERUSER)

| Método | Rota | Autenticação | Permissão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `GET` | `/api/superuser/metrics` | `Bearer JWT` | `sistema:diagnostics` | Métricas de CPU, uso de RAM do Node.js, uptime e conexões PG. |
| `GET` | `/api/superuser/audit-logs` | `Bearer JWT` | `sistema:audit` | Consulta paginada da tabela imutável `audit_logs`. |
| `GET` | `/api/superuser/diagnostics` | `Bearer JWT` | `sistema:diagnostics` | Checagem de integridade das tabelas e saúde do banco. |
