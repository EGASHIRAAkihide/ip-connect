import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";
import { approveInquiry, rejectInquiry, markInquiryPaid } from "./actions";

type InquiryWithRelations = {
  id: string;
  ip_id: string;
  purpose: string | null;
  region: string | null;
  period: string | null;
  budget: number | null;
  message: string | null;
  status: InquiryStatus;
  payment_status: string | null;
  created_at: string | null;
  ip_assets:
    | { id: string; title: string | null; creator_id: string }
    | { id: string; title: string | null; creator_id: string }[]
    | null;
};

type PageProps = {
  params: { id: string };
};

export default async function CreatorInquiryDetailPage({ params }: PageProps) {
  const inquiryId = params.id;
  const supabase = createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <p className="text-sm text-slate-300">
          Please log in to view this inquiry.
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

  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        ip_id,
        purpose,
        region,
        period,
        budget,
        message,
        status,
        payment_status,
        created_at,
        ip_assets:ip_id (
          id,
          title,
          creator_id
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
        assetCreatorId = ipAssets[0]?.creator_id ?? null;
      }
    } else {
      assetCreatorId = ipAssets.creator_id ?? null;
    }
  }

  if (assetCreatorId !== user.id) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <p className="text-sm text-slate-300">
          You do not have access to this inquiry.
        </p>
        <Link
          href="/creator/inquiries"
          className="inline-flex rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to inbox
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

  const approveAction = approveInquiry.bind(null, inquiry.id);
  const rejectAction = rejectInquiry.bind(null, inquiry.id);
  const markPaidAction = markInquiryPaid.bind(null, inquiry.id);

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          Creator inbox
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              {ipAssetForView?.title ?? "Untitled IP"}
            </h1>
            <p className="text-sm text-slate-400">
              Asset ID: {ipAssetForView?.id ?? inquiry.ip_id}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-slate-200">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide">
              Status: {inquiry.status}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide">
              Payment: {inquiry.payment_status ?? "unpaid"}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-white">Request details</h2>
        <dl className="grid gap-4 text-sm text-slate-300 md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Purpose</dt>
            <dd>{inquiry.purpose ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Region</dt>
            <dd>{inquiry.region ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Usage period</dt>
            <dd>{inquiry.period ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Budget</dt>
            <dd>
              {inquiry.budget
                ? `$${inquiry.budget.toLocaleString()}`
                : "Not specified"}
            </dd>
          </div>
        </dl>
        {inquiry.message && (
          <div>
            <dt className="text-sm font-medium text-slate-400">Message</dt>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-200">
              {inquiry.message}
            </p>
          </div>
        )}
        <div className="text-sm text-slate-500">
          <p>Submitted: {createdAt ?? "—"}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-white">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <form action={approveAction}>
            <button
              className="rounded-full border border-emerald-400 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10"
              type="submit"
            >
              Approve inquiry
            </button>
          </form>
          <form action={rejectAction}>
            <button
              className="rounded-full border border-rose-400 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
              type="submit"
            >
              Reject inquiry
            </button>
          </form>
          <form action={markPaidAction}>
            <button
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-emerald-400 hover:text-emerald-200"
              type="submit"
              disabled={inquiry.status !== "approved"}
            >
              Mark as paid
            </button>
          </form>
        </div>
        {inquiry.status !== "approved" && (
          <p className="text-xs text-slate-500">
            Mark as paid is available after approval.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/creator/inquiries"
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to inbox
        </Link>
        <Link
          href={`/ip/${ipAssetForView?.id ?? inquiry.ip_id}`}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
        >
          View IP asset
        </Link>
      </div>
    </section>
  );
}
