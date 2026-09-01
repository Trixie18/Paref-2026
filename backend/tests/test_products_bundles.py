from tests.conftest import auth_header


def test_list_products_only_returns_active(client, parent, catalog, repo):
    repo.update_product("WATER", active=False)
    headers = auth_header(parent.firebase_uid)
    r = client.get("/api/products", headers=headers)
    assert r.status_code == 200
    ids = {p["product_id"] for p in r.json()}
    assert "WATER" not in ids
    assert "VINTA" in ids and "MEAL" in ids


def test_get_product_includes_variants(client, parent, catalog):
    r = client.get("/api/products/VINTA", headers=auth_header(parent.firebase_uid))
    assert r.status_code == 200
    body = r.json()
    assert body["variant_required"] is True
    variants = {v["variant"]: v["stock"] for v in body["variants"]}
    assert variants == {"S": 5, "M": 2}


def test_get_missing_product_404(client, parent, catalog):
    r = client.get("/api/products/NOPE", headers=auth_header(parent.firebase_uid))
    assert r.status_code == 404


def test_list_bundles_resolves_items_and_price_from_sheet(client, parent, catalog):
    r = client.get("/api/bundles", headers=auth_header(parent.firebase_uid))
    assert r.status_code == 200
    bundles = {b["bundle_id"]: b for b in r.json()}
    bundle1 = bundles["BUNDLE-1"]
    assert bundle1["price"] == 150.0
    item_ids = {i["product_id"] for i in bundle1["items"]}
    assert item_ids == {"MEAL", "WATER"}
    # individual total (150 + 30 = 180) exceeds the bundle price (150) -> savings shown
    assert bundle1["individual_total"] == 180.0
    assert bundle1["savings"] == 30.0
