import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider } from "@/contexts/CartContext";
import ShopPage from "./page";
import { listProducts } from "@/services/api/products";
import { listBundles } from "@/services/api/bundles";

vi.mock("@/services/api/products", () => ({
  listProducts: vi.fn(),
}));
vi.mock("@/services/api/bundles", () => ({
  listBundles: vi.fn(),
}));

const shirt = {
  product_id: "VINTA",
  name: "Vinta Shirt (Blue)",
  description: "Official event shirt, blue colorway.",
  category: "SHIRT" as const,
  price: 550,
  stock: 0,
  active: true,
  image_url: "",
  variant_required: true,
  variants: [
    { variant: "S", stock: 10 },
    { variant: "M", stock: 5 },
  ],
};

const item = {
  product_id: "MEAL",
  name: "Meal Stub",
  description: "Redeemable for one event meal.",
  category: "ITEM" as const,
  price: 150,
  stock: 300,
  active: true,
  image_url: "",
  variant_required: false,
  variants: [],
};

const bundle = {
  bundle_id: "BUNDLE-1",
  name: "Bundle 1",
  description: "Bundle 1: 1x Meal Stub, 1x Water",
  price: 153,
  active: true,
  items: [{ product_id: "MEAL", product_name: "Meal Stub", quantity: 1 }],
  individual_total: 180,
  savings: 27,
};

function renderShopPage() {
  return render(
    <CartProvider>
      <ShopPage />
    </CartProvider>
  );
}

describe("ShopPage", () => {
  it("renders shirts, items, and bundles returned by the API", async () => {
    vi.mocked(listProducts).mockResolvedValue([shirt, item]);
    vi.mocked(listBundles).mockResolvedValue([bundle]);

    renderShopPage();

    expect(await screen.findByText("Vinta Shirt (Blue)")).toBeInTheDocument();
    expect(screen.getByText("Meal Stub")).toBeInTheDocument();
    expect(screen.getByText("Bundle 1")).toBeInTheDocument();

    // Section headings render in the fixed order the spec requires.
    expect(screen.getByRole("heading", { name: "Event Shirts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Individual Event Items" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bundles" })).toBeInTheDocument();

    // The backend-provided savings figure is shown verbatim, never computed.
    expect(screen.getByText("You save ₱27.00")).toBeInTheDocument();
  });

  it("shows an empty state per section when the API returns nothing", async () => {
    vi.mocked(listProducts).mockResolvedValue([]);
    vi.mocked(listBundles).mockResolvedValue([]);

    renderShopPage();

    expect(await screen.findByText("No shirts available right now")).toBeInTheDocument();
    expect(screen.getByText("No items available right now")).toBeInTheDocument();
    expect(screen.getByText("No bundles available right now")).toBeInTheDocument();
  });
});
