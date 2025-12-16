import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";
import { acceptInquiry, moveInquiryToReview, rejectInquiry } from "./actions";
import { getServerUserWithRole } from "@/lib/auth";

type InquiryWithRelations = {
  id: string;
  asset_id: string;
  purpose: string | null;
  region: string | null;
  media: string | null;
  period_start: string | null;
  period_end: string | null;
  secondary_use: boolean | null;
  derivative: boolean | null;
  ai_use: boolean | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string | null;
  ip_assets:
    | { id: string; title: string | null; created_by: string; type?: string | null; asset_type?: string | null }
    | { id: string; title: string | null; created_by: string; type?: string | null; asset_type?: string | null }[]
    | null;
  company?: {
    id: string;
    email: string;
    role: string;
  } | null;
  inquiry_events?:
    | {
        id: string;
        event_type: string;
        payload: Record<string, unknown> | null;
        created_at: string;
      }[]
    | null;
};

type PageProps = {
  params: { id: string };
};

const statusLabels: Record<InquiryStatus, string> = {
  new: "未対応",
  in_review: "検討中",
  accepted: "承認",
  rejected: "却下",
};

const PURPOSE_LABELS: Record<string, string> = {
  ads: "広告",
  sns: "SNS",
  app: "アプリ",
  education: "教育",
  ai: "AI",
};

export default async function CreatorInquiryDetailPage({ params }: PageProps) {
  const inquiryId = params.id;
  const { user, role } = await getServerUserWithRole();

  if (!user) {
    redirect("/auth/login");
  }

  if (role !== "creator") {
    redirect("/ip");
  }

  const supabase = await createServerClient();

  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        asset_id,
        purpose,
        region,
        media,
        period_start,
        period_end,
        secondary_use,
        derivative,
        ai_use,
        budget_min,
        budget_max,
        message,
        status,
        created_at,
        ip_assets:asset_id (
          id,
          title,
          created_by,
          type,
          asset_type
        ),
        company:company_user_id (
          id,
          email,
          role
        ),
        inquiry_events (
          id,
          event_type,
          payload,
          created_at
        )
      `,
    )
    .eq("id", inquiryId)
    .single<InquiryWithRelations>();

  if (error || !inquiry) {
    return notFound();
  }

  // ip_assets が「配列 or 単一オブジェクト」の両方に対応
  let assetCreatorId: string | null = null;
  const ipAssets = inquiry.ip_assets;

  if (ipAssets) {
    if (Array.isArray(ipAssets)) {
      if (ipAssets.length > 0) {
        assetCreatorId = ipAssets[0]?.created_by ?? null;
      }
    } else {
      assetCreatorId = ipAssets.created_by ?? null;
    }
  }

  if (assetCreatorId !== user.id) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <p className="text-sm text-neutral-700">この問い合わせを表示する権限がありません。</p>
        <Link
          href="/creator/inquiries"
          className="inline-flex rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
        >
          受信箱に戻る
        </Link>
      </section>
    );
  }

  const ipAssetForView = Array.isArray(ipAssets)
    ? ipAssets[0] ?? null
    : ipAssets ?? null;

  const createdAt = inquiry.created_at
    ? new Date(inquiry.created_at).toLocaleString()
    : null;

  const reviewAction = moveInquiryToReview.bind(null, inquiry.id);
  const approveAction = acceptInquiry.bind(null, inquiry.id);
  const rejectAction = rejectInquiry.bind(null, inquiry.id);

  const sortedEvents =
    inquiry.inquiry_events?.slice().sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }) ?? [];

  const eventLabel = (type: string) => {
    switch (type) {
      case "created":
        return "問い合わせ作成";
      case "in_review":
        return "検討中へ変更";
      case "accepted":
        return "クリエイターが承認";
      case "rejected":
        return "クリエイターが却下";
      default:
        return type;
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          クリエイター受信箱
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">
              {ipAssetForView?.title ?? "タイトル未設定"}
            </h1>
            <p className="text-sm text-neutral-600">
              IP ID: {ipAssetForView?.id ?? inquiry.asset_id}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-neutral-800">
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs uppercase tracking-wide">
              ステータス: {statusLabels[inquiry.status] ?? inquiry.status}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">問い合わせ内容</h2>
        <dl className="grid gap-4 text-sm text-neutral-700 md:grid-cols-2">
          <div>
            <dt className="text-neutral-500">利用目的</dt>
            <dd>{inquiry.purpose ? PURPOSE_LABELS[inquiry.purpose] ?? inquiry.purpose : "未記入"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">媒体</dt>
            <dd>{inquiry.media ?? "未記入"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">利用地域</dt>
            <dd>{inquiry.region ?? "未記入"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">利用期間</dt>
            <dd>
              {inquiry.period_start ? inquiry.period_start : "—"}{" "}
              {inquiry.period_end ? `~ ${inquiry.period_end}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">予算</dt>
            <dd>
              {inquiry.budget_min || inquiry.budget_max
                ? `${inquiry.budget_min ? `¥${Number(inquiry.budget_min).toLocaleString()}` : "—"} ~ ${
                    inquiry.budget_max ? `¥${Number(inquiry.budget_max).toLocaleString()}` : "—"
                  }`
                : "未記入"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">AI利用</dt>
            <dd>{inquiry.ai_use === null ? "—" : inquiry.ai_use ? "可" : "不可"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">二次利用</dt>
            <dd>
              {inquiry.secondary_use === null
                ? "—"
                : inquiry.secondary_use
                  ? "可"
                  : "不可"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">改変</dt>
            <dd>
              {inquiry.derivative === null ? "—" : inquiry.derivative ? "可" : "不可"}
            </dd>
          </div>
        </dl>
        {inquiry.message && (
          <div>
            <dt className="text-sm font-medium text-neutral-700">メッセージ</dt>
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-800">
              {inquiry.message}
            </p>
          </div>
        )}
        <div className="text-sm text-neutral-500">
          <p>送信日時: {createdAt ?? "—"}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">対応</h2>
        <div className="flex flex-wrap gap-3">
          <form action={reviewAction}>
            <button
              className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
              type="submit"
            >
              検討中にする
            </button>
          </form>
          <form action={approveAction}>
            <button
              className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
              type="submit"
            >
              承認する
            </button>
          </form>
          <form action={rejectAction}>
            <button
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              type="submit"
            >
              却下する
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">アクティビティログ</h2>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-neutral-500">まだ履歴はありません。</p>
        ) : (
          <ol className="mt-2 space-y-2 text-sm text-neutral-700">
            {sortedEvents.map((event) => {
              const formatted = new Date(event.created_at).toLocaleString();
              return (
                <li key={event.id}>
                  <div className="flex items-baseline justify-between">
                    <span>{eventLabel(event.event_type)}</span>
                    <span className="text-xs text-neutral-500">{formatted}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/creator/inquiries"
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
        >
          受信箱に戻る
        </Link>
        <Link
          href={`/ip/${ipAssetForView?.id ?? inquiry.asset_id}`}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          IP詳細を見る
        </Link>
      </div>
    </section>
  );
}
