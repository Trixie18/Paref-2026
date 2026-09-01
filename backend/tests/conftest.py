import os
from datetime import datetime, timezone

os.environ.setdefault("AUTH_BACKEND", "dev")
os.environ.setdefault("REPOSITORY_BACKEND", "memory")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Admin, Bundle, BundleItem, Product, User
from app.repositories import get_repository
from app.repositories.memory import InMemoryRepository

NOW = datetime.now(timezone.utc)


@pytest.fixture()
def repo() -> InMemoryRepository:
    return InMemoryRepository()


@pytest.fixture()
def client(repo):
    app.dependency_overrides[get_repository] = lambda: repo
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def auth_header(uid: str) -> dict:
    return {"Authorization": f"Bearer dev:{uid}"}


@pytest.fixture()
def parent(repo) -> User:
    return repo.create_user(
        User(user_id="", firebase_uid="parent-1", name="Maria Dela Cruz", email="maria@example.test", phone="09171234567", created_at=NOW, active=True)
    )


@pytest.fixture()
def other_parent(repo) -> User:
    return repo.create_user(
        User(user_id="", firebase_uid="parent-2", name="Jose Santos", email="jose@example.test", phone="09171234000", created_at=NOW, active=True)
    )


@pytest.fixture()
def admin_account(repo) -> Admin:
    return repo.create_admin(Admin(admin_id="", firebase_uid="admin-1", name="Dana Cruz", email="dana@example.test", role="ADMIN", active=True))


@pytest.fixture()
def staff_account(repo) -> Admin:
    return repo.create_admin(Admin(admin_id="", firebase_uid="staff-1", name="Sam Reyes", email="sam@example.test", role="STAFF", active=True))


@pytest.fixture()
def catalog(repo) -> dict:
    """A minimal, deterministic catalog: one shirt (2 sizes), two simple
    items, and one bundle made of those items — enough to exercise variant
    selection, plain-item purchases, and bundle-to-component resolution."""
    vinta = repo.create_product(
        Product(product_id="VINTA", name="Vinta Shirt (Blue)", description="Blue shirt", category="SHIRT",
                price=550.0, stock=0, active=True, image_url="", variant_required=True, created_at=NOW, updated_at=NOW)
    )
    repo.upsert_product_variant("VINTA", "S", 5)
    repo.upsert_product_variant("VINTA", "M", 2)

    meal = repo.create_product(
        Product(product_id="MEAL", name="Meal Stub", description="Meal", category="ITEM",
                price=150.0, stock=10, active=True, image_url="", variant_required=False, created_at=NOW, updated_at=NOW)
    )
    water = repo.create_product(
        Product(product_id="WATER", name="Water", description="Water", category="ITEM",
                price=30.0, stock=3, active=True, image_url="", variant_required=False, created_at=NOW, updated_at=NOW)
    )

    bundle = repo.create_bundle(
        Bundle(bundle_id="BUNDLE-1", name="Bundle 1", description="Meal + Water", price=150.0,
               active=True, created_at=NOW, updated_at=NOW)
    )
    repo.set_bundle_items("BUNDLE-1", [
        BundleItem(bundle_id="BUNDLE-1", product_id="MEAL", quantity=1),
        BundleItem(bundle_id="BUNDLE-1", product_id="WATER", quantity=1),
    ])

    return {"vinta": vinta, "meal": meal, "water": water, "bundle": bundle}
