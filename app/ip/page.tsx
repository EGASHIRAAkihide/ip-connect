'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import type { IPAsset } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function PublicIPListing() {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<IPAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      const { data, error } = await supabaseClient
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

  if (loading) {
    return <p className="mt-10 text-slate-300">{t("loading")}</p>;
  }

  if (error) {
    return (
      <p className="mt-10 text-sm text-amber-300" role="alert">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-6 py-8">
      <div>
        <p className="text-sm text-slate-400">Company view</p>
        <h1 className="text-3xl font-semibold text-white">
          {t("ip_browse_title")}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Review available assets, open a detail page, and submit an inquiry.
        </p>
      </div>
      {assets.length === 0 ? (
        <p className="text-sm text-slate-400">{t("ip_no_assets")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <article
              key={asset.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {asset.category === "voice"
                  ? t("ip_category_voice")
                  : asset.category === "illustration"
                    ? t("ip_category_illustration")
                    : t("ip_category_choreography")}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                {asset.title}
              </h2>
              {asset.description && (
                <p className="mt-2 text-sm text-slate-300">
                  {asset.description}
                </p>
              )}
              <div className="mt-3 text-sm text-slate-400">
                {asset.price_min && asset.price_max
                  ? `Price guide: $${asset.price_min}–$${asset.price_max}`
                  : "Price provided upon inquiry"}
              </div>
              <Link
                href={`/ip/${asset.id}`}
                className="mt-4 inline-flex rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
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
