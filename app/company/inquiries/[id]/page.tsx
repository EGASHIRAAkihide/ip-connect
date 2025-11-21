'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type {
  Inquiry,
  InquiryStatus,
  IPAsset,
  UserProfile,
} from "@/lib/types";

type InquiryEvent = {
  id: string;
  inquiry_id: string;
  actor_id: string;
  actor_role: "creator" | "company";
  from_status: InquiryStatus | null;
  to_status: InquiryStatus;
  note: string | null;
  created_at: string;
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
    text: "text-rose-300",
    label: "Rejected",
  },
};

export default function CompanyInquiryDetailPage() {
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
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<InquiryEvent[]>([]);

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

      if (profile.role !== "company") {
        router.replace("/ip");
        return;
      }

      const { data, error } = await supabaseClient
        .from("inquiries")
        .select("*")
        .eq("id", inquiryId)
        .eq("company_id", profile.id)
        .single<Inquiry>();

      if (error || !data) {
        setError("Inquiry not found.");
        setLoading(false);
        return;
      }

      setInquiry(data);

      const [{ data: assetData }, { data: creatorData }] = await Promise.all([
        supabaseClient
          .from("ip_assets")
          .select("*")
          .eq("id", data.ip_id)
          .single<IPAsset>(),
        supabaseClient
          .from("users")
          .select("*")
          .eq("id", data.creator_id)
          .single<UserProfile>(),
      ]);

      const { data: eventsData } = await supabaseClient
        .from("inquiry_events")
        .select("*")
        .eq("inquiry_id", data.id)
        .order("created_at", { ascending: false });

      setAsset(assetData ?? null);
      setCreator(creatorData ?? null);
      setEvents((eventsData as InquiryEvent[]) ?? []);
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
          onClick={() => router.push("/company/inquiries")}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to inquiries
        </button>
      </div>
    );
  }

  const statusStyle = statusStyles[inquiry.status];
  const createdAt = inquiry.created_at
    ? new Date(inquiry.created_at).toLocaleString()
    : "—";
  const updatedAt = inquiry.updated_at
    ? new Date(inquiry.updated_at).toLocaleString()
    : null;

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          Company dashboard
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">Your inquiry</h1>
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
        <h2 className="text-base font-semibold text-white">Creator</h2>
        {creator ? (
          <Link
            href={`/users/${creator.id}`}
            className="text-sm text-emerald-300 underline"
          >
            {creator.email}
          </Link>
        ) : (
          <p className="text-sm text-slate-300">Unknown creator</p>
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

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-semibold text-white">Status history</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">
            No status changes recorded yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const badge = statusStyles[event.to_status];
              const timestamp = new Date(event.created_at).toLocaleString();
              return (
                <li
                  key={event.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {event.actor_role}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{timestamp}</p>
                  {event.note && (
                    <p className="text-sm text-slate-400">{event.note}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400 space-y-1">
        <p>Submitted: {createdAt}</p>
        {updatedAt && <p>Updated: {updatedAt}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/company/inquiries"
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
        >
          Back to inquiries
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

