# 07. Guia de Implantação, Operação e Manutenção

## 1. Pré-requisitos de Sistema

Para operar o **GSVR** em ambiente de produção ou desenvolvimento, certifique-se de que a máquina ou servidor atenda aos requisitos mínimos:

### 1.1. Modo Conteinerizado (Recomendado)
- **Sistema Operacional:** Linux (Ubuntu 22.04 LTS+, Debian 12+) ou Windows Server 2022 / Windows 10/11 Pro com WSL2 ativo.
- **Docker Engine:** Versão 24.0 ou superior.
- **Docker Compose:** Versão v2.20 ou superior.
- **Memória RAM:** Mínimo de 4 GB (recomendado 8 GB).
- **Armazenamento:** Mínimo de 20 GB de espaço livre em disco SSD.

### 1.2. Modo Local (Sem Docker)
- **Node.js:** Versão 21.x ou superior.
- **NPM:** Versão 10.x ou superior.
- **PostgreSQL:** Versão 16.x instalado localmente ou acessível na rede.
- **Git:** Para versionamento e controle de branches.

---

## 2. Configuração de Variáveis de Ambiente

Antes de iniciar os serviços, configure os arquivos `.env` nas pastas correspondentes:

### 2.1. Backend (`backend/.env` ou `backend/.env.docker`)
```env
# Conexão com o Banco de Dados PostgreSQL
DB_HOST=postgres          # Use 'localhost' para execução sem Docker
DB_USER=postgres
DB_PASSWORD=postgres      # Troque para uma senha forte em produção
DB_NAME=escala_ft
DB_PORT=5432

# Servidor e Aplicação
PORT=3001
NODE_ENV=production

# Assinatura Criptográfica JWT (OBRIGATÓRIO ALTERAR EM PRODUÇÃO)
JWT_SECRET=chave_secreta_longa_e_aleatoria_com_mais_de_64_caracteres_hex_2026
```

### 2.2. Frontend (`frontend/.env`)
```env
# URL base da API consumida pelo navegador
VITE_API_URL=http://localhost:3001
```

---

## 3. Procedimento de Inicialização

### 3.1. Inicialização via Docker Compose (Produção / Staging)

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/Rafael-MMendes/GSVR.git
   cd GSVR
   ```

2. **Subir os Containers com Build**:
   ```bash
   # Ambiente de Desenvolvimento / Testes:
   docker compose up --build -d

   # Ou Ambiente de Produção com Hot Reload e Volumes Mapeados:
   docker compose -f docker-compose.prod.yml up --build -d
   ```

3. **Verificar a Saúde dos Serviços**:
   ```bash
   docker compose ps
   ```
   Todos os quatro serviços (`backend`, `frontend`, `postgres`, `pgadmin`) devem constar com o status `Up` ou `running`.

4. **Acompanhar Logs em Tempo Real**:
   ```bash
   docker compose logs -f backend
   ```

---

### 3.2. Inicialização em Ambiente Windows (Sem Docker)

O repositório disponibiliza scripts em lote automáticos (`.bat`) na raiz:

1. **Inicializar Todo o Sistema**:
   - Dê um duplo clique no arquivo [iniciar-sistema.bat](file:///iniciar-sistema.bat).
   - O script verifica as dependências, executa `npm install` caso necessário e abre dois terminais simultâneos para o backend e frontend.
2. **Encerrar a Execução**:
   - Dê um duplo clique no arquivo [encerrar-sistema.bat](file:///encerrar-sistema.bat).
   - O script localiza e encerra todos os processos Node.js ativos nas portas do sistema.

---

## 4. Provisionamento Inicial e Migração de Dados

### 4.1. Execução de Migrações SQL
O sistema possui rotinas automáticas de migração no `backend/db.js`. Para aplicar migrações estruturais adicionais manualmente:
```bash
# Executar a migração de autenticação por CPF e perfil superusuário:
docker compose exec -T postgres psql -U postgres -d escala_ft < backend/migrations/001_auth_cpf_superuser.sql
```

### 4.2. Carga Inicial de Dados (Seed)
Para criar as subunidades iniciais da OPM, papéis RBAC e feriados operacionais:
```bash
cd backend
npm run seed
```

### 4.3. Provisionamento do Primeiro Superusuário (Desenvolvedor)
Para garantir acesso administrativo técnico imediato:
```bash
node backend/scripts/provision_superuser.js create \
  --nome "Administrador do Batalhão" \
  --cpf "00000000000" \
  --matricula "DEV_ADMIN" \
  --password "Senha@Segura2026"
```

---

## 5. Rotinas de Backup e Recuperação (Disaster Recovery)

### 5.1. Backup Completo do Banco de Dados
Recomenda-se agendar um dump diário do PostgreSQL via cron job ou agendador de tarefas:
```bash
# Backup em formato binário comprimido com timestamp:
docker compose exec -T postgres pg_dump -U postgres -F c escala_ft > "backup_escala_ft_$(date +%Y%m%d_%H%M%S).backup"
```

### 5.2. Restauração de Backup
Em caso de migração de servidor ou corrupção de dados:
```bash
# 1. Parar a API para evitar escritas concorrentes:
docker compose stop backend

# 2. Restaurar o snapshot:
docker compose exec -T postgres pg_restore -U postgres -d escala_ft --clean --if-exists < backup_escala_ft_YYYYMMDD_HHMMSS.backup

# 3. Reiniciar a API:
docker compose start backend
```

---

## 6. Solução de Problemas Comuns (Troubleshooting)

### 6.1. Conflito de Portas no Host (`EADDRINUSE`)
- **Sintoma:** O backend falha ao iniciar com erro `Port 3001 already in use` ou o Vite avisa sobre a porta `5173`.
- **Solução:**
  - No Windows, encerre processos órfãos via [encerrar-sistema.bat](file:///encerrar-sistema.bat) ou via terminal:
    ```powershell
    Get-Process node | Stop-Process -Force
    ```
  - Verifique se outro serviço não está utilizando a porta com `netstat -ano | findstr :3001`.

### 6.2. Falha de Conexão com o Banco (`ECONNREFUSED` no PostgreSQL)
- **Sintoma:** O backend exibe `[DB] Retrying connection...`.
- **Causa:** O container do PostgreSQL ainda está finalizando o setup dos volumes no primeiro arranque.
- **Comportamento:** O `backend/db.js` já possui retry automático programado para 5 tentativas com backoff exponencial. Se persistir, verifique as credenciais no `.env` e confirme se o container do banco está ativo com `docker compose logs postgres`.

### 6.3. Desbloqueio Emergencial de Usuário
- **Sintoma:** Um comandante ou operador teve a conta bloqueada após 5 tentativas incorretas de senha e não há outros administradores disponíveis.
- **Solução via CLI:**
  ```bash
  # Executar script de reset seguro via terminal do servidor:
  node backend/scripts/provision_superuser.js reset-password --cpf "05626561463" --password "NovaSenha@Temporaria2026"
  ```
