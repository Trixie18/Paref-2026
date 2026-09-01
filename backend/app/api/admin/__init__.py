from fastapi import APIRouter

from app.api.admin import audit, bundles, dashboard, orders, products, users

router = APIRouter()
router.include_router(dashboard.router)
router.include_router(users.router)
router.include_router(orders.router)
router.include_router(products.router)
router.include_router(bundles.router)
router.include_router(audit.router)
