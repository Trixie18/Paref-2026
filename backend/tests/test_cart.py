from tests.conftest import auth_header


def test_cart_calculation_totals_products_and_bundles(client, parent, catalog):
    body = [
        {"product_id": "VINTA", "quantity": 2, "variant": "S"},
        {"bundle_id": "BUNDLE-1", "quantity": 1},
    ]
    r = client.post("/api/cart/calculate", json=body, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 200
    data = r.json()
    assert data["total_amount"] == 2 * 550.0 + 150.0
    assert len(data["lines"]) == 2


def test_cart_rejects_missing_variant_for_shirt(client, parent, catalog):
    r = client.post("/api/cart/calculate", json=[{"product_id": "VINTA", "quantity": 1}], headers=auth_header(parent.firebase_uid))
    assert r.status_code == 422


def test_cart_rejects_invalid_variant(client, parent, catalog):
    r = client.post("/api/cart/calculate", json=[{"product_id": "VINTA", "quantity": 1, "variant": "XXL"}], headers=auth_header(parent.firebase_uid))
    assert r.status_code == 422


def test_cart_ignores_client_submitted_price(client, parent, catalog):
    body = [{"product_id": "MEAL", "quantity": 1, "price": 1.0}]
    r = client.post("/api/cart/calculate", json=body, headers=auth_header(parent.firebase_uid))
    assert r.status_code == 200
    assert r.json()["lines"][0]["unit_price"] == 150.0
