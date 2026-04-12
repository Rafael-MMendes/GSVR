# GSVR — Project Context

## Project Overview

**GSVR** (Gestão de Força Tarefa) is a military scheduling and workforce management system for the **9º BPM/PMAL** (9th Military Police Battalion of Alagoas). It enables administrators to plan shifts, manage personnel, track service cycles, and generate financial reports for task force operations.

The system features:
- **Drag-and-drop scheduling** interface for building patrol teams (guarnições)
- **Volunteer availability management** — soldiers declare availability per cycle, and the system enforces these constraints at the database level
- **Role-Based Access Control (RBAC)** with granular permissions (ADMIN, GERENTE, MILITAR roles)
- **Financial reporting** — tracks budget spend based on scheduled services
- **PDF/Excel export** capabilities
- **Cycle-based scheduling** — monthly operational periods with service quotas (max 8 services per soldier per cycle)

## Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express 5, pg, JWT auth, bcrypt |
| **Frontend** | React 18, Vite 6, dnd-kit, lucide-react, axios |
| **Database** | PostgreSQL 16 |
| **Infra** | Docker Compose, pgAdmin 4, Portainer |

### Key Backend Dependencies
`express`, `pg`, `bcrypt`, `jsonwebtoken`, `cors`, `dotenv`, `helmet`, `express-rate-limit`, `multer`, `pdf-parse`, `xlsx`

### Key Frontend Dependencies
`react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `axios`, `date-fns`, `lucide-react`, `html2canvas`, `jspdf`

### Database Schema (Normalized)
- **EFETIVO** — Military personnel data (matrícula, CPF, rank, war name)
- **OPM** — Police unit management
- **CICLOS** — Operational cycle periods
- **users** — System access accounts (linked to EFETIVO)
- **user_profiles**, **roles**, **permissions**, **user_roles**, **role_permissions** — RBAC module
- **password_reset_tokens**, **refresh_tokens** — Auth token management
- **REQUERIMENTOS** / **DISPONIBILIDADE** — Soldier availability per cycle
- **ESCALA_PLANEJAMENTO** — Scheduled patrol assignments
- **ESCALA_EFETIVO_SERVICO** — Ternary relationship linking planning to execution

## Directory Structure

```
GSVR/
├── backend/              # Node.js Express API
│   ├── server.js         # Main entry point
│   ├── db.js             # PostgreSQL connection & schema
│   ├── import_military.js    # Excel import script
│   ├── import_efetivo_excel.js
│   ├── create_users.js       # User creation script
│   ├── create_admin.js       # Admin creation script
│   ├── seed.js               # Database seeding
│   └── package.json
├── frontend/             # React + Vite web app
│   ├── src/              # Source code
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml        # Development stack
├── docker-compose.prod.yml   # Production stack (hot reload)
├── requirements.md           # Setup instructions
├── rbac_architecture.md      # RBAC design documentation
├── task.md                   # RBAC implementation task list
├── VERSION.md                # Changelog
├── iniciar-sistema.bat       # Windows launcher (no Docker)
└── encerrar-sistema.bat      # Windows stopper
```

## Building and Running

### Prerequisites
- Docker Desktop 24+
- Docker Compose v2
- Node.js 21+ (for local execution without Docker)
- npm 10+

### With Docker (Recommended)
```bash
# Development mode
docker compose up --build

# Production mode (hot reload)
docker compose -f docker-compose.prod.yml up --build
```

### Without Docker (Local)
```bash
# Backend
cd backend
npm install
npm run dev          # Starts with nodemon on port 3001

# Frontend
cd frontend
npm install
npm run dev          # Starts Vite dev server on port 5173
```

### Windows Batch Launchers
- `iniciar-sistema.bat` — Installs dependencies and starts both backend and frontend in separate windows
- `encerrar-sistema.bat` — Kills all Node.js processes

### Ports
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| pgAdmin | http://localhost:5050 |
| Portainer | http://localhost:9000 |

## Environment Variables

### Backend (`backend/.env` or `backend/.env.docker`)
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

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3001
```

## Backend Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Import military data | `npm run import` | Import from XLS |
| Import efetivo Excel | `npm run import-efetivo` | Import from Excel |
| Create users | `npm run users` | Batch user creation |
| Seed database | `npm run seed` | Run seed data |

## Development Conventions

### API Patterns
- RESTful endpoints under `/api` prefix
- Standard response format: `{ "success": true/false, "data": ..., "error": ... }`
- JWT authentication via Bearer token
- RBAC middleware (`authenticate`, `authorize`) on protected routes
- Rate limiting on auth endpoints (5/min for login, 15/min for password reset)

### Database
- Uses `CREATE TABLE IF NOT EXISTS` (no DROP TABLE on startup — preserves data)
- Foreign key constraints enforced at database level
- Triggers validate business rules (e.g., prevent scheduling soldiers without availability)
- Transactions (`BEGIN`/`COMMIT`) for atomic operations (planning + ternary relationships)
- `ON DELETE SET NULL` on scale links to preserve execution history

### Frontend
- React 18 with functional components and hooks
- Custom `useAuth` hook for JWT management and permission checking
- dnd-kit for drag-and-drop scheduling
- Protected routes with `ProtectedRoute` component
- Password strength indicator on profile page

### Security
- Passwords hashed with bcrypt (salt rounds ≥ 12)
- JWT access tokens (15min) + refresh tokens (7 days, stored in DB with SHA-256 hash)
- Progressive password migration — legacy plaintext passwords upgraded to bcrypt on first login
- Helmet.js for HTTP security headers
- Soft delete for user accounts (`deleted_at` + `status`)
- Audit logging for login events

## Key Business Rules

1. **Service Quota**: Maximum 8 services per soldier per cycle; soldiers at limit are hidden from the volunteer pool
2. **Availability Enforcement**: Database triggers prevent scheduling soldiers for shifts they didn't declare availability
3. **Manual Save**: Changes to schedules are kept in memory until the user explicitly clicks "Salvar" — no premature persistence
4. **Team Integrity**: Each role in a patrol (Comandante, Motorista, Patrulheiro) must have exactly one person; collision detection splits teams with duplicate roles
5. **History Preservation**: Deleting a planned schedule does not remove execution records (`ON DELETE SET NULL`)

## Current Version

**v1.20.2** (2026-04-12) — Latest fix: Removed premature persistence; schedule saving is now strictly manual.

See `VERSION.md` for the full changelog.

## Useful Notes

- `node_modules` lives in named Docker volumes to avoid host/dependency conflicts
- Database data persists in the `pgdata` volume
- `package-lock.json` is maintained to lock dependency versions
- The migration from the old flat schema to the normalized relational schema was completed with **zero** frontend changes — the backend provides a compatibility layer that transforms relational data into the legacy JSON format
