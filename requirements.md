# Requirements

## Ambiente

- Docker Desktop 24+
- Docker Compose v2
- Node.js 21+ apenas para execucao local fora do Docker
- npm 10+
- Git

## Stack usada

- Backend: Node.js, Express, pg, bcrypt, cors, dotenv, helmet, jsonwebtoken, multer, pdf-parse, xlsx
- Backend dev: nodemon
- Frontend: Vite, React, axios, date-fns, dnd-kit, lucide-react, html2canvas, jspdf
- Infra: PostgreSQL 16, pgAdmin 4, Portainer

## Portas

- `3001` backend
- `5173` frontend
- `5050` pgAdmin
- `9000` Portainer

## Variaveis de ambiente

### Backend

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_PORT`
- `PORT`
- `NODE_ENV`
- `JWT_SECRET` opcional

### Frontend

- `VITE_API_URL`

### pgAdmin

- `PGADMIN_DEFAULT_EMAIL` no `docker-compose.yml`
- `PGADMIN_DEFAULT_PASSWORD` no `docker-compose.yml`
- `PGADMIN_EMAIL` no `docker-compose.prod.yml`
- `PGADMIN_PASS` no `docker-compose.prod.yml`

## Arquivos esperados

- `backend/.env` ou `backend/.env.docker`
- `frontend/.env`
- `package-lock.json` para travar versoes

### Exemplo `backend/.env`

```env
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=escala_ft
DB_PORT=5432
PORT=3001
NODE_ENV=development
JWT_SECRET=troque_esta_chave
```

### Exemplo `frontend/.env`

```env
VITE_API_URL=http://localhost:3001
```

## Como rodar

### Com Docker

```bash
docker compose up --build
```

### Sem Docker

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Observacoes

- `node_modules` fica em volume nomeado no Docker para evitar conflito com dependencias do host.
- O banco usa volume persistente em `pgdata`.
- Para outra maquina rodar sem surpresa, mantenha `package-lock.json` e os `.env` corretos.
