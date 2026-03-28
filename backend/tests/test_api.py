from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_dialects_endpoint() -> None:
    response = client.get("/api/v1/dialects")

    assert response.status_code == 200
    assert set(response.json()["dialects"]) == {"postgres", "sql"}


def test_validate_endpoint_valid_query() -> None:
    response = client.post(
        "/api/v1/validate",
        json={"dialect": "sql", "query": "SELECT * FROM users"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["is_valid"] is True
    assert payload["errors"] == []


def test_visualize_endpoint_returns_steps() -> None:
    response = client.post(
        "/api/v1/visualize",
        json={
            "dialect": "postgres",
            "query": "SELECT id FROM users WHERE id > 5 ORDER BY id DESC LIMIT 2",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["statement_type"] == "SELECT"
    assert len(payload["steps"]) >= 4


def test_examples_endpoint_filtered() -> None:
    response = client.get("/api/v1/examples?dialect=postgres")

    assert response.status_code == 200
    examples = response.json()["examples"]
    assert examples
    assert all(item["dialect"] == "postgres" for item in examples)
