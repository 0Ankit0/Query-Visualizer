# QA Playbook

## Scope
This project currently has:
- One frontend page at `/` (query visualizer).
- No login or role-based dashboards in the implemented codebase.

The workflows below cover all existing frontend features and backend endpoints.

## Prerequisites
1. Start PostgreSQL and create a database.
2. Seed sample data:
   - `psql "$QUERY_VISUALIZER_POSTGRES_DSN" -f backend/seed/postgres_seed.sql`
3. Start backend:
   - `cd backend`
   - `python -m venv .venv312`
   - `source .venv312/bin/activate`
   - `pip install fastapi uvicorn pydantic sqlglot psycopg[binary]`
   - `export QUERY_VISUALIZER_POSTGRES_DSN="postgresql://postgres:postgres@localhost:5432/query_visualizer"`
   - `uvicorn app.main:app --reload`
4. Start frontend:
   - `cd frontend`
   - `npm install`
  - `VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev`

## Endpoint Regression Checklist
Run these with backend running:

1. Health check
```bash
curl -s http://localhost:8000/health
```
Expected:
- `{"status":"ok"}`

2. Dialects
```bash
curl -s http://localhost:8000/api/v1/dialects
```
Expected:
- includes `postgres` and `sql`

3. Examples
```bash
curl -s "http://localhost:8000/api/v1/examples?dialect=postgres"
```
Expected:
- array of PostgreSQL-compatible examples

4. Validate
```bash
curl -s -X POST http://localhost:8000/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres","query":"SELECT * FROM users LIMIT 5;"}'
```
Expected:
- `is_valid=true`

5. Parse
```bash
curl -s -X POST http://localhost:8000/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres","query":"SELECT id,name FROM users ORDER BY id DESC LIMIT 2;"}'
```
Expected:
- `statement_type=SELECT`

6. Explain
```bash
curl -s -X POST http://localhost:8000/api/v1/explain \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres","query":"SELECT c.name, COUNT(o.id) AS total_orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.name ORDER BY total_orders DESC LIMIT 10;"}'
```
Expected:
- `explain_analysis.available=true` when DSN and tables are valid
- `plan_lines` populated

7. Visualize
```bash
curl -s -X POST http://localhost:8000/api/v1/visualize \
  -H "Content-Type: application/json" \
  -d '{"dialect":"postgres","query":"UPDATE users SET last_login = NOW() WHERE id = 1 RETURNING id,last_login;"}'
```
Expected:
- includes ordered steps and `RETURNING` visualization
- includes `explain_analysis`

## Frontend Manual Workflow Checklist
1. Open `http://localhost:5173`.
2. Confirm dialect dropdown loads from API.
3. Choose a PostgreSQL example query.
4. Click `Validate + Parse + Explain + Visualize`.
5. Confirm these sections render without errors:
   - Validation
   - Parse Details
   - PostgreSQL EXPLAIN ANALYZE
   - Query Flow Diagram
   - Step Breakdown
   - Notes
6. Paste invalid SQL (`SELECT FROM`) and verify error card appears.
7. Switch between `postgres` and `sql` dialect options and rerun.
8. Run a DML query with `RETURNING` and verify steps include `Return affected rows`.

## Role-Based Login/Dashboard Testing Note
Role login and multi-dashboard pages are not implemented in this repository today, so role switching test cases are currently not applicable.
If role-based access is added later, extend this playbook with:
- auth setup steps,
- role matrix,
- page permissions by role,
- negative authorization tests.
