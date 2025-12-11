import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { IPAsset } from "@/lib/types";

type PageProps = {
  searchParams?: { type?: string };
};

function resolveTypeFilter(raw?: string) {
  if (raw === "choreography" || raw === "voice") return raw;
  return "all" as const;
}

function typeLabel(type: string) {
  return type === "choreography" ? "振付" : type === "voice" ? "声" : type;
}

export default async function PublicIPListing({ searchParams }: PageProps) {
  const typeFilter = resolveTypeFilter(searchParams?.type);
  const supabase = await createServerClient();

  const query = supabase.from("ip_assets").select("*").order("created_at", { ascending: false });
  const { data, error } =
    typeFilter === "all"
      ? await query
      : await query.eq("asset_type", typeFilter);

  if (error) {
    return (
      <p className="mt-10 text-sm text-neutral-700" role="alert">
        Failed to load IP catalog: {error.message}
      </p>
    );
  }

  const assets = (data as IPAsset[]) ?? [];
  const filteredAssets =
    typeFilter === "all"
      ? assets
      : assets.filter((asset) => asset.asset_type === typeFilter);

  return (
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-600">Company view</p>
          <h1 className="text-3xl font-semibold text-neutral-900">Browse IP catalog</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Review available assets, open a detail page, and submit an inquiry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {["all", "choreography", "voice"].map((type) => {
            const active = typeFilter === type;
            const href = type === "all" ? "/ip" : `/ip?type=${type}`;
            return (
              <Link
                key={type}
                href={href}
                className={`rounded-full border px-3 py-1 transition ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                }`}
              >
                {type === "all" ? "All" : typeLabel(type)}
              </Link>
            );
          })}
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <p className="text-sm text-neutral-600">No assets found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAssets.map((asset) => (
            <article
              key={asset.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {asset.category === "voice"
                  ? "Voice"
                  : asset.category === "illustration"
                    ? "Illustration"
                    : "Choreography"}
              </p>
              {asset.asset_type && (
                <span
                  className="mt-2 inline-block rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700"
                  aria-label="asset type"
                >
                  {typeLabel(asset.asset_type)}
                </span>
              )}
              <h2 className="mt-1 text-2xl font-semibold text-neutral-900">
                {asset.title}
              </h2>
              {asset.description && (
                <p className="mt-2 text-sm text-neutral-700">
                  {asset.description}
                </p>
              )}
              <div className="mt-3 text-sm text-neutral-600">
                {asset.price_min && asset.price_max
                  ? `Price guide: $${asset.price_min}–$${asset.price_max}`
                  : "Price provided upon inquiry"}
              </div>
              <Link
                href={`/ip/${asset.id}`}
                className="mt-4 inline-flex rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                View details
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
