import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getServerUserWithRole } from "@/lib/auth";
import type { InquiryStatus, IPAsset, UserProfile } from "@/lib/types";

type PageProps = {
  params: { id: string };
};

const PURPOSE_LABELS: Record<string, string> = {
  ads: "広告",
  sns: "SNS",
  app: "アプリ",
  education: "教育",
  ai: "AI",
};

const statusStyles: Record<InquiryStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-neutral-100", text: "text-neutral-700", label: "未対応" },
  in_review: { bg: "bg-amber-100", text: "text-amber-800", label: "検討中" },
  accepted: { bg: "bg-emerald-100", text: "text-emerald-800", label: "承認" },
  rejected: { bg: "bg-rose-100", text: "text-rose-700", label: "却下" },
};

export default async function CompanyInquiryDetailPage({ params }: PageProps) {
  const { user, role } = await getServerUserWithRole();
  if (!user) {
    redirect("/auth/login");
  }
  if (role !== "company") {
    redirect("/ip");
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        asset_id,
        status,
        purpose,
        media,
        region,
        period_start,
        period_end,
        secondary_use,
        derivative,
        ai_use,
        budget_min,
        budget_max,
        message,
        created_at,
        ip_assets:asset_id (
          id,
          title,
          type,
          asset_type
        ),
        creator:creator_user_id (
          id,
          email,
          role
        )
      `,
    )
    .eq("id", params.id)
    .eq("company_user_id", user.id)
    .single();

  if (error || !data) {
    return notFound();
  }

  const asset = Array.isArray(data.ip_assets)
    ? (data.ip_assets[0] as IPAsset | undefined)
    : (data.ip_assets as IPAsset | null);
  const creator = Array.isArray(data.creator)
    ? (data.creator[0] as UserProfile | undefined)
    : (data.creator as UserProfile | null);

  const createdAt = data.created_at ? new Date(data.created_at).toLocaleString() : "—";
  const statusStyle = statusStyles[data.status as InquiryStatus];
  const assetTypeRaw = asset?.type ?? asset?.asset_type ?? null;
  const assetTypeLabel = assetTypeRaw === "voice" ? "声" : assetTypeRaw === "choreography" ? "振付" : "IP";

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          企業ダッシュボード
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">送信した問い合わせ</h1>
            <p className="text-sm text-neutral-600">
              {assetTypeLabel}
            </p>
            <p className="text-lg text-neutral-800">{asset?.title ?? "タイトル未設定"}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-4 py-1 text-sm font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">クリエイター</h2>
        {creator ? (
          <Link
            href={`/users/${creator.id}`}
            className="text-sm text-neutral-900 underline"
          >
            {creator.email}
          </Link>
        ) : (
          <p className="text-sm text-neutral-700">クリエイター情報なし</p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">問い合わせ内容</h2>
        <dl className="grid gap-4 text-sm text-neutral-700 md:grid-cols-2">
          <div>
            <dt className="text-neutral-500">利用目的</dt>
            <dd>{data.purpose ? PURPOSE_LABELS[data.purpose] ?? data.purpose : "未記入"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">媒体</dt>
            <dd>{data.media ?? "未記入"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">利用地域</dt>
            <dd>{data.region ?? "未記入"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">利用期間</dt>
            <dd>
              {data.period_start ? data.period_start : "—"}{" "}
              {data.period_end ? `~ ${data.period_end}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">AI利用</dt>
            <dd>{data.ai_use === null ? "—" : data.ai_use ? "可" : "不可"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">二次利用</dt>
            <dd>
              {data.secondary_use === null ? "—" : data.secondary_use ? "可" : "不可"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">改変</dt>
            <dd>{data.derivative === null ? "—" : data.derivative ? "可" : "不可"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">予算</dt>
            <dd>
              {data.budget_min || data.budget_max
                ? `${data.budget_min ? `¥${Number(data.budget_min).toLocaleString()}` : "—"} ~ ${
                    data.budget_max ? `¥${Number(data.budget_max).toLocaleString()}` : "—"
                  }`
                : "未記入"}
            </dd>
          </div>
        </dl>
        {data.message && (
          <div>
            <dt className="text-sm font-medium text-neutral-700">メッセージ</dt>
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-800">
              {data.message}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 space-y-1">
        <p>送信日時: {createdAt}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/company/inquiries"
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          問い合わせ一覧へ戻る
        </Link>
        <Link
          href={`/ip/${data.asset_id}`}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          IP詳細を見る
        </Link>
      </div>
    </section>
  );
}
