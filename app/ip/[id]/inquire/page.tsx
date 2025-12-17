"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { IPAsset, UserProfile } from "@/lib/types";
import { createInquiry } from "./actions";

const PURPOSE_OPTIONS = ["ads", "sns", "app", "education", "ai"] as const;
const REGION_OPTIONS = ["jp", "global"] as const;

export default function InquiryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const supabase = useMemo(() => createBrowserClient(), []);

  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [purpose, setPurpose] = useState<(typeof PURPOSE_OPTIONS)[number]>("ads");
  const [region, setRegion] = useState<(typeof REGION_OPTIONS)[number]>("jp");
  const [media, setMedia] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [secondaryUse, setSecondaryUse] = useState(false);
  const [derivative, setDerivative] = useState(false);
  const [aiUse, setAiUse] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [message, setMessage] = useState("");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentRoleLabel =
    profile?.role === "creator"
      ? "クリエイター"
      : profile?.role === "company"
        ? "企業"
        : "未ログイン";

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      setStatusText(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatusText("ログインしてください");
        return;
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (!userProfile || userProfile.role !== "company") {
        setStatusText("企業ロールでログインすると問い合わせできます");
      }

      setProfile(userProfile ?? null);

      const { data: assetData, error } = await supabase
        .from("ip_assets")
        .select("*")
        .eq("id", id)
        .single<IPAsset>();

      if (error || !assetData) {
        setStatusText(error?.message ?? "IPが見つかりません。");
        return;
      }
      if (assetData.status === "draft") {
        setStatusText("IPが公開されていません。");
        return;
      }
      if (assetData.ai_meta) {
        const keywords = Array.isArray(assetData.ai_meta.keywords)
          ? (assetData.ai_meta.keywords as string[]).slice(0, 5).join(", ")
          : "";
        const lang = assetData.ai_meta.language ? `言語: ${assetData.ai_meta.language}\n` : "";
        const template = `用途: （例: 広告 / SNS / アプリ）\n希望尺: （例: 15秒 / 30秒）\n利用期間: （開始日〜終了日）\n配信地域: （例: JP / Global）\nキーワード: ${keywords}\n${lang}`;
        setMessage(template);
      }
      setAsset(assetData);
    };

    init();
  }, [id, router, supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!asset || !profile) {
      setStatusText("必要な情報を取得できませんでした。再度ログインしてください。");
      return;
    }

    if (!purpose || !region) {
      setStatusText("利用目的と利用地域は必須です。");
      return;
    }

    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
      setStatusText("予算の下限は上限以下にしてください。");
      return;
    }

    if (periodStart && periodEnd && new Date(periodStart) > new Date(periodEnd)) {
      setStatusText("開始日は終了日以前にしてください。");
      return;
    }
    setLoading(true);
    setStatusText(null);

    try {
      const formData = new FormData();
      formData.append("purpose", purpose);
      formData.append("region", region);
      if (media) formData.append("media", media);
      if (periodStart) formData.append("period_start", periodStart);
      if (periodEnd) formData.append("period_end", periodEnd);
      if (secondaryUse) formData.append("secondary_use", "on");
      if (derivative) formData.append("derivative", "on");
      if (aiUse) formData.append("ai_use", "on");
      if (budgetMin) formData.append("budget_min", budgetMin);
      if (budgetMax) formData.append("budget_max", budgetMax);
      if (message) formData.append("message", message);

      await createInquiry(asset.id, formData);
      setStatusText("問い合わせを送信しました");
      router.push("/company/inquiries");
    } catch (err) {
      setStatusText((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!id && !statusText) {
    return <p className="mt-10 text-sm text-neutral-600">読み込み中…</p>;
  }

  if (!asset) {
    return (
      <p className="mt-10 text-sm text-neutral-600">
        {statusText ?? "読み込み中…"}
      </p>
    );
  }

  return (
    <section className="mx-auto mt-8 max-w-2xl space-y-6 rounded-2xl border border-neutral-200 bg-white p-8">
      <div>
        <p className="text-sm text-neutral-600">問い合わせ</p>
        <h1 className="text-2xl font-semibold text-neutral-900">{asset.title}</h1>
      </div>
      {!profile || profile.role !== "company" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          企業アカウントでログインすると問い合わせできます。現在のロール:{" "}
          <span className="font-semibold">{currentRoleLabel}</span>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-neutral-800">
          利用目的 *
          <select
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={purpose}
            onChange={(event) =>
              setPurpose(event.target.value as (typeof PURPOSE_OPTIONS)[number])
            }
            required
          >
            {PURPOSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-neutral-800">
          媒体
          <input
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={media}
            onChange={(event) => setMedia(event.target.value)}
            placeholder="例: TV, TikTok, App"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            利用開始日
            <input
              type="date"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            利用終了日
            <input
              type="date"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-neutral-800">
          利用地域 *
          <select
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={region}
            onChange={(event) =>
              setRegion(event.target.value as (typeof REGION_OPTIONS)[number])
            }
            required
          >
            {REGION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={secondaryUse}
              onChange={(event) => setSecondaryUse(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            二次利用
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={derivative}
              onChange={(event) => setDerivative(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            改変
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={aiUse}
              onChange={(event) => setAiUse(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            AI利用
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            予算下限
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            予算上限
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-neutral-800">
          メッセージ
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="案件の背景や希望条件などがあれば記入してください"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !profile || profile.role !== "company"}
          className="w-full rounded-full bg-neutral-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "送信中…" : "問い合わせを送信"}
        </button>
      </form>
      {statusText && (
        <p className="text-sm text-neutral-700" role="status">
          {statusText}
        </p>
      )}
    </section>
  );
}
