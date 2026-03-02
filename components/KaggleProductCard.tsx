import Link from "next/link";
import { urlFor } from "@/sanity/lib/image";

type SanityImageRef = {
  asset?: {
    _ref?: string;
  };
};

export type KaggleProductCardData = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  categories: string[];
  image?: SanityImageRef | null;
  imageUrl?: string | null;
};

const fallbackImage =
  "https://placehold.co/600x600/f4f4f5/18181b?text=No+Image";

export default function KaggleProductCard({
  product,
}: {
  product: KaggleProductCardData;
}) {
  const resolvedImageUrl = product.image?.asset?._ref
    ? urlFor(product.image).url()
    : product.imageUrl || fallbackImage;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <Link href={`/product/${product.slug}`} className="block">
        <img
          src={resolvedImageUrl}
          alt={product.name}
          loading="lazy"
          className="h-52 w-full rounded-md object-cover"
        />
      </Link>

      <div className="mt-3 space-y-2">
        <p className="text-xs text-zinc-500 line-clamp-1">
          {product.categories.join(", ") || "Uncategorized"}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
          {product.name}
        </h3>
        <p className="text-base font-bold text-zinc-900">
          ${Number(product.price || 0).toFixed(2)}
        </p>
      </div>
    </article>
  );
}
