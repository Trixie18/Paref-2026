"use client";

import { useEffect, useState } from "react";
import { listProducts } from "@/services/api/products";
import { listBundles } from "@/services/api/bundles";
import { getErrorMessage } from "@/services/api/http";
import { Bundle, Product } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShirtCard } from "@/components/shop/ShirtCard";
import { ItemCard } from "@/components/shop/ItemCard";
import { BundleCard } from "@/components/shop/BundleCard";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProducts(), listBundles()])
      .then(([productList, bundleList]) => {
        setProducts(productList);
        setBundles(bundleList);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const shirts = products.filter((p) => p.category === "SHIRT");
  const items = products.filter((p) => p.category === "ITEM");

  return (
    <div>
      <PageHeader title="Event Shop" subtitle="Shirts, individual items, and bundles for the event." />
      <ErrorBanner message={error} />

      <section className="mb-10" aria-labelledby="shirts-heading">
        <h2 id="shirts-heading" className="mb-3 text-base font-semibold text-navy">
          Event Shirts
        </h2>
        {shirts.length === 0 ? (
          <EmptyState title="No shirts available right now" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shirts.map((product) => (
              <ShirtCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10" aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-3 text-base font-semibold text-navy">
          Individual Event Items
        </h2>
        {items.length === 0 ? (
          <EmptyState title="No items available right now" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((product) => (
              <ItemCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="bundles-heading">
        <h2 id="bundles-heading" className="mb-3 text-base font-semibold text-navy">
          Bundles
        </h2>
        {bundles.length === 0 ? (
          <EmptyState title="No bundles available right now" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.bundle_id} bundle={bundle} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
