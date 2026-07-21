# Bank Loan Document Verification MVP

Day 1 foundation from `bank-loan-verification-latest.md`.

## Day 1 Scope

- React + TypeScript + Vite frontend in `src/`.
- Express + JavaScript backend in `server/`.
- PostgreSQL schema in `database/schema.sql`.
- `POST /api/applications`.
- `GET /api/applications/:id`.
- Basic form to create and display a saved application.
- `lucide-react` icons for the UI.

Uploads, verification rules, RAG, MCP, AWS, and real customer data are intentionally not implemented on Day 1.

## Setup

Install dependencies:

```bash
npm install
```

Create local environment file:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d
```

Create tables:

```bash
npm run db:setup
```

Run type checks:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

Start frontend and backend together:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3000/api/health`
