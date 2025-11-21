"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  INQUIRY_PURPOSES,
  REGION_OPTIONS,
  type IPAsset,
  type UserProfile,
} from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function InquiryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t } = useLanguage();

  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [purpose, setPurpose] = useState<(typeof INQUIRY_PURPOSES)[number]>(
    INQUIRY_PURPOSES[0],
  );
  const [region, setRegion] = useState<(typeof REGION_OPTIONS)[number]>("JP");
  const [period, setPeriod] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      setStatusText(null);

      console.log("InquiryPage id from useParams:", id);

      const { data: assetData, error } = await supabaseClient
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

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data: profileData } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();
      if (!profileData) {
        router.replace("/auth/register");
        return;
      }
      if (profileData.role !== "company") {
        router.replace("/ip");
        return;
      }
      setProfile(profileData);
    };

    init();
  }, [id, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset || !profile) {
      return;
    }
    if (!purpose || !region || !message) {
      setStatusText("Purpose, region, and message are required.");
      return;
    }
    setLoading(true);
    setStatusText(null);

    try {
      const payload = {
        ip_id: asset.id,
        creator_id: asset.creator_id,
        company_id: profile.id,
        purpose,
        region,
        period,
        budget: budget ? Number(budget) : null,
        message,
        status: "pending",
      };
      const { error } = await supabaseClient
        .from("inquiries")
        .insert(payload);
      if (error) {
        throw new Error(error.message);
      }
      setStatusText("Inquiry submitted!");
      router.push("/ip");
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
          {t("inquiry_usage_purpose")} *
          <select
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={purpose}
            onChange={(event) =>
              setPurpose(
                event.target.value as (typeof INQUIRY_PURPOSES)[number],
              )
            }
          >
            {INQUIRY_PURPOSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-200">
          {t("inquiry_region")} *
          <select
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={region}
            onChange={(event) =>
              setRegion(
                event.target.value as (typeof REGION_OPTIONS)[number],
              )
            }
          >
            {REGION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-200">
          {t("inquiry_period")}
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            placeholder="e.g., 3 months, single campaign"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          {t("inquiry_budget")}
          <input
            type="number"
            min="0"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          {t("inquiry_message")} *
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-white"
            rows={4}
            required
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
