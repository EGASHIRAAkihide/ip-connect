"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { IPAsset } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function PublicIPListing() {
  const { t } = useLanguage();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [assets, setAssets] = useState<IPAsset[]>([]);
  const [assetTypeFilter, setAssetTypeFilter] = useState<
    "all" | "choreography" | "voice"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("ip_assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setAssets(data as IPAsset[]);
      setLoading(false);
    };

    loadAssets();
  }, []);

  const filteredAssets =
    assetTypeFilter === "all"
      ? assets
      : assets.filter((asset) => asset.asset_type === assetTypeFilter);

  if (loading) {
    return <p className="mt-10 text-sm text-neutral-600">{t("loading")}</p>;
  }

  if (error) {
    return (
      <p className="mt-10 text-sm text-neutral-700" role="alert">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-6 py-8">
      <div>
        <p className="text-sm text-neutral-600">Company view</p>
        <h1 className="text-3xl font-semibold text-neutral-900">
          {t("ip_browse_title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Review available assets, open a detail page, and submit an inquiry.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {["all", "choreography", "voice"].map((type) => {
          const active = assetTypeFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setAssetTypeFilter(type as typeof assetTypeFilter)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              {type === "all"
                ? "All"
                : type === "choreography"
                  ? "振付"
                  : "声"}
            </button>
          );
        })}
      </div>
      {filteredAssets.length === 0 ? (
        <p className="text-sm text-neutral-600">{t("ip_no_assets")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAssets.map((asset) => (
            <article
              key={asset.id}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {asset.category === "voice"
                  ? t("ip_category_voice")
                  : asset.category === "illustration"
                    ? t("ip_category_illustration")
                    : t("ip_category_choreography")}
              </p>
              {asset.asset_type && (
                <span
                  className="mt-2 inline-block rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700"
                  aria-label="asset type"
                >
                  {asset.asset_type === "choreography" ? "振付" : "声"}
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
