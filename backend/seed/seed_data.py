"""Development seed data.

NOT real event data — every price is a clearly-marked placeholder until
actual event pricing is provided. Populates whichever repository backend
is currently configured (REPOSITORY_BACKEND), so this can seed either the
in-memory store or a real Google Spreadsheet.

Run with:  python -m seed.seed_data
"""

from datetime import datetime, timedelta, timezone

from app.models import Admin, Bundle, BundleItem, Order, OrderItem, Player, Product, User
from app.repositories import Repository, get_repository

now = datetime.now(timezone.utc)


def seed(repo: Repository | None = None) -> None:
    repo = repo or get_repository()

    print("Seeding development data (placeholder prices, clearly not final event pricing)...")

    # -- Admins --------------------------------------------------------
    repo.create_admin(Admin(admin_id="", firebase_uid="dev-admin-1", name="Dana Cruz", email="dana.admin@example.test", role="ADMIN", active=True))
    repo.create_admin(Admin(admin_id="", firebase_uid="dev-staff-1", name="Sam Reyes", email="sam.staff@example.test", role="STAFF", active=True))

    # -- Parents (Users) -------------------------------------------------
    parent_names = [
        ("Maria Dela Cruz", "maria.delacruz@example.test", "09171234501"),
        ("Jose Santos", "jose.santos@example.test", "09171234502"),
        ("Ana Reyes", "ana.reyes@example.test", "09171234503"),
        ("Carlos Bautista", "carlos.bautista@example.test", "09171234504"),
        ("Liza Fernandez", "liza.fernandez@example.test", "09171234505"),
    ]
    users: list[User] = []
    for i, (name, email, phone) in enumerate(parent_names, start=1):
        users.append(
            repo.create_user(
                User(user_id="", firebase_uid=f"dev-parent-{i}", name=name, email=email, phone=phone, created_at=now, active=True)
            )
        )

    # -- Players -----------------------------------------------------------
    player_defs = [
        (0, "Miguel Dela Cruz", "Blue", "U12", "7"),
        (0, "Sofia Dela Cruz", "Red", "U10", "14"),
        (1, "Diego Santos", "Blue", "U14", "9"),
        (2, "Isabel Reyes", "Red", "U10", "3"),
        (2, "Rafael Reyes", "Blue", "U12", "21"),
        (3, "Antonio Bautista", "Red", "U14", "5"),
        (4, "Elena Fernandez", "Blue", "U10", "11"),
        (4, "Mateo Fernandez", "Red", "U12", "8"),
    ]
    players: list[Player] = []
    for user_index, player_name, team, age_group, jersey in player_defs:
        players.append(
            repo.create_player(
                Player(
                    player_id="", user_id=users[user_index].user_id, player_name=player_name,
                    team=team, age_group=age_group, jersey_number=jersey, created_at=now,
                )
            )
        )

    # -- Shirts (variant-based products) ------------------------------------
    vinta = repo.create_product(
        Product(
            product_id="VINTA", name="Vinta Shirt (Blue)", description="Official event shirt, blue colorway.",
            category="SHIRT", price=550.00, stock=0, active=True, image_url="", variant_required=True,
            created_at=now, updated_at=now,
        )
    )
    anchor = repo.create_product(
        Product(
            product_id="ANCHOR", name="Anchor Shirt (Red)", description="Official event shirt, red colorway.",
            category="SHIRT", price=550.00, stock=0, active=True, image_url="", variant_required=True,
            created_at=now, updated_at=now,
        )
    )
    variant_stock = {"XS": 20, "S": 40, "M": 60, "L": 40, "XL": 20}
    for size, stock in variant_stock.items():
        repo.upsert_product_variant(vinta.product_id, size, stock)
        repo.upsert_product_variant(anchor.product_id, size, stock)

    # -- Individual event items -------------------------------------------
    item_defs = [
        ("MEAL", "Meal Stub", "Redeemable for one event meal.", 150.00, 300),
        ("WATER", "Water", "Bottled water.", 30.00, 500),
        ("RAFFLE", "Raffle Stub", "One entry to the event raffle.", 50.00, 400),
        ("BINGO", "Bingo Card", "One bingo card for the event bingo game.", 50.00, 400),
        ("JUICE", "Juice", "Boxed juice drink.", 35.00, 400),
        ("COASTER", "Family Coaster", "Family-sized coaster ride pass.", 100.00, 200),
        ("PHOTOBOOTH", "Photobooth", "One photobooth session.", 120.00, 150),
    ]
    products_by_id: dict[str, Product] = {"VINTA": vinta, "ANCHOR": anchor}
    for pid, name, desc, price, stock in item_defs:
        products_by_id[pid] = repo.create_product(
            Product(
                product_id=pid, name=name, description=desc, category="ITEM", price=price, stock=stock,
                active=True, image_url="", variant_required=False, created_at=now, updated_at=now,
            )
        )

    # -- Bundles -----------------------------------------------------------
    bundle_defs = [
        ("BUNDLE-1", "Bundle 1", [("MEAL", 1), ("WATER", 1)]),
        ("BUNDLE-2", "Bundle 2", [("MEAL", 1), ("WATER", 1), ("RAFFLE", 1), ("BINGO", 1)]),
        ("BUNDLE-3", "Bundle 3", [("MEAL", 1), ("WATER", 1), ("RAFFLE", 1), ("BINGO", 1), ("JUICE", 1), ("COASTER", 1)]),
        ("BUNDLE-4", "Bundle 4", [("MEAL", 1), ("WATER", 1), ("RAFFLE", 1), ("BINGO", 1), ("JUICE", 1), ("COASTER", 1), ("PHOTOBOOTH", 1)]),
    ]
    bundles_by_id: dict[str, Bundle] = {}
    for bundle_id, name, items in bundle_defs:
        individual_total = sum(products_by_id[pid].price * qty for pid, qty in items)
        price = round(individual_total * 0.85, 2)  # placeholder: 15% bundle discount
        bundle = repo.create_bundle(
            Bundle(bundle_id=bundle_id, name=name, description=f"{name}: " + ", ".join(f"{qty}x {products_by_id[pid].name}" for pid, qty in items),
                   price=price, active=True, created_at=now, updated_at=now)
        )
        repo.set_bundle_items(bundle_id, [BundleItem(bundle_id=bundle_id, product_id=pid, quantity=qty) for pid, qty in items])
        bundles_by_id[bundle_id] = bundle

    # -- Sample orders -------------------------------------------------
    order_lines = [
        (0, [("VINTA", "M", 1), ("MEAL", None, 2)], "GCASH", "PAID", "READY"),
        (0, [("BUNDLE-1", None, 1)], "CASH_AT_EVENT", "PENDING", "PENDING"),
        (1, [("ANCHOR", "L", 2)], "BANK_TRANSFER", "PAID", "CLAIMED"),
        (2, [("BUNDLE-3", None, 1), ("WATER", None, 3)], "GCASH", "PENDING", "PENDING"),
        (2, [("BUNDLE-4", None, 2)], "GCASH", "PAID", "PENDING"),
        (3, [("VINTA", "S", 1), ("RAFFLE", None, 5)], "CASH_AT_EVENT", "PENDING", "PENDING"),
        (3, [("BUNDLE-2", None, 3)], "BANK_TRANSFER", "PAID", "READY"),
        (4, [("ANCHOR", "M", 1), ("JUICE", None, 4)], "GCASH", "FAILED", "PENDING"),
        (4, [("BUNDLE-1", None, 2), ("PHOTOBOOTH", None, 1)], "CASH_AT_EVENT", "PENDING", "PENDING"),
        (1, [("BUNDLE-4", None, 1)], "GCASH", "PAID", "CLAIMED"),
    ]

    for i, (user_index, lines, payment_method, payment_status, fulfillment_status) in enumerate(order_lines):
        order_id = repo.next_order_id(now.year)
        total = 0.0
        item_rows = []
        for pid_or_bundle, variant, qty in lines:
            if pid_or_bundle.startswith("BUNDLE"):
                bundle = bundles_by_id[pid_or_bundle]
                subtotal = round(bundle.price * qty, 2)
                item_rows.append(OrderItem(order_item_id="", order_id=order_id, product_id=bundle.bundle_id,
                                            product_name=bundle.name, quantity=qty, unit_price=bundle.price,
                                            subtotal=subtotal, variant="", bundle_id=bundle.bundle_id))
            else:
                product = products_by_id[pid_or_bundle]
                subtotal = round(product.price * qty, 2)
                item_rows.append(OrderItem(order_item_id="", order_id=order_id, product_id=product.product_id,
                                            product_name=product.name, quantity=qty, unit_price=product.price,
                                            subtotal=subtotal, variant=variant or "", bundle_id=""))
            total += subtotal

        order_created = now - timedelta(days=len(order_lines) - i)
        claimed_at = order_created + timedelta(hours=2) if fulfillment_status == "CLAIMED" else None
        claimed_by = "Sam Reyes" if fulfillment_status == "CLAIMED" else ""

        repo.create_order(
            Order(
                order_id=order_id, user_id=users[user_index].user_id, order_date=order_created,
                total_amount=round(total, 2), payment_method=payment_method, payment_status=payment_status,
                fulfillment_status=fulfillment_status, notes="", created_at=order_created, updated_at=order_created,
                claimed_at=claimed_at, claimed_by=claimed_by,
            )
        )
        for item in item_rows:
            repo.create_order_item(item)

    print(f"Seeded {len(users)} parents, {len(players)} players, {len(products_by_id)} products, "
          f"{len(bundles_by_id)} bundles, {len(order_lines)} orders.")
    print("Dev admin login: Bearer dev:dev-admin-1  |  Dev staff login: Bearer dev:dev-staff-1")
    print("Dev parent logins: " + ", ".join(f"dev:dev-parent-{i+1}" for i in range(len(users))))


if __name__ == "__main__":
    seed()
