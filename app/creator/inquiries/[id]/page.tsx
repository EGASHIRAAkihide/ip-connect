'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Inquiry, InquiryStatus, IPAsset, UserProfile } from "@/lib/types";

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
    text: "text-rose-300",
    label: "Rejected",
  },
};

export default function CreatorInquiryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const inquiryId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [company, setCompany] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadInquiry = async () => {
      if (!inquiryId) {
        setError("Inquiry not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profile } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (!profile) {
        router.replace("/auth/register");
        return;
      }

      if (profile.role !== "creator") {
        router.replace("/ip");
        return;
      }

      const { data, error } = await supabaseClient
        .from("inquiries")
        .select("*")
        .eq("id", inquiryId)
        .eq("creator_id", profile.id)
        .single<Inquiry>();

      if (error || !data) {
        setError("Inquiry not found.");
        setLoading(false);
        return;
      }

      setInquiry(data);

      const [{ data: assetData }, { data: companyData }] = await Promise.all([
        supabaseClient
          .from("ip_assets")
          .select("*")
          .eq("id", data.ip_id)
          .single<IPAsset>(),
        supabaseClient
          .from("users")
          .select("*")
          .eq("id", data.company_id)
          .single<UserProfile>(),
      ]);

      setAsset(assetData ?? null);
      setCompany(companyData ?? null);
      setLoading(false);
    };

    loadInquiry();
  }, [inquiryId, router]);

  if (loading) {
    return <p className="mt-10 text-slate-300">Loading inquiry…</p>;
  }

  if (error || !inquiry) {
    return (
      <div className="mt-10 space-y-4 text-slate-200">
        <p>{error ?? "Inquiry not found."}</p>
        <button
          onClick={() => router.push("/creator/inquiries")}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to inbox
        </button>
      </div>
    );
  }

  const statusStyle = statusStyles[inquiry.status];
  const createdAt = inquiry.created_at
    ? new Date(inquiry.created_at).toLocaleString()
    : "—";

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          Creator inbox
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              Inquiry details
            </h1>
            <p className="text-sm text-slate-400">
              {asset?.category ?? "IP asset"}
            </p>
            <p className="text-lg text-slate-200">{asset?.title ?? "Untitled asset"}</p>
          </div>
          <span
            className={`rounded-full px-4 py-1 text-sm font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}
          >
            {statusStyle.label}
          </span>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-white">From company</h2>
        {company ? (
          <Link
            href={`/users/${company.id}`}
            className="text-sm text-emerald-300 underline"
          >
            {company.email}
          </Link>
        ) : (
          <p className="text-sm text-slate-300">Unknown company</p>
        )}
      </div>

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
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
        <p>Submitted: {createdAt}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/creator/inquiries"
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to inbox
        </Link>
        <Link
          href={`/ip/${inquiry.ip_id}`}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
        >
          View IP asset
        </Link>
      </div>
    </section>
  );
}

