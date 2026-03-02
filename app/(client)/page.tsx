import Container from "@/components/Container";
import HomeBanner from "@/components/HomeBanner";
import HomeCategories from "@/components/HomeCategories";
import KaggleCatalogClient from "@/components/KaggleCatalogClient";
import LatestBlog from "@/components/LatestBlog";
import ProductGrid from "@/components/ProductGrid";
import ShopByBrands from "@/components/ShopByBrands";
import Title from "@/components/Title";
import {
  getCategories,
  getImportedCatalogProducts,
  getImportedCategoryTitles,
} from "@/sanity/queries";

import React from "react";

const Home = async () => {
  const [categories, importedProducts, importedCategories] = await Promise.all([
    getCategories(6),
    getImportedCatalogProducts(240),
    getImportedCategoryTitles(),
  ]);

  return (
    <Container className="bg-shop-light-pink">
      <HomeBanner />
      <ProductGrid />
      <div className="my-10 rounded-md border border-zinc-200 bg-white p-5 lg:p-7">
        <Title className="border-b pb-3">Imported Catalog</Title>
        <div className="mt-5">
          <KaggleCatalogClient
            products={importedProducts}
            categories={importedCategories}
          />
        </div>
      </div>
      <HomeCategories categories={categories} />
      <ShopByBrands />
      <LatestBlog />
    </Container>
  );
};

export default Home;
