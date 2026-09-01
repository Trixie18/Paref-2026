"""All dashboard numbers are computed live from the current Google Sheets
(or in-memory) data — nothing here is cached or fabricated, per the
"do not create fake data for production" requirement.
"""

from concurrent.futures import ThreadPoolExecutor

from app.repositories import Repository
from app.schemas.analytics import (
    BundleSales,
    CategorySales,
    DashboardResponse,
    InventoryStatusItem,
    ProductSales,
    TimeSeriesPoint,
)

TOP_PRODUCTS_LIMIT = 10


def build_dashboard(repo: Repository) -> DashboardResponse:
    # These seven reads each touch a different sheet and don't depend on
    # one another, so fan them out instead of paying for each network
    # round trip in sequence — on a cold cache (see sheets_client.py) this
    # is the difference between ~7 x latency and ~1 x latency for loading
    # the dashboard.
    with ThreadPoolExecutor(max_workers=7) as pool:
        users_f = pool.submit(repo.get_users)
        players_f = pool.submit(repo.get_players)
        orders_f = pool.submit(repo.get_orders)
        order_items_f = pool.submit(repo.get_order_items)
        products_f = pool.submit(repo.get_products)
        bundles_f = pool.submit(repo.get_bundles)
        variants_f = pool.submit(repo.get_product_variants)

        users = users_f.result()
        players = players_f.result()
        orders = orders_f.result()
        order_items = order_items_f.result()
        products_by_id = {p.product_id: p for p in products_f.result()}
        bundles_by_id = {b.bundle_id: b for b in bundles_f.result()}
        all_variants = variants_f.result()

    total_revenue = round(sum(o.total_amount for o in orders), 2)
    paid_revenue = round(sum(o.total_amount for o in orders if o.payment_status == "PAID"), 2)
    pending_payments = sum(1 for o in orders if o.payment_status == "PENDING")
    pending_fulfillment = sum(1 for o in orders if o.fulfillment_status == "PENDING")
    total_items_sold = sum(i.quantity for i in order_items)

    revenue_by_date: dict[str, float] = {}
    orders_by_date: dict[str, int] = {}
    for o in orders:
        d = o.order_date.date().isoformat()
        revenue_by_date[d] = revenue_by_date.get(d, 0.0) + o.total_amount
        orders_by_date[d] = orders_by_date.get(d, 0) + 1
    revenue_over_time = [
        TimeSeriesPoint(date=d, value=round(v, 2)) for d, v in sorted(revenue_by_date.items())
    ]
    orders_over_time = [TimeSeriesPoint(date=d, value=v) for d, v in sorted(orders_by_date.items())]

    category_revenue: dict[str, float] = {}
    product_sales: dict[str, dict] = {}
    bundle_sales: dict[str, dict] = {}

    for item in order_items:
        if item.bundle_id:
            bundle = bundles_by_id.get(item.bundle_id)
            category_revenue["BUNDLE"] = category_revenue.get("BUNDLE", 0.0) + item.subtotal
            entry = bundle_sales.setdefault(
                item.bundle_id, {"name": bundle.name if bundle else item.product_name, "quantity_sold": 0, "revenue": 0.0}
            )
            entry["quantity_sold"] += item.quantity
            entry["revenue"] += item.subtotal
        else:
            product = products_by_id.get(item.product_id)
            category = product.category if product else "ITEM"
            category_revenue[category] = category_revenue.get(category, 0.0) + item.subtotal
            entry = product_sales.setdefault(
                item.product_id, {"name": item.product_name, "quantity_sold": 0, "revenue": 0.0}
            )
            entry["quantity_sold"] += item.quantity
            entry["revenue"] += item.subtotal

    sales_by_category = [
        CategorySales(category=cat, revenue=round(rev, 2)) for cat, rev in sorted(category_revenue.items())
    ]

    top_products = sorted(
        (ProductSales(product_id=pid, name=v["name"], quantity_sold=v["quantity_sold"], revenue=round(v["revenue"], 2))
         for pid, v in product_sales.items()),
        key=lambda p: p.quantity_sold,
        reverse=True,
    )[:TOP_PRODUCTS_LIMIT]

    bundle_sales_list = sorted(
        (BundleSales(bundle_id=bid, name=v["name"], quantity_sold=v["quantity_sold"], revenue=round(v["revenue"], 2))
         for bid, v in bundle_sales.items()),
        key=lambda b: b.quantity_sold,
        reverse=True,
    )

    variants_by_product: dict[str, list] = {}
    for variant in all_variants:
        variants_by_product.setdefault(variant.product_id, []).append(variant)

    inventory_status: list[InventoryStatusItem] = []
    for product in products_by_id.values():
        if not product.active:
            continue
        if product.variant_required:
            for variant in variants_by_product.get(product.product_id, []):
                inventory_status.append(
                    InventoryStatusItem(product_id=product.product_id, name=product.name, variant=variant.variant, stock=variant.stock)
                )
        else:
            inventory_status.append(
                InventoryStatusItem(product_id=product.product_id, name=product.name, variant=None, stock=product.stock)
            )

    return DashboardResponse(
        registered_parents=len(users),
        total_players=len(players),
        total_orders=len(orders),
        total_revenue=total_revenue,
        paid_revenue=paid_revenue,
        pending_payments=pending_payments,
        pending_fulfillment=pending_fulfillment,
        total_items_sold=total_items_sold,
        revenue_over_time=revenue_over_time,
        orders_over_time=orders_over_time,
        sales_by_category=sales_by_category,
        top_products=top_products,
        bundle_sales=bundle_sales_list,
        inventory_status=inventory_status,
    )
