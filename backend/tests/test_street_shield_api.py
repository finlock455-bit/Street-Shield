"""Backend API tests for Street Shield app.

Covers:
- root health endpoint
- shield state singleton (GET / POST patch)
- contacts CRUD
- alerts (list + create with location)
- activity stats endpoint
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to read from frontend/.env
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


# ---------------- Root ----------------
class TestRoot:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "message" in data
        assert "Street Shield" in data["message"]


# ---------------- Shield state ----------------
class TestShieldState:
    def test_get_state_creates_singleton(self, client):
        r = client.get(f"{API}/shield/state")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["active", "voice_ai", "radar", "cycling", "quick_alert", "ai_audio", "updated_at"]:
            assert key in data, f"missing key {key}"
        assert isinstance(data["active"], bool)

    def test_patch_state_merges_and_persists(self, client):
        r = client.post(f"{API}/shield/state", json={"active": True, "cycling": True})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["active"] is True
        assert data["cycling"] is True
        # voice_ai should remain default True (not overwritten)
        assert data["voice_ai"] is True

        # Verify persistence via GET
        r2 = client.get(f"{API}/shield/state")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["active"] is True
        assert d2["cycling"] is True

    def test_patch_state_partial_does_not_reset_others(self, client):
        # set cycling=False only; active should stay True from prev test
        r = client.post(f"{API}/shield/state", json={"cycling": False})
        assert r.status_code == 200
        d = r.json()
        assert d["cycling"] is False
        assert d["active"] is True


# ---------------- Contacts ----------------
class TestContacts:
    created_id = None

    def test_list_contacts_initial(self, client):
        r = client.get(f"{API}/contacts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_contact_success(self, client):
        r = client.post(f"{API}/contacts", json={"name": "TEST_Bob", "phone": "555-0100"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Bob"
        assert d["phone"] == "555-0100"
        assert "id" in d and isinstance(d["id"], str)
        TestContacts.created_id = d["id"]

        # Verify persistence
        r2 = client.get(f"{API}/contacts")
        assert r2.status_code == 200
        ids = [c["id"] for c in r2.json()]
        assert d["id"] in ids

    def test_add_contact_blank_name(self, client):
        r = client.post(f"{API}/contacts", json={"name": "  ", "phone": "555"})
        assert r.status_code == 400

    def test_add_contact_blank_phone(self, client):
        r = client.post(f"{API}/contacts", json={"name": "X", "phone": ""})
        assert r.status_code == 400

    def test_delete_contact_success(self, client):
        cid = TestContacts.created_id
        assert cid, "previous test must have created a contact"
        r = client.delete(f"{API}/contacts/{cid}")
        assert r.status_code == 200
        assert r.json().get("deleted") is True

        # Verify deletion
        r2 = client.get(f"{API}/contacts")
        ids = [c["id"] for c in r2.json()]
        assert cid not in ids

    def test_delete_contact_not_found(self, client):
        r = client.delete(f"{API}/contacts/does-not-exist-uuid")
        assert r.status_code == 404


# ---------------- Alerts ----------------
class TestAlerts:
    def test_list_alerts(self, client):
        r = client.get(f"{API}/alerts")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_alert_with_location(self, client):
        payload = {
            "type": "SOS",
            "message": "TEST_emergency",
            "location": {"lat": 37.7749, "lng": -122.4194},
        }
        r = client.post(f"{API}/alerts", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "SOS"
        assert d["message"] == "TEST_emergency"
        assert d["location"]["lat"] == 37.7749
        assert d["location"]["lng"] == -122.4194
        assert "id" in d
        assert "created_at" in d

        # Verify it's listed (descending order — newest first)
        r2 = client.get(f"{API}/alerts")
        assert r2.status_code == 200
        alerts = r2.json()
        assert len(alerts) > 0
        assert alerts[0]["id"] == d["id"]

    def test_create_alert_without_location(self, client):
        r = client.post(f"{API}/alerts", json={})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "SOS"
        assert d["message"] == "Emergency dispatch"
        assert d["location"] is None


# ---------------- Activity ----------------
class TestActivity:
    def test_get_activity_shape(self, client):
        r = client.get(f"{API}/activity")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["steps", "distance_km", "active_minutes", "safe_routes", "last_scan_location"]:
            assert k in d
        assert isinstance(d["steps"], int)
        assert isinstance(d["distance_km"], float)
        assert isinstance(d["active_minutes"], int)
        assert isinstance(d["safe_routes"], int)
        assert d["steps"] >= 6420
