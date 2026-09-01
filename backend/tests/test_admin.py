from tests.conftest import auth_header


def test_admin_profile_reports_role_for_admin_and_staff(client, admin_account, staff_account):
    r = client.get("/api/admin/profile", headers=auth_header(admin_account.firebase_uid))
    assert r.status_code == 200
    assert r.json()["role"] == "ADMIN"

    r = client.get("/api/admin/profile", headers=auth_header(staff_account.firebase_uid))
    assert r.status_code == 200
    assert r.json()["role"] == "STAFF"


def test_admin_profile_rejects_non_admin(client, parent):
    r = client.get("/api/admin/profile", headers=auth_header(parent.firebase_uid))
    assert r.status_code == 403


def test_non_admin_cannot_access_admin_dashboard(client, parent):
    r = client.get("/api/admin/dashboard", headers=auth_header(parent.firebase_uid))
    assert r.status_code == 403


def test_staff_cannot_access_dashboard_or_manage_products(client, staff_account, catalog):
    headers = auth_header(staff_account.firebase_uid)
    r = client.get("/api/admin/dashboard", headers=headers)
    assert r.status_code == 403

    r = client.post("/api/admin/products", json={"product_id": "NEW", "name": "New", "category": "ITEM", "price": 10, "stock": 1}, headers=headers)
    assert r.status_code == 403

    r = client.put("/api/admin/bundles/BUNDLE-1", json={"price": 999}, headers=headers)
    assert r.status_code == 403


def test_staff_can_view_and_update_orders(client, staff_account, parent, catalog):
    checkout = client.post(
        "/api/orders",
        json={"items": [{"product_id": "MEAL", "quantity": 1}], "parent_name": "Maria", "contact_number": "0917", "payment_method": "gcash"},
        headers=auth_header(parent.firebase_uid),
    )
    order_id = checkout.json()["order_id"]

    headers = auth_header(staff_account.firebase_uid)
    r = client.get("/api/admin/orders", headers=headers)
    assert r.status_code == 200
    assert any(o["order_id"] == order_id for o in r.json())

    r = client.put(f"/api/admin/orders/{order_id}", json={"payment_status": "PAID"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["payment_status"] == "PAID"


def test_admin_dashboard_reflects_real_orders(client, admin_account, parent, catalog):
    client.post(
        "/api/orders",
        json={"items": [{"product_id": "MEAL", "quantity": 2}], "parent_name": "Maria", "contact_number": "0917", "payment_method": "gcash"},
        headers=auth_header(parent.firebase_uid),
    )
    r = client.get("/api/admin/dashboard", headers=auth_header(admin_account.firebase_uid))
    assert r.status_code == 200
    body = r.json()
    assert body["total_orders"] == 1
    assert body["total_revenue"] == 300.0
    assert body["total_items_sold"] == 2


def test_fulfillment_ready_then_claimed_then_duplicate_claim_rejected(client, admin_account, staff_account, parent, catalog):
    checkout = client.post(
        "/api/orders",
        json={"items": [{"product_id": "MEAL", "quantity": 1}], "parent_name": "Maria", "contact_number": "0917", "payment_method": "gcash"},
        headers=auth_header(parent.firebase_uid),
    )
    order_id = checkout.json()["order_id"]
    admin_headers = auth_header(admin_account.firebase_uid)
    staff_headers = auth_header(staff_account.firebase_uid)

    r = client.put(f"/api/admin/orders/{order_id}", json={"fulfillment_status": "READY"}, headers=admin_headers)
    assert r.status_code == 200 and r.json()["fulfillment_status"] == "READY"

    r = client.put(f"/api/admin/orders/{order_id}", json={"fulfillment_status": "CLAIMED"}, headers=staff_headers)
    assert r.status_code == 200
    assert r.json()["fulfillment_status"] == "CLAIMED"
    assert r.json()["claimed_by"] == "Sam Reyes"

    r = client.put(f"/api/admin/orders/{order_id}", json={"fulfillment_status": "CLAIMED"}, headers=staff_headers)
    assert r.status_code == 409


def test_order_lookup_by_id_name_email_phone(client, admin_account, parent, catalog):
    checkout = client.post(
        "/api/orders",
        json={"items": [{"product_id": "MEAL", "quantity": 1}], "parent_name": "Maria", "contact_number": "0917", "payment_method": "gcash"},
        headers=auth_header(parent.firebase_uid),
    )
    order_id = checkout.json()["order_id"]
    headers = auth_header(admin_account.firebase_uid)

    for query in [order_id, "Maria Dela Cruz", "maria@example.test", "09171234567"]:
        r = client.get("/api/admin/orders/search", params={"q": query}, headers=headers)
        assert r.status_code == 200, query
        assert any(o["order_id"] == order_id for o in r.json()), query


def test_admin_can_manage_products_and_bundles(client, admin_account, catalog):
    headers = auth_header(admin_account.firebase_uid)
    r = client.put("/api/admin/products/MEAL", json={"price": 175.0}, headers=headers)
    assert r.status_code == 200 and r.json()["price"] == 175.0

    r = client.delete("/api/admin/products/WATER", headers=headers)
    assert r.status_code == 200 and r.json()["active"] is False

    r = client.put("/api/admin/bundles/BUNDLE-1", json={"price": 140.0}, headers=headers)
    assert r.status_code == 200 and r.json()["price"] == 140.0

    r = client.get("/api/admin/audit-log", headers=headers)
    assert r.status_code == 200
    actions = {e["action"] for e in r.json()}
    assert {"UPDATE_PRODUCT", "DEACTIVATE_PRODUCT", "UPDATE_BUNDLE"}.issubset(actions)


def test_negative_price_and_stock_are_rejected(client, admin_account, catalog):
    headers = auth_header(admin_account.firebase_uid)

    r = client.post(
        "/api/admin/products",
        json={"product_id": "NEG-1", "name": "Negative", "category": "ITEM", "price": -5, "stock": 10},
        headers=headers,
    )
    assert r.status_code == 422

    r = client.post(
        "/api/admin/products",
        json={"product_id": "NEG-2", "name": "Negative", "category": "ITEM", "price": 5, "stock": -10},
        headers=headers,
    )
    assert r.status_code == 422

    r = client.put("/api/admin/products/MEAL", json={"price": -1}, headers=headers)
    assert r.status_code == 422

    r = client.put("/api/admin/products/MEAL", json={"stock": -1}, headers=headers)
    assert r.status_code == 422

    r = client.put("/api/admin/products/VINTA/variants", json={"variant": "M", "stock": -3}, headers=headers)
    assert r.status_code == 422

    r = client.put("/api/admin/bundles/BUNDLE-1", json={"price": -10}, headers=headers)
    assert r.status_code == 422

    r = client.post(
        "/api/admin/bundles",
        json={"bundle_id": "NEG-BUNDLE", "name": "Negative", "price": -1, "items": [{"product_id": "MEAL", "quantity": 1}]},
        headers=headers,
    )
    assert r.status_code == 422

    r = client.post(
        "/api/admin/bundles",
        json={"bundle_id": "NEG-BUNDLE-2", "name": "Negative Qty", "price": 10, "items": [{"product_id": "MEAL", "quantity": 0}]},
        headers=headers,
    )
    assert r.status_code == 422
