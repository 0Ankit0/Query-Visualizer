# Query Visualizer

A full-stack SQL learning tool with:
- **FastAPI backend APIs** for dialect discovery, query examples, validation, parsing, and execution visualization.
- **Next.js frontend UI** that calls all backend APIs and shows step-by-step query execution for new users.
- Support for **PostgreSQL** and **generic SQL**.

## Project structure

- `backend/` — FastAPI backend (`/api/v1/*`).
- `frontend/` — Next.js frontend.

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
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Open: `http://localhost:3000`

## User flow in frontend

1. Select dialect (loaded from `GET /dialects`).
2. Optionally load a query example from `GET /examples`.
3. Submit once to call `POST /validate`, `POST /parse`, and `POST /visualize` in parallel.
4. Review:
   - validity and normalized SQL,
   - statement type + compact AST SQL,
   - step-by-step visualization cards with clause-level focus.

## Run tests

```bash
cd backend
pytest
```
