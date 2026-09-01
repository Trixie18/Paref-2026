"""Repository implementation backed by a single Google Spreadsheet.

Each domain sheet (Users, Players, Products, ...) is wrapped by a
SheetTable (see sheets_client.py) which knows how to read/write rows of
strings. This module is responsible for mapping those raw rows to and from
the pydantic domain models in app.models, and for the small amount of
sequencing logic (generating new IDs) that Google Sheets has no native
support for.
"""

import threading
from datetime import datetime, timezone
from typing import Any, Optional

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
from app.repositories.sheets_client import SheetTable, get_or_create_worksheet, open_spreadsheet

USERS_COLUMNS = ["user_id", "firebase_uid", "name", "email", "phone", "created_at", "active"]
PLAYERS_COLUMNS = ["player_id", "user_id", "parent_name", "player_name", "team", "age_group", "jersey_number", "created_at"]
PRODUCTS_COLUMNS = [
    "product_id", "name", "description", "category", "price", "stock",
    "active", "image_url", "variant_required", "created_at", "updated_at",
]
PRODUCT_VARIANTS_COLUMNS = ["product_id", "variant", "stock"]
BUNDLES_COLUMNS = ["bundle_id", "name", "description", "price", "active", "created_at", "updated_at"]
BUNDLE_ITEMS_COLUMNS = ["bundle_id", "product_id", "quantity"]
ORDERS_COLUMNS = [
    "order_id", "user_id", "order_date", "total_amount", "payment_method",
    "payment_status", "fulfillment_status", "notes", "created_at",
    "updated_at", "claimed_at", "claimed_by",
]
ORDER_ITEMS_COLUMNS = [
    "order_item_id", "order_id", "product_id", "product_name", "quantity",
    "unit_price", "subtotal", "variant", "bundle_id",
]
ADMINS_COLUMNS = ["admin_id", "firebase_uid", "name", "email", "role", "active"]
AUDIT_LOG_COLUMNS = ["log_id", "timestamp", "admin_id", "action", "entity_type", "entity_id", "details"]


def _b(raw: str) -> bool:
    return raw.strip().upper() == "TRUE"


def _dt(raw: str) -> Optional[datetime]:
    raw = raw.strip()
    return datetime.fromisoformat(raw) if raw else None


def _f(raw: str) -> float:
    raw = raw.strip()
    return float(raw) if raw else 0.0


def _i(raw: str) -> int:
    raw = raw.strip()
    return int(float(raw)) if raw else 0


