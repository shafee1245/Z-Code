from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "api"}


def test_qr_png_generation() -> None:
    response = client.post("/api/v1/qrcodes/png", json={"content": "https://example.com"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_qr_rejects_invalid_color() -> None:
    response = client.post("/api/v1/qrcodes/png", json={"content": "hello", "foreground": "green"})
    assert response.status_code == 422
