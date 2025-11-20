'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { InquiryStatus, UserProfile } from "@/lib/types";

type InquiryWithAsset = {
  id: string;
  ip_id: string;
  creator_id: string;
  company_id: string;
  purpose: string | null;
  region: string | null;
  period: string | null;
  budget: number | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  ip_assets: {
    id: string;
    title: string | null;
    category: string | null;
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

export default function CompanyInquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryWithAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

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

      const { data, error } = await supabaseClient
        .from("inquiries")
        .select(
          `
            *,
            ip_assets:ip_id (
              id,
              title,
              category
            )
          `,
        )
        .eq("company_id", profileData.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setInquiries(data as InquiryWithAsset[]);
      setLoading(false);
    };

    loadData();
  }, [router]);

  if (loading) {
    return <p className="mt-10 text-slate-300">Loading inquiries…</p>;
  }

  if (error) {
    return (
      <div className="mt-10 space-y-4 text-slate-200">
        <p>Error loading inquiries: {error}</p>
        <button
          onClick={() => router.push("/ip")}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to IP catalog
        </button>
      </div>
    );
  }

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

      {inquiries.length === 0 ? (
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
          {inquiries.map((inquiry) => {
            const statusStyle = statusStyles[inquiry.status];
            const assetTitle = inquiry.ip_assets?.title ?? "Untitled asset";
            const category = inquiry.ip_assets?.category ?? "N/A";
            const createdAt = new Date(inquiry.created_at).toLocaleDateString();
            return (
              <article
                key={inquiry.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {category}
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
                    <dt className="text-slate-500">Purpose</dt>
                    <dd>{inquiry.purpose ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Region</dt>
                    <dd>{inquiry.region ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Created</dt>
                    <dd>{createdAt}</dd>
                  </div>
                </dl>
                {inquiry.message && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                    {inquiry.message}
                  </p>
                )}
                <div className="mt-4">
                  <Link
                    href={`/ip/${inquiry.ip_id}`}
                    className="inline-flex rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
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

