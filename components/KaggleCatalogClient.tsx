"use client";

import { useMemo, useState } from "react";
import KaggleProductCard, { type KaggleProductCardData } from "./KaggleProductCard";

type Props = {
  products: KaggleProductCardData[];
  categories: string[];
};

export default function KaggleCatalogClient({ products, categories }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.categories.some((category) => category.toLowerCase().includes(term));

      const matchesCategory =
        selectedCategory === "all" || product.categories.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search FixAI Online Shop"
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none ring-0 focus:border-zinc-500"
        />

        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none ring-0 focus:border-zinc-500"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-zinc-600">Showing {filteredProducts.length} products</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.map((product) => (
          <KaggleProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
