"""In-memory Repository implementation.

Used for local development without Google credentials and for the test
suite. Implements the exact same interface as GoogleSheetsRepository so
services never know which backend they are talking to. A single
threading.Lock stands in for the "reasonable safeguard around concurrent
writes" the Google Sheets backend needs for real (see google_sheets.py and
the README for why Sheets itself cannot offer real transactions).
"""

import threading
from datetime import datetime, timezone
from typing import Optional

from app.core.errors import NotFoundError
from app.models import (
    Admin,
    AuditLogEntry,
    Bundle,
    BundleItem,
    Order,
    OrderItem,
    Player,
    Product,
    ProductVariant,
    User,
)
from app.repositories.base import Repository


class InMemoryRepository(Repository):
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._users: dict[str, User] = {}
        self._players: dict[str, Player] = {}
        self._products: dict[str, Product] = {}
        self._variants: dict[tuple[str, str], ProductVariant] = {}
        self._bundles: dict[str, Bundle] = {}
        self._bundle_items: dict[str, list[BundleItem]] = {}
        self._orders: dict[str, Order] = {}
        self._order_items: dict[str, list[OrderItem]] = {}
        self._admins: dict[str, Admin] = {}
        self._audit_log: list[AuditLogEntry] = []
        self._counters: dict[str, int] = {}
        self._order_seq: dict[int, int] = {}

    def _next_id(self, prefix: str, width: int = 6) -> str:
        with self._lock:
            self._counters[prefix] = self._counters.get(prefix, 0) + 1
            return f"{prefix}-{self._counters[prefix]:0{width}d}"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    # -- Users -----------------------------------------------------------
    def get_users(self) -> list[User]:
        return list(self._users.values())

    def get_user(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        return next((u for u in self._users.values() if u.firebase_uid == firebase_uid), None)

    def get_user_by_email(self, email: str) -> Optional[User]:
        email_lower = email.lower()
        return next((u for u in self._users.values() if u.email.lower() == email_lower), None)

    def create_user(self, user: User) -> User:
        with self._lock:
            if not user.user_id:
                user = user.model_copy(update={"user_id": self._next_id("USR")})
            self._users[user.user_id] = user
            return user

    def update_user(self, user_id: str, **fields) -> User:
        with self._lock:
            existing = self._users.get(user_id)
            if existing is None:
                raise NotFoundError(f"User {user_id} not found")
            updated = existing.model_copy(update=fields)
            self._users[user_id] = updated
            return updated

    # -- Players -----------------------------------------------------------
    def get_players(self, user_id: Optional[str] = None) -> list[Player]:
        players = list(self._players.values())
        if user_id is not None:
            players = [p for p in players if p.user_id == user_id]
        return players

    def get_player(self, player_id: str) -> Optional[Player]:
        return self._players.get(player_id)

    def create_player(self, player: Player) -> Player:
        with self._lock:
            if not player.player_id:
                player = player.model_copy(update={"player_id": self._next_id("PLY")})
            self._players[player.player_id] = player
            return player

    def update_player(self, player_id: str, **fields) -> Player:
        with self._lock:
            existing = self._players.get(player_id)
            if existing is None:
                raise NotFoundError(f"Player {player_id} not found")
            updated = existing.model_copy(update=fields)
            self._players[player_id] = updated
            return updated

    # -- Products -----------------------------------------------------------
    def get_products(self) -> list[Product]:
        return list(self._products.values())

    def get_product(self, product_id: str) -> Optional[Product]:
        return self._products.get(product_id)

    def create_product(self, product: Product) -> Product:
        with self._lock:
            self._products[product.product_id] = product
            return product

    def update_product(self, product_id: str, **fields) -> Product:
        with self._lock:
            existing = self._products.get(product_id)
            if existing is None:
                raise NotFoundError(f"Product {product_id} not found")
            fields.setdefault("updated_at", self._now())
            updated = existing.model_copy(update=fields)
            self._products[product_id] = updated
            return updated

    def update_product_stock(self, product_id: str, new_stock: int) -> Product:
        with self._lock:
            existing = self._products.get(product_id)
            if existing is None:
                raise NotFoundError(f"Product {product_id} not found")
            updated = existing.model_copy(update={"stock": new_stock, "updated_at": self._now()})
            self._products[product_id] = updated
            return updated

    # -- Product variants ----------------------------------------------------
    def get_product_variants(self, product_id: Optional[str] = None) -> list[ProductVariant]:
        variants = list(self._variants.values())
        if product_id is not None:
            variants = [v for v in variants if v.product_id == product_id]
        return variants

    def upsert_product_variant(self, product_id: str, variant: str, stock: int) -> ProductVariant:
        with self._lock:
            key = (product_id, variant)
            record = ProductVariant(product_id=product_id, variant=variant, stock=stock)
            self._variants[key] = record
            return record

    def delete_product_variant(self, product_id: str, variant: str) -> None:
        with self._lock:
            self._variants.pop((product_id, variant), None)

    # -- Bundles -----------------------------------------------------------
    def get_bundles(self) -> list[Bundle]:
        return list(self._bundles.values())

    def get_bundle(self, bundle_id: str) -> Optional[Bundle]:
        return self._bundles.get(bundle_id)

    def create_bundle(self, bundle: Bundle) -> Bundle:
        with self._lock:
            self._bundles[bundle.bundle_id] = bundle
            self._bundle_items.setdefault(bundle.bundle_id, [])
            return bundle

    def update_bundle(self, bundle_id: str, **fields) -> Bundle:
        with self._lock:
            existing = self._bundles.get(bundle_id)
            if existing is None:
                raise NotFoundError(f"Bundle {bundle_id} not found")
            fields.setdefault("updated_at", self._now())
            updated = existing.model_copy(update=fields)
            self._bundles[bundle_id] = updated
            return updated

    def get_bundle_items(self, bundle_id: Optional[str] = None) -> list[BundleItem]:
        if bundle_id is not None:
            return list(self._bundle_items.get(bundle_id, []))
        return [item for items in self._bundle_items.values() for item in items]

    def set_bundle_items(self, bundle_id: str, items: list[BundleItem]) -> list[BundleItem]:
        with self._lock:
            self._bundle_items[bundle_id] = list(items)
            return list(items)

    # -- Orders -----------------------------------------------------------
    def get_orders(self, user_id: Optional[str] = None) -> list[Order]:
        orders = list(self._orders.values())
        if user_id is not None:
            orders = [o for o in orders if o.user_id == user_id]
        return sorted(orders, key=lambda o: o.created_at, reverse=True)

    def get_order(self, order_id: str) -> Optional[Order]:
        return self._orders.get(order_id)

    def create_order(self, order: Order) -> Order:
        with self._lock:
            self._orders[order.order_id] = order
            self._order_items.setdefault(order.order_id, [])
            return order

    def update_order(self, order_id: str, **fields) -> Order:
        with self._lock:
            existing = self._orders.get(order_id)
            if existing is None:
                raise NotFoundError(f"Order {order_id} not found")
            fields.setdefault("updated_at", self._now())
            updated = existing.model_copy(update=fields)
            self._orders[order_id] = updated
            return updated

    def next_order_id(self, year: int) -> str:
        with self._lock:
            self._order_seq[year] = self._order_seq.get(year, 0) + 1
            return f"ORD-{year}-{self._order_seq[year]:06d}"

    # -- Order items ----------------------------------------------------
    def get_order_items(self, order_id: Optional[str] = None) -> list[OrderItem]:
        if order_id is not None:
            return list(self._order_items.get(order_id, []))
        return [item for items in self._order_items.values() for item in items]

    def create_order_item(self, item: OrderItem) -> OrderItem:
        with self._lock:
            if not item.order_item_id:
                item = item.model_copy(update={"order_item_id": self._next_id("OI")})
            self._order_items.setdefault(item.order_id, []).append(item)
            return item

    # -- Admins -----------------------------------------------------------
    def get_admins(self) -> list[Admin]:
        return list(self._admins.values())

    def get_admin_by_firebase_uid(self, firebase_uid: str) -> Optional[Admin]:
        return next((a for a in self._admins.values() if a.firebase_uid == firebase_uid), None)

    def create_admin(self, admin: Admin) -> Admin:
        with self._lock:
            if not admin.admin_id:
                admin = admin.model_copy(update={"admin_id": self._next_id("ADM")})
            self._admins[admin.admin_id] = admin
            return admin

    # -- Audit log ----------------------------------------------------
    def create_audit_log(self, entry: AuditLogEntry) -> AuditLogEntry:
        with self._lock:
            if not entry.log_id:
                entry = entry.model_copy(update={"log_id": self._next_id("LOG")})
            self._audit_log.append(entry)
            return entry

    def get_audit_log(self) -> list[AuditLogEntry]:
        return sorted(self._audit_log, key=lambda e: e.timestamp, reverse=True)