class GoogleSheetsRepository(Repository):
    def __init__(self, sheet_id: str, service_account_path: str):
        spreadsheet = open_spreadsheet(sheet_id, service_account_path)
        self._id_lock = threading.RLock()

        self._users = SheetTable(get_or_create_worksheet(spreadsheet, "Users", USERS_COLUMNS), USERS_COLUMNS)
        self._players = SheetTable(get_or_create_worksheet(spreadsheet, "Players", PLAYERS_COLUMNS), PLAYERS_COLUMNS)
        self._products = SheetTable(get_or_create_worksheet(spreadsheet, "Products", PRODUCTS_COLUMNS), PRODUCTS_COLUMNS)
        self._variants = SheetTable(
            get_or_create_worksheet(spreadsheet, "Product_Variants", PRODUCT_VARIANTS_COLUMNS), PRODUCT_VARIANTS_COLUMNS
        )
        self._bundles = SheetTable(get_or_create_worksheet(spreadsheet, "Bundles", BUNDLES_COLUMNS), BUNDLES_COLUMNS)
        self._bundle_items = SheetTable(
            get_or_create_worksheet(spreadsheet, "Bundle_Items", BUNDLE_ITEMS_COLUMNS), BUNDLE_ITEMS_COLUMNS
        )
        self._orders = SheetTable(get_or_create_worksheet(spreadsheet, "Orders", ORDERS_COLUMNS), ORDERS_COLUMNS)
        self._order_items = SheetTable(
            get_or_create_worksheet(spreadsheet, "Order_Items", ORDER_ITEMS_COLUMNS), ORDER_ITEMS_COLUMNS
        )
        self._admins = SheetTable(get_or_create_worksheet(spreadsheet, "Admins", ADMINS_COLUMNS), ADMINS_COLUMNS)
        self._audit_log = SheetTable(get_or_create_worksheet(spreadsheet, "Audit_Log", AUDIT_LOG_COLUMNS), AUDIT_LOG_COLUMNS)

    def clear_all_data(self) -> None:
        """Deletes every data row (keeping headers) from every sheet. Used
        only by seed/clear_google_sheet.py to reset a spreadsheet before
        re-seeding — never called by the running app."""
        for table in (
            self._users, self._players, self._products, self._variants,
            self._bundles, self._bundle_items, self._orders, self._order_items,
            self._admins, self._audit_log,
        ):
            table.clear_data_rows()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def _next_sequential_id(self, table: SheetTable, id_column: str, prefix: str, width: int = 6) -> str:
        with self._id_lock:
            rows = table.all_rows()
            max_seq = 0
            for row in rows:
                raw_id = row.get(id_column, "")
                if raw_id.startswith(prefix + "-"):
                    suffix = raw_id[len(prefix) + 1:]
                    if suffix.isdigit():
                        max_seq = max(max_seq, int(suffix))
            return f"{prefix}-{max_seq + 1:0{width}d}"

    # -- mapping helpers ----------------------------------------------------
    @staticmethod
    def _row_to_user(row: dict[str, str]) -> User:
        return User(
            user_id=row["user_id"], firebase_uid=row["firebase_uid"], name=row["name"],
            email=row["email"], phone=row["phone"], created_at=_dt(row["created_at"]) or GoogleSheetsRepository._now(),
            active=_b(row.get("active", "TRUE")),
        )

    @staticmethod
    def _user_to_row(user: User) -> dict[str, Any]:
        return user.model_dump()

    @staticmethod
    def _row_to_player(row: dict[str, str]) -> Player:
        return Player(
            player_id=row["player_id"], user_id=row["user_id"], parent_name=row["parent_name"],
            player_name=row["player_name"], team=row["team"], age_group=row["age_group"],
            jersey_number=row["jersey_number"], created_at=_dt(row["created_at"]) or GoogleSheetsRepository._now(),
        )

    @staticmethod
    def _row_to_product(row: dict[str, str]) -> Product:
        return Product(
            product_id=row["product_id"], name=row["name"], description=row["description"],
            category=row["category"], price=_f(row["price"]), stock=_i(row["stock"]),
            active=_b(row.get("active", "TRUE")), image_url=row.get("image_url", ""),
            variant_required=_b(row.get("variant_required", "FALSE")),
            created_at=_dt(row["created_at"]) or GoogleSheetsRepository._now(),
            updated_at=_dt(row["updated_at"]) or GoogleSheetsRepository._now(),
        )

    @staticmethod
    def _row_to_variant(row: dict[str, str]) -> ProductVariant:
        return ProductVariant(product_id=row["product_id"], variant=row["variant"], stock=_i(row["stock"]))

    @staticmethod
    def _row_to_bundle(row: dict[str, str]) -> Bundle:
        return Bundle(
            bundle_id=row["bundle_id"], name=row["name"], description=row["description"],
            price=_f(row["price"]), active=_b(row.get("active", "TRUE")),
            created_at=_dt(row["created_at"]) or GoogleSheetsRepository._now(),
            updated_at=_dt(row["updated_at"]) or GoogleSheetsRepository._now(),
        )

    @staticmethod
    def _row_to_bundle_item(row: dict[str, str]) -> BundleItem:
        return BundleItem(bundle_id=row["bundle_id"], product_id=row["product_id"], quantity=_i(row["quantity"]))

    @staticmethod
    def _row_to_order(row: dict[str, str]) -> Order:
        return Order(
            order_id=row["order_id"], user_id=row["user_id"],
            order_date=_dt(row["order_date"]) or GoogleSheetsRepository._now(),
            total_amount=_f(row["total_amount"]), payment_method=row["payment_method"],
            payment_status=row.get("payment_status", "PENDING"),
            fulfillment_status=row.get("fulfillment_status", "PENDING"),
            notes=row.get("notes", ""),
            created_at=_dt(row["created_at"]) or GoogleSheetsRepository._now(),
            updated_at=_dt(row["updated_at"]) or GoogleSheetsRepository._now(),
            claimed_at=_dt(row.get("claimed_at", "")), claimed_by=row.get("claimed_by", ""),
        )

    @staticmethod
    def _row_to_order_item(row: dict[str, str]) -> OrderItem:
        return OrderItem(
            order_item_id=row["order_item_id"], order_id=row["order_id"], product_id=row["product_id"],
            product_name=row["product_name"], quantity=_i(row["quantity"]), unit_price=_f(row["unit_price"]),
            subtotal=_f(row["subtotal"]), variant=row.get("variant", ""), bundle_id=row.get("bundle_id", ""),
        )

    @staticmethod
    def _row_to_admin(row: dict[str, str]) -> Admin:
        return Admin(
            admin_id=row["admin_id"], firebase_uid=row["firebase_uid"], name=row["name"],
            email=row["email"], role=row["role"], active=_b(row.get("active", "TRUE")),
        )

    @staticmethod
    def _row_to_audit(row: dict[str, str]) -> AuditLogEntry:
        return AuditLogEntry(
            log_id=row["log_id"], timestamp=_dt(row["timestamp"]) or GoogleSheetsRepository._now(),
            admin_id=row["admin_id"], action=row["action"], entity_type=row["entity_type"],
            entity_id=row["entity_id"], details=row.get("details", ""),
        )

    # -- Users -----------------------------------------------------------
    def get_users(self) -> list[User]:
        return [self._row_to_user(r) for r in self._users.all_rows()]

    def get_user(self, user_id: str) -> Optional[User]:
        return next((u for u in self.get_users() if u.user_id == user_id), None)

    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        return next((u for u in self.get_users() if u.firebase_uid == firebase_uid), None)

    def get_user_by_email(self, email: str) -> Optional[User]:
        email_lower = email.lower()
        return next((u for u in self.get_users() if u.email.lower() == email_lower), None)

    def create_user(self, user: User) -> User:
        if not user.user_id:
            user = user.model_copy(update={"user_id": self._next_sequential_id(self._users, "user_id", "USR")})
        self._users.append_row(self._user_to_row(user))
        return user

    def update_user(self, user_id: str, **fields) -> User:
        row_number = self._users.find_row_number("user_id", user_id)
        if row_number is None:
            raise NotFoundError(f"User {user_id} not found")
        existing = self.get_user(user_id)
        updated = existing.model_copy(update=fields)
        self._users.update_row(row_number, self._user_to_row(updated))
        return updated

    # -- Players -----------------------------------------------------------
    def get_players(self, user_id: Optional[str] = None) -> list[Player]:
        players = [self._row_to_player(r) for r in self._players.all_rows()]
        if user_id is not None:
            players = [p for p in players if p.user_id == user_id]
        return players

    def get_player(self, player_id: str) -> Optional[Player]:
        return next((p for p in self.get_players() if p.player_id == player_id), None)

    def create_player(self, player: Player) -> Player:
        if not player.player_id:
            player = player.model_copy(update={"player_id": self._next_sequential_id(self._players, "player_id", "PLY")})
        self._players.append_row(player.model_dump())
        return player

    def update_player(self, player_id: str, **fields) -> Player:
        row_number = self._players.find_row_number("player_id", player_id)
        if row_number is None:
            raise NotFoundError(f"Player {player_id} not found")
        existing = self.get_player(player_id)
        updated = existing.model_copy(update=fields)
        self._players.update_row(row_number, updated.model_dump())
        return updated

    # -- Products -----------------------------------------------------------
    def get_products(self) -> list[Product]:
        return [self._row_to_product(r) for r in self._products.all_rows()]

    def get_product(self, product_id: str) -> Optional[Product]:
        return next((p for p in self.get_products() if p.product_id == product_id), None)

    def create_product(self, product: Product) -> Product:
        self._products.append_row(product.model_dump())
        return product

    def update_product(self, product_id: str, **fields) -> Product:
        row_number = self._products.find_row_number("product_id", product_id)
        if row_number is None:
            raise NotFoundError(f"Product {product_id} not found")
        existing = self.get_product(product_id)
        fields.setdefault("updated_at", self._now())
        updated = existing.model_copy(update=fields)
        self._products.update_row(row_number, updated.model_dump())
        return updated

    def update_product_stock(self, product_id: str, new_stock: int) -> Product:
        return self.update_product(product_id, stock=new_stock)

    # -- Product variants ----------------------------------------------------
    def get_product_variants(self, product_id: Optional[str] = None) -> list[ProductVariant]:
        variants = [self._row_to_variant(r) for r in self._variants.all_rows()]
        if product_id is not None:
            variants = [v for v in variants if v.product_id == product_id]
        return variants

    def upsert_product_variant(self, product_id: str, variant: str, stock: int) -> ProductVariant:
        row_numbers = self._variants.find_row_numbers({"product_id": product_id, "variant": variant})
        if row_numbers:
            self._variants.update_row(row_numbers[0], {"product_id": product_id, "variant": variant, "stock": stock})
        else:
            self._variants.append_row({"product_id": product_id, "variant": variant, "stock": stock})
        return ProductVariant(product_id=product_id, variant=variant, stock=stock)

    def delete_product_variant(self, product_id: str, variant: str) -> None:
        row_numbers = self._variants.find_row_numbers({"product_id": product_id, "variant": variant})
        for row_number in row_numbers:
            self._variants.update_row(row_number, {"product_id": "", "variant": "", "stock": ""})

    # -- Bundles -----------------------------------------------------------
    def get_bundles(self) -> list[Bundle]:
        return [self._row_to_bundle(r) for r in self._bundles.all_rows()]

    def get_bundle(self, bundle_id: str) -> Optional[Bundle]:
        return next((b for b in self.get_bundles() if b.bundle_id == bundle_id), None)

    def create_bundle(self, bundle: Bundle) -> Bundle:
        self._bundles.append_row(bundle.model_dump())
        return bundle

    def update_bundle(self, bundle_id: str, **fields) -> Bundle:
        row_number = self._bundles.find_row_number("bundle_id", bundle_id)
        if row_number is None:
            raise NotFoundError(f"Bundle {bundle_id} not found")
        existing = self.get_bundle(bundle_id)
        fields.setdefault("updated_at", self._now())
        updated = existing.model_copy(update=fields)
        self._bundles.update_row(row_number, updated.model_dump())
        return updated

    def get_bundle_items(self, bundle_id: Optional[str] = None) -> list[BundleItem]:
        items = [self._row_to_bundle_item(r) for r in self._bundle_items.all_rows()]
        if bundle_id is not None:
            items = [i for i in items if i.bundle_id == bundle_id]
        return items

    def set_bundle_items(self, bundle_id: str, items: list[BundleItem]) -> list[BundleItem]:
        for row_number in self._bundle_items.find_row_numbers({"bundle_id": bundle_id}):
            self._bundle_items.update_row(row_number, {"bundle_id": "", "product_id": "", "quantity": ""})
        for item in items:
            self._bundle_items.append_row(item.model_dump())
        return items

    # -- Orders -----------------------------------------------------------
    def get_orders(self, user_id: Optional[str] = None) -> list[Order]:
        orders = [self._row_to_order(r) for r in self._orders.all_rows()]
        if user_id is not None:
            orders = [o for o in orders if o.user_id == user_id]
        return sorted(orders, key=lambda o: o.created_at, reverse=True)

    def get_order(self, order_id: str) -> Optional[Order]:
        return next((o for o in self.get_orders() if o.order_id == order_id), None)

    def create_order(self, order: Order) -> Order:
        self._orders.append_row(order.model_dump())
        return order

    def update_order(self, order_id: str, **fields) -> Order:
        row_number = self._orders.find_row_number("order_id", order_id)
        if row_number is None:
            raise NotFoundError(f"Order {order_id} not found")
        existing = self.get_order(order_id)
        fields.setdefault("updated_at", self._now())
        updated = existing.model_copy(update=fields)
        self._orders.update_row(row_number, updated.model_dump())
        return updated

    def next_order_id(self, year: int) -> str:
        with self._id_lock:
            rows = self._orders.all_rows()
            prefix = f"ORD-{year}-"
            max_seq = 0
            for row in rows:
                order_id = row.get("order_id", "")
                if order_id.startswith(prefix):
                    suffix = order_id[len(prefix):]
                    if suffix.isdigit():
                        max_seq = max(max_seq, int(suffix))
            return f"{prefix}{max_seq + 1:06d}"

    # -- Order items ----------------------------------------------------
    def get_order_items(self, order_id: Optional[str] = None) -> list[OrderItem]:
        items = [self._row_to_order_item(r) for r in self._order_items.all_rows()]
        if order_id is not None:
            items = [i for i in items if i.order_id == order_id]
        return items

    def create_order_item(self, item: OrderItem) -> OrderItem:
        if not item.order_item_id:
            item = item.model_copy(
                update={"order_item_id": self._next_sequential_id(self._order_items, "order_item_id", "OI")}
            )
        self._order_items.append_row(item.model_dump())
        return item

    # -- Admins -----------------------------------------------------------
    def get_admins(self) -> list[Admin]:
        return [self._row_to_admin(r) for r in self._admins.all_rows()]

    def get_admin_by_firebase_uid(self, firebase_uid: str) -> Optional[Admin]:
        return next((a for a in self.get_admins() if a.firebase_uid == firebase_uid), None)

    def create_admin(self, admin: Admin) -> Admin:
        if not admin.admin_id:
            admin = admin.model_copy(update={"admin_id": self._next_sequential_id(self._admins, "admin_id", "ADM")})
        self._admins.append_row(admin.model_dump())
        return admin

    # -- Audit log ----------------------------------------------------
    def create_audit_log(self, entry: AuditLogEntry) -> AuditLogEntry:
        if not entry.log_id:
            entry = entry.model_copy(update={"log_id": self._next_sequential_id(self._audit_log, "log_id", "LOG")})
        self._audit_log.append_row(entry.model_dump())
        return entry

    def get_audit_log(self) -> list[AuditLogEntry]:
        return sorted([self._row_to_audit(r) for r in self._audit_log.all_rows()], key=lambda e: e.timestamp, reverse=True)
