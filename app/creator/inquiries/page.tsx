import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";
import { getServerUserWithRole } from "@/lib/auth";

type CreatorInquiryWithAsset = {
  id: string;
  asset_id: string;
  status: InquiryStatus;
  purpose: string | null;
  ai_use: boolean | null;
  created_at: string;
  ip_assets: {
    title: string | null;
    type?: string | null;
  } | null;
};

const PURPOSE_LABELS: Record<string, string> = {
  ads: "広告",
  sns: "SNS",
  app: "アプリ",
  education: "教育",
  ai: "AI",
};

const statusStyles: Record<
  InquiryStatus,
  { bg: string; text: string; label: string }
> = {
  new: {
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    label: "未対応",
  },
  in_review: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    label: "検討中",
  },
  accepted: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    label: "承認",
  },
  rejected: {
    bg: "bg-rose-100",
    text: "text-rose-700",
    label: "却下",
  },
};

export default async function CreatorInquiries() {
  const { user, role } = await getServerUserWithRole();
  if (!user) {
    redirect("/auth/login");
  }
  if (role !== "creator") {
    redirect("/ip");
  }

  const supabase = await createServerClient();

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        asset_id,
        status,
        purpose,
        ai_use,
        created_at,
        ip_assets!inner (
          title,
          creator_id,
          type,
          asset_type
        )
      `,
    )
    .eq("ip_assets.created_by", user.id)
    .order("created_at", { ascending: false });

  const typedInquiries: CreatorInquiryWithAsset[] = (inquiries ?? []).map(
    (row): CreatorInquiryWithAsset => {
      const assetRaw = (row as { ip_assets?: unknown }).ip_assets;
      let asset: { title: string | null; type?: string | null } | null = null;

      if (assetRaw) {
        if (Array.isArray(assetRaw)) {
          if (assetRaw.length > 0) {
            asset = {
              title: (assetRaw[0] as { title?: string | null })?.title ?? null,
              type:
                (assetRaw[0] as { type?: string | null; asset_type?: string | null })?.type ??
                (assetRaw[0] as { type?: string | null; asset_type?: string | null })?.asset_type ??
                null,
            };
          }
        } else {
          asset = {
            title: (assetRaw as { title?: string | null })?.title ?? null,
            type:
              (assetRaw as { type?: string | null; asset_type?: string | null })?.type ??
              (assetRaw as { type?: string | null; asset_type?: string | null })?.asset_type ??
              null,
          };
        }
      }

      return {
        id: String((row as { id: string }).id),
        asset_id: String((row as { asset_id: string }).asset_id),
        status: (row as { status: InquiryStatus }).status,
        purpose: (row as { purpose?: string | null }).purpose ?? null,
        ai_use: (row as { ai_use?: boolean | null }).ai_use ?? null,
        created_at: String((row as { created_at: string }).created_at),
        ip_assets: asset,
      };
    },
  );

  return (
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-600">問い合わせ受信箱</p>
          <h1 className="text-3xl font-semibold text-neutral-900">受信した問い合わせ</h1>
        </div>
      </div>
      {typedInquiries.length === 0 ? (
        <p className="text-sm text-neutral-600">
          まだ問い合わせはありません。企業はIP詳細ページから送信できます。
        </p>
      ) : (
        <div className="space-y-4">
          {typedInquiries.map((inquiry) => {
            const statusStyle = statusStyles[inquiry.status] ?? statusStyles.new;
            const assetTitle = inquiry.ip_assets?.title ?? "Untitled IP";
            const createdAt = new Date(inquiry.created_at).toLocaleDateString();
            return (
              <article
                key={inquiry.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-neutral-500">
                      {assetTitle}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-neutral-700">
                    利用目的: {inquiry.purpose ? PURPOSE_LABELS[inquiry.purpose] ?? inquiry.purpose : "—"}
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-neutral-700">
                    AI利用:{" "}
                    {inquiry.ai_use === null ? "—" : inquiry.ai_use ? "可" : "不可"}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-neutral-700 md:grid-cols-2">
                  <div>
                    <dt className="text-neutral-500">作成日</dt>
                    <dd>{createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">ID</dt>
                    <dd className="truncate text-neutral-500">{inquiry.id}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/creator/inquiries/${inquiry.id}`}
                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
                  >
                    詳細を見る
                  </Link>
                  <Link
                    href={`/ip/${inquiry.asset_id}`}
                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
                  >
                    IP詳細
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
