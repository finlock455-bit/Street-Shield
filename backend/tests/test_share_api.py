"""Backend API tests for the new Find My Shield (live location share) endpoints.

Covers:
- POST /api/share/start (with and without location)
- POST /api/share/{token}/ping
- GET /api/share/{token} (and 404 for unknown)
- POST /api/share/{token}/stop (idempotent + 410 on subsequent ping)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Share session lifecycle ----------------
class TestShareSession:
    state = {}

    def test_start_share_without_location(self, client):
        r = client.post(f"{API}/share/start", json={"sender_name": "TEST_Alex"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["sender_name"] == "TEST_Alex"
        assert d["active"] is True
        assert d["last_location"] is None
        assert d["last_ping_at"] is None
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) >= 8
        assert "started_at" in d
        TestShareSession.state["token"] = d["token"]

    def test_start_share_with_initial_location(self, client):
        payload = {
            "sender_name": "TEST_With_Loc",
            "location": {"lat": 12.34, "lng": 56.78},
        }
        r = client.post(f"{API}/share/start", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["last_location"]["lat"] == 12.34
        assert d["last_location"]["lng"] == 56.78
        assert d["last_ping_at"] is not None

    def test_start_share_default_anonymous_when_blank(self, client):
        r = client.post(f"{API}/share/start", json={"sender_name": "   "})
        assert r.status_code == 200
        d = r.json()
        assert d["sender_name"] == "Anonymous"

    def test_get_share_returns_session(self, client):
        token = TestShareSession.state["token"]
        r = client.get(f"{API}/share/{token}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["token"] == token
        assert d["sender_name"] == "TEST_Alex"
        assert d["active"] is True

    def test_get_share_unknown_token_returns_404(self, client):
        r = client.get(f"{API}/share/this-token-does-not-exist")
        assert r.status_code == 404

    def test_ping_share_updates_location(self, client):
        token = TestShareSession.state["token"]
        payload = {"location": {"lat": 40.7128, "lng": -74.0060}}
        r = client.post(f"{API}/share/{token}/ping", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["last_location"]["lat"] == 40.7128
        assert d["last_location"]["lng"] == -74.0060
        assert d["last_ping_at"] is not None

        # Verify persistence via GET
        r2 = client.get(f"{API}/share/{token}")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["last_location"]["lat"] == 40.7128
        assert d2["last_location"]["lng"] == -74.0060

    def test_ping_share_unknown_token_returns_404(self, client):
        payload = {"location": {"lat": 1.0, "lng": 2.0}}
        r = client.post(f"{API}/share/no-such-token/ping", json=payload)
        assert r.status_code == 404

    def test_stop_share(self, client):
        token = TestShareSession.state["token"]
        r = client.post(f"{API}/share/{token}/stop")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["active"] is False
        assert d["stopped_at"] is not None

        # Verify persistence
        r2 = client.get(f"{API}/share/{token}")
        assert r2.status_code == 200
        assert r2.json()["active"] is False

    def test_ping_after_stop_returns_410(self, client):
        token = TestShareSession.state["token"]
        payload = {"location": {"lat": 1.1, "lng": 2.2}}
        r = client.post(f"{API}/share/{token}/ping", json=payload)
        assert r.status_code == 410, r.text

    def test_stop_unknown_token_returns_404(self, client):
        r = client.post(f"{API}/share/missing-token/stop")
        assert r.status_code == 404
