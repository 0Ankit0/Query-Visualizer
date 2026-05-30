# Query Visualizer

A full-stack SQL learning tool with:
- **FastAPI backend APIs** for dialect discovery, query examples, validation, parsing, PostgreSQL `EXPLAIN ANALYZE`, and execution visualization.
- **React + Vite frontend UI** that calls all backend APIs and shows step-by-step query execution for new users.
- Support for **PostgreSQL** and **PostgreSQL-compatible SQL**.

## Project structure

- `backend/` — FastAPI backend (`/api/v1/*`).
- `frontend/` — Vite frontend.
- `backend/seed/postgres_seed.sql` — reusable QA/demo seed dataset.
- `docs/qa-playbook.md` — manual QA workflows and endpoint checklist.

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Backend API surface

Base URL: `http://localhost:8000/api/v1`

- `GET /dialects` — supported dialect list.
- `GET /examples?dialect=postgres|sql` — starter queries.
- `POST /validate` — syntax validity + normalized SQL.
- `POST /parse` — normalized SQL + statement type + compact AST SQL.
- `POST /explain` — PostgreSQL `EXPLAIN ANALYZE` summary + plan tree/tips.
- `POST /visualize` — ordered educational execution steps.

POST body shape:

```json
{
  "dialect": "postgres",
  "query": "SELECT * FROM users LIMIT 5;"
}
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Optional API base URL override:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Open: `http://localhost:5173`

## User flow in frontend

1. Select dialect (loaded from `GET /dialects`).
2. Optionally load a query example from `GET /examples`.
3. Submit once to call `POST /validate`, `POST /parse`, and `POST /visualize` in parallel.
4. Review PostgreSQL `EXPLAIN ANALYZE` plan tree, summary, and optimization tips.
5. Review:
   - validity and normalized SQL,
   - statement type + compact AST SQL,
  - step-by-step visualization cards with clause-level focus,
  - plan-based visualization signals from `EXPLAIN ANALYZE`.

## Seed data for QA

```bash
psql "$QUERY_VISUALIZER_POSTGRES_DSN" -f backend/seed/postgres_seed.sql
```

## QA playbook

See `docs/qa-playbook.md` for endpoint-level checks and frontend workflow testing.

## Run tests

```bash
cd backend
pytest
```
