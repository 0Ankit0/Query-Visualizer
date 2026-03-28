from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    DialectsResponse,
    ExamplesResponse,
    ParseResponse,
    QueryExample,
    QueryRequest,
    ValidationResponse,
    VisualizationResponse,
)
from app.services.visualizer import SUPPORTED_DIALECTS, parse_query, validate_query, visualize_query

router = APIRouter(tags=["query-visualizer"])

EXAMPLES = [
    QueryExample(
        name="Top customers by order count",
        dialect="sql",
        query=(
            "SELECT c.name, COUNT(o.id) AS total_orders "
            "FROM customers c "
            "LEFT JOIN orders o ON o.customer_id = c.id "
            "WHERE o.created_at >= '2026-01-01' "
            "GROUP BY c.name "
            "HAVING COUNT(o.id) > 5 "
            "ORDER BY total_orders DESC "
            "LIMIT 10"
        ),
    ),
    QueryExample(
        name="PostgreSQL update with returning",
        dialect="postgres",
        query="UPDATE users SET last_login = NOW() WHERE id = 42 RETURNING id, last_login;",
    ),
]


@router.get("/dialects", response_model=DialectsResponse)
def list_dialects() -> DialectsResponse:
    return DialectsResponse(dialects=sorted(SUPPORTED_DIALECTS))


@router.get("/examples", response_model=ExamplesResponse)
def list_examples(dialect: str | None = Query(default=None)) -> ExamplesResponse:
    if dialect is None:
        return ExamplesResponse(examples=EXAMPLES)

    if dialect not in SUPPORTED_DIALECTS:
        raise HTTPException(status_code=400, detail="Only 'postgres' and 'sql' dialects are supported.")

    return ExamplesResponse(examples=[example for example in EXAMPLES if example.dialect == dialect])


@router.post("/validate", response_model=ValidationResponse)
def validate(payload: QueryRequest) -> ValidationResponse:
    if payload.dialect not in SUPPORTED_DIALECTS:
        raise HTTPException(status_code=400, detail="Only 'postgres' and 'sql' dialects are supported.")

    return validate_query(payload.query, payload.dialect)


@router.post("/parse", response_model=ParseResponse)
def parse(payload: QueryRequest) -> ParseResponse:
    if payload.dialect not in SUPPORTED_DIALECTS:
        raise HTTPException(status_code=400, detail="Only 'postgres' and 'sql' dialects are supported.")

    try:
        return parse_query(payload.query, payload.dialect)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/visualize", response_model=VisualizationResponse)
def visualize(payload: QueryRequest) -> VisualizationResponse:
    if payload.dialect not in SUPPORTED_DIALECTS:
        raise HTTPException(status_code=400, detail="Only 'postgres' and 'sql' dialects are supported.")

    try:
        return visualize_query(payload.query, payload.dialect)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
