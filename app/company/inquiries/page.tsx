import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";

type InquiryWithAsset = {
  id: string;
  ip_id: string;
  status: InquiryStatus;
  payment_status: string;
  created_at: string;
  ip_assets: {
    title: string | null;
  } | null;
};

const statusStyles: Record<
  InquiryStatus,
  { bg: string; text: string; label: string }
> = {
  pending: {
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    label: "Pending",
  },
  approved: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-500/15",
    text: "text-rose-200",
    label: "Rejected",
  },
};

const paymentLabels: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

export default async function CompanyInquiriesPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl space-y-6 py-8">
        <p className="text-sm text-slate-300">
          Please log in to view inquiries.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
        >
          Go to login
        </Link>
      </section>
    );
  }

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        ip_id,
        status,
        payment_status,
        created_at,
        ip_assets:ip_id (
          title
        )
      `,
    )
    .eq("company_id", user.id)
    .order("created_at", { ascending: false });

  // Supabaseからの生データ（any）を、明示的に InquiryWithAsset に整形する
  const typedInquiries: InquiryWithAsset[] = (inquiries ?? []).map(
    (row: any): InquiryWithAsset => {
      // ip_assets が配列で返ってくるケースに対応（最初の要素だけ使う）
      let asset: { title: string | null } | null = null;

      if (row.ip_assets) {
        if (Array.isArray(row.ip_assets)) {
          if (row.ip_assets.length > 0) {
            asset = { title: row.ip_assets[0]?.title ?? null };
          }
        } else {
          // もし単一オブジェクトで返ってきた場合にも対応
          asset = { title: row.ip_assets.title ?? null };
        }
      }

      return {
        id: String(row.id),
        ip_id: String(row.ip_id),
        status: row.status as InquiryStatus,
        payment_status: String(row.payment_status ?? "unpaid"),
        created_at: String(row.created_at),
        ip_assets: asset,
      };
    },
  );

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          Company
        </p>
        <h1 className="text-3xl font-semibold text-white">Your inquiries</h1>
        <p className="text-sm text-slate-400">
          Track the status of licensing requests you’ve submitted to creators.
        </p>
      </header>

      {typedInquiries.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
          <p>You haven’t submitted any inquiries yet.</p>
          <Link
            href="/ip"
            className="mt-4 inline-flex rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black"
          >
            Browse IP catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {typedInquiries.map((inquiry) => {
            const statusStyle =
              statusStyles[inquiry.status] ?? statusStyles.pending;
            const assetTitle = inquiry.ip_assets?.title ?? "Untitled asset";
            const createdAt = new Date(
              inquiry.created_at,
            ).toLocaleDateString();

            return (
              <article
                key={inquiry.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      IP
                    </p>
                    <h2 className="text-xl font-semibold text-white">
                      {assetTitle}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Payment</dt>
                    <dd>
                      {paymentLabels[inquiry.payment_status] ??
                        inquiry.payment_status}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Created</dt>
                    <dd>{createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">ID</dt>
                    <dd className="truncate text-slate-500">
                      {inquiry.id}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/company/inquiries/${inquiry.id}`}
                    className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/ip/${inquiry.ip_id}`}
                    className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
                  >
                    View asset
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