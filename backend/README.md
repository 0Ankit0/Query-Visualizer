# Backend (FastAPI)

## Setup

```bash
python3.12 -m venv .venv312
source .venv312/bin/activate
pip install fastapi==0.116.1 uvicorn[standard]==0.35.0 pydantic==2.11.7 sqlglot==27.19.0 psycopg[binary]==3.2.9 pytest==8.4.2 httpx==0.28.1
```

## Environment

Set the PostgreSQL DSN used for `EXPLAIN ANALYZE`:

```bash
export QUERY_VISUALIZER_POSTGRES_DSN="postgresql://postgres:postgres@localhost:5432/query_visualizer"
```

If this variable is not set, the API still returns visualizations but `explain_analysis.available` is `false` with guidance.

## Run

```bash
uvicorn app.main:app --reload
```

## Seed data

```bash
psql "$QUERY_VISUALIZER_POSTGRES_DSN" -f seed/postgres_seed.sql
```

## API endpoints

- `GET /api/v1/dialects`
- `GET /api/v1/examples`
- `POST /api/v1/validate`
- `POST /api/v1/parse`
- `POST /api/v1/explain`
- `POST /api/v1/visualize`
