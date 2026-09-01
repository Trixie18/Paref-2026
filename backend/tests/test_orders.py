from tests.conftest import auth_header


def checkout_body(items, **overrides):
    body = {
        "items": items,
        "parent_name": "Maria Dela Cruz",
        "contact_number": "09171234567",
        "payment_method": "gcash",
        "notes": "",
    }
    body.update(overrides)
    return body


def test_checkout_creates_order_with_authoritative_total(client, parent, catalog):
    body = checkout_body([
        {"product_id": "VINTA", "quantity": 1, "variant": "S"},
        {"bundle_id": "BUNDLE-1", "quantity": 2},
    ])
    r = client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 201
    order = r.json()
    assert order["order_id"].startswith("ORD-")
    assert order["total_amount"] == 550.0 + 2 * 150.0
    assert order["payment_status"] == "PENDING"
    assert order["fulfillment_status"] == "PENDING"
    assert len(order["items"]) == 2


def test_checkout_decrements_shirt_variant_and_bundle_component_stock(client, parent, catalog, repo):
    body = checkout_body([
        {"product_id": "VINTA", "quantity": 2, "variant": "S"},
        {"bundle_id": "BUNDLE-1", "quantity": 3},
    ])
    r = client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 201

    variants = {v.variant: v.stock for v in repo.get_product_variants("VINTA")}
    assert variants["S"] == 5 - 2

    meal = repo.get_product("MEAL")
    water = repo.get_product("WATER")
    assert meal.stock == 10 - 3
    assert water.stock == 3 - 3


def test_checkout_rejects_insufficient_bundle_component_stock(client, parent, catalog):
    # WATER only has 3 in stock; 4x Bundle 1 needs 4 units of water.
    body = checkout_body([{"bundle_id": "BUNDLE-1", "quantity": 4}])
    r = client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 409
    assert "Water" in r.json()["detail"]


def test_checkout_rejects_insufficient_shirt_size_stock(client, parent, catalog):
    body = checkout_body([{"product_id": "VINTA", "quantity": 10, "variant": "M"}])  # only 2 in stock
    r = client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 409


def test_out_of_stock_checkout_does_not_touch_inventory(client, parent, catalog, repo):
    body = checkout_body([{"product_id": "VINTA", "quantity": 10, "variant": "M"}])
    client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    variants = {v.variant: v.stock for v in repo.get_product_variants("VINTA")}
    assert variants["M"] == 2  # unchanged


def test_checkout_rejects_empty_cart(client, parent, catalog):
    r = client.post("/api/orders", json=checkout_body([]), headers=auth_header(parent.firebase_uid))
    assert r.status_code == 422


def test_duplicate_checkout_with_same_idempotency_key_returns_same_order(client, parent, catalog, repo):
    body = checkout_body([{"product_id": "MEAL", "quantity": 1}], idempotency_key="click-1")
    r1 = client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    r2 = client.post("/api/orders", json=body, headers=auth_header(parent.firebase_uid))
    assert r1.status_code == 201 and r2.status_code == 201
    assert r1.json()["order_id"] == r2.json()["order_id"]
    # stock should only have been decremented once
    assert repo.get_product("MEAL").stock == 9


def test_user_only_sees_own_orders(client, parent, other_parent, catalog):
    client.post("/api/orders", json=checkout_body([{"product_id": "MEAL", "quantity": 1}]), headers=auth_header(parent.firebase_uid))

    r = client.get("/api/orders", headers=auth_header(other_parent.firebase_uid))
    assert r.status_code == 200
    assert r.json() == []

    r = client.get("/api/orders", headers=auth_header(parent.firebase_uid))
    assert len(r.json()) == 1


def test_cannot_view_another_users_order(client, parent, other_parent, catalog):
    r = client.post("/api/orders", json=checkout_body([{"product_id": "MEAL", "quantity": 1}]), headers=auth_header(parent.firebase_uid))
    order_id = r.json()["order_id"]

    r = client.get(f"/api/orders/{order_id}", headers=auth_header(other_parent.firebase_uid))
    assert r.status_code == 404
