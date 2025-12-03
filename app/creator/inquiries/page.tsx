import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";

type CreatorInquiryWithAsset = {
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

export default async function CreatorInquiries() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="space-y-6 py-8">
        <p className="text-sm text-slate-300">
          Please log in to view your inquiries.
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
        ip_assets!inner (
          title,
          creator_id
        )
      `,
    )
    .eq("ip_assets.creator_id", user.id)
    .order("created_at", { ascending: false });

  // Supabaseからの生データ（any）を、明示的に CreatorInquiryWithAsset に整形する
  const typedInquiries: CreatorInquiryWithAsset[] = (inquiries ?? []).map(
    (row: any): CreatorInquiryWithAsset => {
      let asset: { title: string | null } | null = null;

      if (row.ip_assets) {
        if (Array.isArray(row.ip_assets)) {
          if (row.ip_assets.length > 0) {
            asset = { title: row.ip_assets[0]?.title ?? null };
          }
        } else {
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
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Inquiry inbox</p>
          <h1 className="text-3xl font-semibold text-white">Your inquiries</h1>
        </div>
      </div>
      {typedInquiries.length === 0 ? (
        <p className="text-sm text-slate-400">
          No inquiries yet. Companies can submit from the IP detail page.
        </p>
      ) : (
        <div className="space-y-4">
          {typedInquiries.map((inquiry) => {
            const statusStyle = statusStyles[inquiry.status] ?? statusStyles.pending;
            const assetTitle = inquiry.ip_assets?.title ?? "Untitled IP";
            const createdAt = new Date(inquiry.created_at).toLocaleDateString();
            return (
              <article
                key={inquiry.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-slate-400">
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
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">
                    Payment: {paymentLabels[inquiry.payment_status] ?? inquiry.payment_status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Created</dt>
                    <dd>{createdAt}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">ID</dt>
                    <dd className="truncate text-slate-500">{inquiry.id}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/creator/inquiries/${inquiry.id}`}
                    className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/ip/${inquiry.ip_id}`}
                    className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
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
