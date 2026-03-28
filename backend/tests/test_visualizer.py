from app.services.visualizer import parse_query, validate_query, visualize_query


def test_select_visualization_order() -> None:
    query = """
    SELECT c.name, COUNT(o.id) AS total_orders
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE o.created_at >= DATE '2026-01-01'
    GROUP BY c.name
    HAVING COUNT(o.id) > 5
    ORDER BY total_orders DESC
    LIMIT 10 OFFSET 5
    """

    result = visualize_query(query, "postgres")

    step_titles = [step.title for step in result.steps]
    assert step_titles == [
        "Select source relations",
        "Join related data",
        "Filter rows",
        "Group rows",
        "Filter groups",
        "Project final columns",
        "Sort rows",
        "Paginate result",
    ]


def test_postgres_returning_supported() -> None:
    query = "UPDATE users SET name = 'Ava' WHERE id = 7 RETURNING id, name"

    result = visualize_query(query, "postgres")

    assert result.statement_type == "UPDATE"
    assert any(step.title == "Return affected rows" for step in result.steps)


def test_parse_query_returns_statement_type() -> None:
    result = parse_query("DELETE FROM users WHERE id = 8", "sql")

    assert result.statement_type == "DELETE"
    assert "DELETE FROM" in result.ast_sql


def test_validate_query_catches_invalid_sql() -> None:
    result = validate_query("SELECT FROM", "sql")

    assert result.is_valid is False
    assert result.errors


def test_invalid_visualize_sql_raises_helpful_error() -> None:
    try:
        visualize_query("SELECT FROM", "sql")
    except ValueError as exc:
        assert "Could not parse SQL query" in str(exc)
    else:
        raise AssertionError("Expected parse failure for invalid SQL")
