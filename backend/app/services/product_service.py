from datetime import datetime, timezone

from app.core.errors import DuplicateError, NotFoundError
from app.models import Product
from app.repositories import Repository
from app.schemas.product import (
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
    ProductVariantResponse,
    VariantUpsertRequest,
)


def _to_response(repo: Repository, product: Product) -> ProductResponse:
    variants = repo.get_product_variants(product.product_id) if product.variant_required else []
    return ProductResponse(
        **product.model_dump(),
        variants=[ProductVariantResponse(variant=v.variant, stock=v.stock) for v in variants],
    )


def list_products(repo: Repository, include_inactive: bool = False) -> list[ProductResponse]:
    products = repo.get_products()
    if not include_inactive:
        products = [p for p in products if p.active]
    return [_to_response(repo, p) for p in products]


def get_product(repo: Repository, product_id: str) -> ProductResponse:
    product = repo.get_product(product_id)
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    return _to_response(repo, product)


def create_product(repo: Repository, req: ProductCreateRequest) -> ProductResponse:
    if repo.get_product(req.product_id) is not None:
        raise DuplicateError(f"Product {req.product_id} already exists")

    now = datetime.now(timezone.utc)
    product = repo.create_product(
        Product(
            product_id=req.product_id,
            name=req.name,
            description=req.description,
            category=req.category,
            price=req.price,
            stock=req.stock,
            active=True,
            image_url=req.image_url,
            variant_required=req.variant_required,
            created_at=now,
            updated_at=now,
        )
    )
    for variant in req.variants:
        repo.upsert_product_variant(product.product_id, variant.variant, variant.stock)
    return _to_response(repo, product)


def update_product(repo: Repository, product_id: str, req: ProductUpdateRequest) -> ProductResponse:
    get_product(repo, product_id)  # 404 if missing
    fields = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    if fields:
        repo.update_product(product_id, **fields)
    return get_product(repo, product_id)


def deactivate_product(repo: Repository, product_id: str) -> ProductResponse:
    """Soft-delete: products with historical orders must never be removed."""
    get_product(repo, product_id)
    repo.update_product(product_id, active=False)
    return get_product(repo, product_id)


def upsert_variant(repo: Repository, product_id: str, req: VariantUpsertRequest) -> ProductResponse:
    get_product(repo, product_id)
    repo.upsert_product_variant(product_id, req.variant, req.stock)
    return get_product(repo, product_id)


def delete_variant(repo: Repository, product_id: str, variant: str) -> ProductResponse:
    get_product(repo, product_id)
    repo.delete_product_variant(product_id, variant)
    return get_product(repo, product_id)
