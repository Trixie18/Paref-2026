"""Inventory requirement calculation and stock mutation.

Bundles do not have their own stock counter — a bundle's availability is
derived entirely from the stock of its component products (see the
Bundle_Items sheet). Buying 3x Bundle 4 must be treated as consuming 3
units of each of Bundle 4's seven components, on top of whatever those
same components are also being bought standalone in the same cart.
"""

import threading
from dataclasses import dataclass

from app.core.errors import OutOfStockError
from app.repositories import Repository
from app.services.cart_service import ResolvedLine

# Process-wide lock so two simultaneous checkouts can't both read the same
# "stock remaining" snapshot and both believe there's enough left. This is
# necessary but not sufficient once there is more than one backend process
# talking to the same spreadsheet — see the README's inventory-safety notes.
_inventory_lock = threading.RLock()


@dataclass(frozen=True)
class ComponentKey:
    product_id: str
    variant: str  # "" when the product has no variants


def calculate_requirements(resolved_lines: list[ResolvedLine]) -> dict[ComponentKey, int]:
    """Flattens cart lines (including bundle contents) into total units
    required per (product_id, variant)."""
    required: dict[ComponentKey, int] = {}

    def add(product_id: str, variant: str, qty: int) -> None:
        key = ComponentKey(product_id, variant)
        required[key] = required.get(key, 0) + qty

    for line in resolved_lines:
        if line.kind == "product":
            add(line.id, line.variant or "", line.quantity)
        else:
            for item in line.bundle_items:
                add(item.product_id, "", item.quantity * line.quantity)

    return required


def validate_and_reserve(repo: Repository, required: dict[ComponentKey, int]) -> None:
    """Checks every required component has enough stock, then decrements it.
    Raises OutOfStockError (leaving stock untouched) if anything is short.
    """
    with _inventory_lock:
        products_by_id = {p.product_id: p for p in repo.get_products()}
        variants_by_key = {(v.product_id, v.variant): v for v in repo.get_product_variants()}

        shortages: list[str] = []
        for key, qty_needed in required.items():
            product = products_by_id.get(key.product_id)
            if product is None:
                shortages.append(f"{key.product_id} is no longer available")
                continue
            if key.variant:
                variant = variants_by_key.get((key.product_id, key.variant))
                available = variant.stock if variant else 0
                if available < qty_needed:
                    shortages.append(
                        f"{product.name} ({key.variant}): requested {qty_needed}, only {available} in stock"
                    )
            else:
                if product.stock < qty_needed:
                    shortages.append(f"{product.name}: requested {qty_needed}, only {product.stock} in stock")

        if shortages:
            raise OutOfStockError("Some items are out of stock: " + "; ".join(shortages))

        for key, qty_needed in required.items():
            if key.variant:
                variant = variants_by_key[(key.product_id, key.variant)]
                repo.upsert_product_variant(key.product_id, key.variant, variant.stock - qty_needed)
            else:
                product = products_by_id[key.product_id]
                repo.update_product_stock(key.product_id, product.stock - qty_needed)
