from tests.conftest import auth_header


def test_create_and_list_players(client, parent):
    headers = auth_header(parent.firebase_uid)
    r = client.post("/api/players", json={"player_name": "Miguel Dela Cruz", "team": "Blue", "age_group": "U12", "jersey_number": "7"}, headers=headers)
    assert r.status_code == 201
    assert r.json()["user_id"] == parent.user_id

    r = client.get("/api/players", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["player_name"] == "Miguel Dela Cruz"


def test_player_name_required(client, parent):
    r = client.post("/api/players", json={"player_name": "  ", "team": "Blue", "age_group": "U12", "jersey_number": "7"}, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 422


def test_parent_cannot_access_another_parents_player(client, parent, other_parent):
    headers = auth_header(parent.firebase_uid)
    r = client.post("/api/players", json={"player_name": "Miguel", "team": "Blue", "age_group": "U12", "jersey_number": "7"}, headers=headers)
    player_id = r.json()["player_id"]

    other_headers = auth_header(other_parent.firebase_uid)
    r = client.get(f"/api/players/{player_id}", headers=other_headers)
    assert r.status_code == 403

    r = client.put(f"/api/players/{player_id}", json={"team": "Red"}, headers=other_headers)
    assert r.status_code == 403


def test_update_player(client, parent):
    headers = auth_header(parent.firebase_uid)
    r = client.post("/api/players", json={"player_name": "Sofia", "team": "Red", "age_group": "U10", "jersey_number": "14"}, headers=headers)
    player_id = r.json()["player_id"]

    r = client.put(f"/api/players/{player_id}", json={"jersey_number": "99"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["jersey_number"] == "99"
    assert r.json()["player_name"] == "Sofia"
