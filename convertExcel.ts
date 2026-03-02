import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

type ProductVariant = "gadget" | "appliances" | "refrigerators" | "others";
type ProductStatus = "new" | "hot" | "sale";

interface KaggleRow {
  asin?: string;
  title?: string;
  imgUrl?: string;
  productURL?: string;
  stars?: string;
  reviews?: string;
  price?: string;
  isBestSeller?: string;
  boughtInLastMonth?: string;
  categoryName?: string;
}

interface ExistingCategory {
  _id: string;
  slug: string;
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "z3qs8u7v";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_API_READ_TOKEN;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-03-20";

const jsonFile = process.argv[2] || "filtered-kaggle-products.json";
const batchSize = Number(process.env.IMPORT_BATCH_SIZE || 100);

if (!token) {
  throw new Error("Missing SANITY_API_TOKEN (or SANITY_API_READ_TOKEN) in .env");
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: string | undefined): boolean {
  return String(value || "")
    .trim()
    .toLowerCase() === "true";
}

function normalizeCategory(categoryName: string | undefined): string {
  const category = (categoryName || "").trim();
  return category.length ? category : "Uncategorized";
}

function mapVariant(categoryName: string): ProductVariant {
  const c = categoryName.toLowerCase();

  if (/refrigerator|fridge|freezer/.test(c)) return "refrigerators";
  if (
    /appliance|kitchen|microwave|oven|toaster|kettle|coffee|blender|vacuum|dishwasher|washing/.test(
      c
    )
  ) {
    return "appliances";
  }
  if (
    /speaker|audio|headphone|camera|phone|tablet|laptop|computer|monitor|gaming|smart|electronics?/.test(
      c
    )
  ) {
    return "gadget";
  }

  return "others";
}

function buildSlugFromTitle(title: string, asin: string): string {
  const titleSlug = slugify(title) || "product";
  const asinSlug = slugify(asin) || "item";
  const suffix = `-${asinSlug}`;
  const maxBaseLength = 96 - suffix.length;
  return `${titleSlug.slice(0, Math.max(1, maxBaseLength))}${suffix}`;
}

async function ensureCategories(rows: KaggleRow[]): Promise<Map<string, string>> {
  const categoryNames = Array.from(
    new Set(rows.map((row) => normalizeCategory(row.categoryName)))
  );
  const slugs = categoryNames.map((name) => slugify(name));

  const existing = await client.fetch<ExistingCategory[]>(
    `*[_type == "category" && slug.current in $slugs]{
      _id,
      "slug": slug.current
    }`,
    { slugs }
  );

  const categoryBySlug = new Map(existing.map((item) => [item.slug, item._id]));

  const missing = categoryNames.filter((name) => !categoryBySlug.has(slugify(name)));

  for (let i = 0; i < missing.length; i += batchSize) {
    const chunk = missing.slice(i, i + batchSize);
    let tx = client.transaction();

    for (const categoryName of chunk) {
      const categorySlug = slugify(categoryName);
      const categoryId = `category-${categorySlug}`;
      tx = tx.createIfNotExists({
        _id: categoryId,
        _type: "category",
        title: categoryName,
        slug: { _type: "slug", current: categorySlug },
        description: `Imported category: ${categoryName}`,
        featured: false,
      });
      categoryBySlug.set(categorySlug, categoryId);
    }

    await tx.commit();
  }

  return categoryBySlug;
}

function buildProductDocument(
  row: KaggleRow,
  index: number,
  categoryBySlug: Map<string, string>
) {
  const asin = (row.asin || `row-${index + 1}`).trim();
  const name = (row.title || `Imported Product ${index + 1}`).trim();
  const categoryName = normalizeCategory(row.categoryName);
  const categorySlug = slugify(categoryName);
  const categoryId = categoryBySlug.get(categorySlug) || `category-${categorySlug}`;

  const isBestSeller = toBoolean(row.isBestSeller);
  const status: ProductStatus = isBestSeller ? "hot" : "new";

  const boughtInLastMonth = Math.floor(toNumber(row.boughtInLastMonth, 0));
  const stock = Math.max(1, boughtInLastMonth || 10);

  return {
    _id: `product-${slugify(asin)}`,
    _type: "product",
    name,
    slug: { _type: "slug", current: buildSlugFromTitle(name, asin) },
    description: `${name}\n\nImported from Kaggle dataset (${categoryName}).`,
    price: toNumber(row.price, 0),
    discount: 0,
    categories: [
      {
        _key: `cat-${categorySlug}`,
        _type: "reference",
        _ref: categoryId,
      },
    ],
    stock,
    status,
    variant: mapVariant(categoryName),
    isFeatured: isBestSeller,
    // Extra fields from Kaggle retained for future use.
    externalImageUrl: row.imgUrl || null,
    externalProductUrl: row.productURL || null,
    rating: toNumber(row.stars, 0),
    reviewCount: Math.floor(toNumber(row.reviews, 0)),
  };
}

async function importProducts() {
  const resolvedPath = path.resolve(process.cwd(), jsonFile);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Data file not found: ${resolvedPath}`);
  }

  const rows = JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as KaggleRow[];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("JSON file does not contain a valid products array");
  }

  console.log(
    `Starting import: ${rows.length} products -> ${projectId}/${dataset} (batch ${batchSize})`
  );

  const categoryBySlug = await ensureCategories(rows);
  console.log(`Categories ready: ${categoryBySlug.size}`);

  const docs = rows.map((row, index) => buildProductDocument(row, index, categoryBySlug));

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    let tx = client.transaction();

    for (const doc of chunk) {
      tx = tx.createOrReplace(doc);
    }

    await tx.commit();
    console.log(`Imported ${Math.min(i + batchSize, docs.length)} / ${docs.length}`);
  }

  console.log("Import complete.");
}

importProducts().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});