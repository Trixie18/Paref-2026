"""Repository interface: the only boundary through which business logic
touches storage (Google Sheets today, potentially PostgreSQL later).

Methods are synchronous by design — gspread is a synchronous client, and
FastAPI runs sync route handlers in a thread pool, so there is no need to
introduce async plumbing just to reach it. Swapping REPOSITORY_BACKEND to a
future SQL implementation would keep this same signature.
"""

from abc import ABC, abstractmethod
from typing import Optional

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


class Repository(ABC):
    # -- Users -----------------------------------------------------------
    @abstractmethod
    def get_users(self) -> list[User]: ...

    @abstractmethod
    def get_user(self, user_id: str) -> Optional[User]: ...

    @abstractmethod
    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]: ...

    @abstractmethod
    def get_user_by_email(self, email: str) -> Optional[User]: ...

    @abstractmethod
    def create_user(self, user: User) -> User: ...

    @abstractmethod
    def update_user(self, user_id: str, **fields) -> User: ...

    # -- Players -----------------------------------------------------------
    @abstractmethod
    def get_players(self, user_id: Optional[str] = None) -> list[Player]: ...

    @abstractmethod
    def get_player(self, player_id: str) -> Optional[Player]: ...

    @abstractmethod
    def create_player(self, player: Player) -> Player: ...

    @abstractmethod
    def update_player(self, player_id: str, **fields) -> Player: ...

    # -- Products -----------------------------------------------------------
    @abstractmethod
    def get_products(self) -> list[Product]: ...

    @abstractmethod
    def get_product(self, product_id: str) -> Optional[Product]: ...

    @abstractmethod
    def create_product(self, product: Product) -> Product: ...

    @abstractmethod
    def update_product(self, product_id: str, **fields) -> Product: ...

    @abstractmethod
    def update_product_stock(self, product_id: str, new_stock: int) -> Product: ...

    # -- Product variants ----------------------------------------------------
    @abstractmethod
    def get_product_variants(self, product_id: Optional[str] = None) -> list[ProductVariant]: ...

    @abstractmethod
    def upsert_product_variant(self, product_id: str, variant: str, stock: int) -> ProductVariant: ...

    @abstractmethod
    def delete_product_variant(self, product_id: str, variant: str) -> None: ...

    # -- Bundles -----------------------------------------------------------
    @abstractmethod
    def get_bundles(self) -> list[Bundle]: ...

    @abstractmethod
    def get_bundle(self, bundle_id: str) -> Optional[Bundle]: ...

    @abstractmethod
    def create_bundle(self, bundle: Bundle) -> Bundle: ...

    @abstractmethod
    def update_bundle(self, bundle_id: str, **fields) -> Bundle: ...

    @abstractmethod
    def get_bundle_items(self, bundle_id: Optional[str] = None) -> list[BundleItem]: ...

    @abstractmethod
    def set_bundle_items(self, bundle_id: str, items: list[BundleItem]) -> list[BundleItem]: ...

    # -- Orders -----------------------------------------------------------
    @abstractmethod
    def get_orders(self, user_id: Optional[str] = None) -> list[Order]: ...

    @abstractmethod
    def get_order(self, order_id: str) -> Optional[Order]: ...

    @abstractmethod
    def create_order(self, order: Order) -> Order: ...

    @abstractmethod
    def update_order(self, order_id: str, **fields) -> Order: ...

    @abstractmethod
    def next_order_id(self, year: int) -> str: ...

    # -- Order items ----------------------------------------------------
    @abstractmethod
    def get_order_items(self, order_id: Optional[str] = None) -> list[OrderItem]: ...

    @abstractmethod
    def create_order_item(self, item: OrderItem) -> OrderItem: ...

    # -- Admins -----------------------------------------------------------
    @abstractmethod
    def get_admins(self) -> list[Admin]: ...

    @abstractmethod
    def get_admin_by_firebase_uid(self, firebase_uid: str) -> Optional[Admin]: ...

    @abstractmethod
    def create_admin(self, admin: Admin) -> Admin: ...

    # -- Audit log ----------------------------------------------------
    @abstractmethod
    def create_audit_log(self, entry: AuditLogEntry) -> AuditLogEntry: ...

    @abstractmethod
    def get_audit_log(self) -> list[AuditLogEntry]: ...
