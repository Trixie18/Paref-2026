from datetime import datetime, timezone

from app.core.errors import DuplicateError, NotFoundError, ValidationError
from app.models import Bundle, BundleItem
from app.repositories import Repository
from app.schemas.bundle import BundleCreateRequest, BundleResponse, BundleUpdateRequest, BundleItemResponse


def _to_response(repo: Repository, bundle: Bundle) -> BundleResponse:
    items = repo.get_bundle_items(bundle.bundle_id)
    products_by_id = {p.product_id: p for p in repo.get_products()}

    item_responses = []
    individual_total = 0.0
    missing_price_info = False
    for item in items:
        product = products_by_id.get(item.product_id)
        name = product.name if product else item.product_id
        item_responses.append(BundleItemResponse(product_id=item.product_id, product_name=name, quantity=item.quantity))
        if product is not None:
            individual_total += product.price * item.quantity
        else:
            missing_price_info = True

    savings = None if missing_price_info else round(individual_total - bundle.price, 2)
    return BundleResponse(
        bundle_id=bundle.bundle_id,
        name=bundle.name,
        description=bundle.description,
        price=bundle.price,
        active=bundle.active,
        items=item_responses,
        individual_total=None if missing_price_info else round(individual_total, 2),
        savings=savings if savings is not None and savings > 0 else None,
    )


def list_bundles(repo: Repository, include_inactive: bool = False) -> list[BundleResponse]:
    bundles = repo.get_bundles()
    if not include_inactive:
        bundles = [b for b in bundles if b.active]
    return [_to_response(repo, b) for b in bundles]


def get_bundle(repo: Repository, bundle_id: str) -> BundleResponse:
    bundle = repo.get_bundle(bundle_id)
    if bundle is None:
        raise NotFoundError(f"Bundle {bundle_id} not found")
    return _to_response(repo, bundle)


def _validate_items(repo: Repository, items) -> list[BundleItem]:
    if not items:
        raise ValidationError("A bundle must contain at least one item")
    products_by_id = {p.product_id: p for p in repo.get_products()}
    result = []
    for item in items:
        if item.product_id not in products_by_id:
            raise ValidationError(f"Product '{item.product_id}' does not exist")
        if item.quantity <= 0:
            raise ValidationError("Bundle item quantity must be at least 1")
        result.append(BundleItem(bundle_id="", product_id=item.product_id, quantity=item.quantity))
    return result


def create_bundle(repo: Repository, req: BundleCreateRequest) -> BundleResponse:
    if repo.get_bundle(req.bundle_id) is not None:
        raise DuplicateError(f"Bundle {req.bundle_id} already exists")
    items = _validate_items(repo, req.items)

    now = datetime.now(timezone.utc)
    bundle = repo.create_bundle(
        Bundle(
            bundle_id=req.bundle_id, name=req.name, description=req.description,
            price=req.price, active=True, created_at=now, updated_at=now,
        )
    )
    repo.set_bundle_items(bundle.bundle_id, [i.model_copy(update={"bundle_id": bundle.bundle_id}) for i in items])
    return _to_response(repo, bundle)


def update_bundle(repo: Repository, bundle_id: str, req: BundleUpdateRequest) -> BundleResponse:
    get_bundle(repo, bundle_id)  # 404 if missing
    fields = req.model_dump(exclude_unset=True, exclude={"items"})
    fields = {k: v for k, v in fields.items() if v is not None}
    if fields:
        repo.update_bundle(bundle_id, **fields)
    if req.items is not None:
        items = _validate_items(repo, req.items)
        repo.set_bundle_items(bundle_id, [i.model_copy(update={"bundle_id": bundle_id}) for i in items])
    return get_bundle(repo, bundle_id)
