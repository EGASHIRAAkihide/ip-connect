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
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    label: "Pending",
  },
  approved: {
    bg: "bg-neutral-900",
    text: "text-white",
    label: "Approved",
  },
  rejected: {
    bg: "bg-neutral-200",
    text: "text-neutral-700",
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
        <p className="text-sm text-neutral-700">
          Please log in to view your inquiries.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
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
          <p className="text-sm text-neutral-600">Inquiry inbox</p>
          <h1 className="text-3xl font-semibold text-neutral-900">Your inquiries</h1>
        </div>
      </div>
      {typedInquiries.length === 0 ? (
        <p className="text-sm text-neutral-600">
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
                    Payment: {paymentLabels[inquiry.payment_status] ?? inquiry.payment_status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-neutral-700 md:grid-cols-2">
                  <div>
                    <dt className="text-neutral-500">Created</dt>
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
                    View details
                  </Link>
                  <Link
                    href={`/ip/${inquiry.ip_id}`}
                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
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
