"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { IPAsset } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createInquiry } from "./actions";

export default function InquiryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t } = useLanguage();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [purpose, setPurpose] = useState("");
  const [usageMedia, setUsageMedia] = useState("");
  const [usagePeriod, setUsagePeriod] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      setStatusText(null);

      console.log("InquiryPage id from useParams:", id);

      const { data: assetData, error } = await supabase
        .from("ip_assets")
        .select("*")
        .eq("id", id)
        .single<IPAsset>();

      if (error || !assetData) {
        console.log("asset error:", error);
        setStatusText(error?.message ?? "Asset not found.");
        return;
      }
      setAsset(assetData);
    };

    init();
  }, [id, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset) {
      setStatusText("Asset not loaded.");
      return;
    }
    if (!purpose || !usageMedia || !usagePeriod) {
      setStatusText("Usage purpose, media, and period are required.");
      return;
    }
    setLoading(true);
    setStatusText(null);

    try {
      const formData = new FormData();
      formData.append("usage_purpose", purpose);
      formData.append("usage_media", usageMedia);
      formData.append("usage_period", usagePeriod);
      if (budget) formData.append("budget", budget);
      if (message) formData.append("message", message);
      formData.append("creator_id", asset.creator_id);

      await createInquiry(asset.id, formData);
      setStatusText("Inquiry submitted!");
      router.push("/company/inquiries");
    } catch (err) {
      setStatusText((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!id && !statusText) {
    return (
      <p className="mt-10 text-sm text-slate-400">{t("loading")}</p>
    );
  }

  if (!asset) {
    return (
      <p className="mt-10 text-sm text-slate-400">
        {statusText ?? t("loading")}
      </p>
    );
  }

  return (
    <section className="mx-auto mt-8 max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8">
      <div>
        <p className="text-sm text-slate-400">{t("inquiry_request_title")}</p>
        <h1 className="text-2xl font-semibold text-white">{asset.title}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Usage purpose *
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="e.g., Ad campaign, SNS promo"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Usage media *
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={usageMedia}
            onChange={(event) => setUsageMedia(event.target.value)}
            placeholder="e.g., TikTok, YouTube, TV"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Usage period *
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            placeholder="e.g., 3 months, single campaign"
            value={usagePeriod}
            onChange={(event) => setUsagePeriod(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Budget
          <input
            type="number"
            min="0"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Message
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Provide context, campaign info, or questions"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {loading ? t("loading") : t("inquiry_submit")}
        </button>
      </form>
      {statusText && (
        <p className="text-sm text-amber-300" role="status">
          {statusText}
        </p>
      )}
    </section>
  );
}
