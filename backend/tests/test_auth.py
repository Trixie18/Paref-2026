from tests.conftest import auth_header


def test_register_creates_profile(client):
    r = client.post("/api/auth/register", json={"name": "New Parent", "phone": "09171112222"}, headers=auth_header("new-uid"))
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "New Parent"
    assert body["email"] == "new-uid@example.test"


def test_register_twice_is_rejected(client):
    headers = auth_header("dup-uid")
    client.post("/api/auth/register", json={"name": "A", "phone": "09171112222"}, headers=headers)
    r = client.post("/api/auth/register", json={"name": "A", "phone": "09171112222"}, headers=headers)
    assert r.status_code == 409


def test_get_profile_requires_registration(client):
    r = client.get("/api/auth/profile", headers=auth_header("unregistered-uid"))
    assert r.status_code == 401


def test_missing_token_is_unauthorized(client):
    r = client.get("/api/auth/profile")
    assert r.status_code == 401


def test_invalid_token_format_is_unauthorized(client):
    r = client.get("/api/auth/profile", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


def test_get_and_update_profile(client, parent):
    r = client.get("/api/auth/profile", headers=auth_header(parent.firebase_uid))
    assert r.status_code == 200
    assert r.json()["user_id"] == parent.user_id

    r = client.put("/api/auth/profile", json={"phone": "09990009999"}, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 200
    assert r.json()["phone"] == "09990009999"
