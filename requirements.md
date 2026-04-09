# Requirements

## Ambiente

- Docker Desktop 24+
- Docker Compose v2
- Node.js 21+ para execucao local fora do Docker
- npm 10+
- Git

## Portas

- `3001` backend
- `5173` frontend
- `5050` pgAdmin
- `9000` Portainer

## Variaveis de ambiente

- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PGADMIN_EMAIL`
- `PGADMIN_PASS`
- `VITE_API_URL`

### Exemplo backend/.env

```env
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=escala_ft
DB_PORT=5432
PORT=3001
NODE_ENV=development
```

### Exemplo frontend/.env

```env
VITE_API_URL=http://localhost:3001
```

## Subida local

```bash
docker compose up --build
```

Para usar o ambiente com bind mount e hot reload:

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Observacoes

- O projeto usa bind mount no desenvolvimento para permitir trabalho simultaneo de multiplos devs.
- `node_modules` fica em volume nomeado para evitar conflito com dependencias do host.
- O ambiente de producao deve manter imagens buildadas, sem bind mount.
