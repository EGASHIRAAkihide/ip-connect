import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";
import { approveInquiry, rejectInquiry, markInquiryPaid } from "./actions";
import { getServerUserWithRole } from "@/lib/auth";

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
  company?: {
    id: string;
    email: string;
    role: string;
  } | null;
  inquiry_events?:
    | {
        id: string;
        event_type: string;
        payload: any | null;
        created_at: string;
      }[]
    | null;
};

type PageProps = {
  params: { id: string };
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
        ),
        company:company_id (
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
        assetCreatorId = ipAssets[0]?.creator_id ?? null;
      }
    } else {
      assetCreatorId = ipAssets.creator_id ?? null;
    }
  }

  if (assetCreatorId !== user.id) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-8">
        <p className="text-sm text-neutral-700">You do not have access to this inquiry.</p>
        <Link
          href="/creator/inquiries"
          className="inline-flex rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
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

  const sortedEvents =
    inquiry.inquiry_events?.slice().sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }) ?? [];

  const eventLabel = (type: string) => {
    switch (type) {
      case "created":
        return "Inquiry created";
      case "approved":
        return "Approved by creator";
      case "rejected":
        return "Rejected by creator";
      case "payment_marked_paid":
        return "Marked as paid";
      default:
        return type;
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Creator inbox
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">
              {ipAssetForView?.title ?? "Untitled IP"}
            </h1>
            <p className="text-sm text-neutral-600">
              Asset ID: {ipAssetForView?.id ?? inquiry.ip_id}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-neutral-800">
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs uppercase tracking-wide">
              Status: {inquiry.status}
            </span>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs uppercase tracking-wide">
              Payment: {inquiry.payment_status ?? "unpaid"}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">Request details</h2>
        <dl className="grid gap-4 text-sm text-neutral-700 md:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Purpose</dt>
            <dd>{inquiry.purpose ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Region</dt>
            <dd>{inquiry.region ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Usage period</dt>
            <dd>{inquiry.period ?? "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Budget</dt>
            <dd>
              {inquiry.budget
                ? `$${inquiry.budget.toLocaleString()}`
                : "Not specified"}
            </dd>
          </div>
        </dl>
        {inquiry.message && (
          <div>
            <dt className="text-sm font-medium text-neutral-700">Message</dt>
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-800">
              {inquiry.message}
            </p>
          </div>
        )}
        <div className="text-sm text-neutral-500">
          <p>Submitted: {createdAt ?? "—"}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <form action={approveAction}>
            <button
              className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
              type="submit"
            >
              Approve inquiry
            </button>
          </form>
          <form action={rejectAction}>
            <button
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              type="submit"
            >
              Reject inquiry
            </button>
          </form>
          <form action={markPaidAction}>
            <button
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              type="submit"
              disabled={inquiry.status !== "approved"}
            >
              Mark as paid
            </button>
          </form>
        </div>
        {inquiry.status !== "approved" && (
          <p className="text-xs text-neutral-500">
            Mark as paid is available after approval.
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">Activity log</h2>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity recorded yet.</p>
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
          Back to inbox
        </Link>
        <Link
          href={`/ip/${ipAssetForView?.id ?? inquiry.ip_id}`}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          View IP asset
        </Link>
      </div>
    </section>
  );
}
