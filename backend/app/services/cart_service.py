"""Resolves raw cart lines (product_id/bundle_id + quantity + optional
variant, as submitted by the frontend) into authoritative priced lines.

This is the one place that turns "what the client says it wants" into
"what it actually costs", by reading current Products/Bundles data from
the repository. Nothing here is trusted from the client except the ids,
quantities, and chosen variant — price always comes from storage.
"""

from dataclasses import dataclass
from typing import Literal, Optional

from app.core.errors import NotFoundError, ValidationError
from app.models import Bundle, BundleItem, Product
from app.repositories import Repository
from app.schemas.cart import CartCalculationResponse, CartLineInput, CartLineResult


@dataclass
class ResolvedLine:
    kind: Literal["product", "bundle"]
    id: str
    name: str
    variant: Optional[str]
    quantity: int
    unit_price: float
    subtotal: float
    bundle_items: list[BundleItem]


def resolve_cart_lines(repo: Repository, lines: list[CartLineInput]) -> list[ResolvedLine]:
    products_by_id: dict[str, Product] = {p.product_id: p for p in repo.get_products()}
    bundles_by_id: dict[str, Bundle] = {b.bundle_id: b for b in repo.get_bundles()}

    resolved: list[ResolvedLine] = []
    for line in lines:
        if bool(line.product_id) == bool(line.bundle_id):
            raise ValidationError("Each cart line must specify exactly one of product_id or bundle_id")

        if line.product_id:
            product = products_by_id.get(line.product_id)
            if product is None:
                raise NotFoundError(f"Product '{line.product_id}' does not exist")
            if not product.active:
                raise ValidationError(f"'{product.name}' is not currently available")

            variants = repo.get_product_variants(product.product_id)
            if product.variant_required:
                if not line.variant:
                    raise ValidationError(f"'{product.name}' requires a size to be selected")
                if not any(v.variant == line.variant for v in variants):
                    raise ValidationError(f"'{line.variant}' is not a valid size for '{product.name}'")
            elif line.variant:
                raise ValidationError(f"'{product.name}' does not support size selection")

            resolved.append(
                ResolvedLine(
                    kind="product",
                    id=product.product_id,
                    name=product.name,
                    variant=line.variant,
                    quantity=line.quantity,
                    unit_price=product.price,
                    subtotal=round(product.price * line.quantity, 2),
                    bundle_items=[],
                )
            )
        else:
            bundle = bundles_by_id.get(line.bundle_id)
            if bundle is None:
                raise NotFoundError(f"Bundle '{line.bundle_id}' does not exist")
            if not bundle.active:
                raise ValidationError(f"'{bundle.name}' is not currently available")
            if line.variant:
                raise ValidationError("Bundles do not support size selection")

            items = repo.get_bundle_items(bundle.bundle_id)
            if not items:
                raise ValidationError(f"'{bundle.name}' has no configured contents")

            resolved.append(
                ResolvedLine(
                    kind="bundle",
                    id=bundle.bundle_id,
                    name=bundle.name,
                    variant=None,
                    quantity=line.quantity,
                    unit_price=bundle.price,
                    subtotal=round(bundle.price * line.quantity, 2),
                    bundle_items=items,
                )
            )
    return resolved


def to_calculation_response(resolved: list[ResolvedLine]) -> CartCalculationResponse:
    lines = [
        CartLineResult(
            product_id=r.id if r.kind == "product" else None,
            bundle_id=r.id if r.kind == "bundle" else None,
            name=r.name,
            variant=r.variant,
            quantity=r.quantity,
            unit_price=r.unit_price,
            subtotal=r.subtotal,
        )
        for r in resolved
    ]
    total = round(sum(r.subtotal for r in resolved), 2)
    return CartCalculationResponse(lines=lines, total_amount=total)
