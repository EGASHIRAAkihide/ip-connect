'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Inquiry, InquiryStatus, UserProfile } from "@/lib/types";

type InquiryWithRelations = Inquiry & {
  ip_assets: {
    id: string;
    title: string;
  } | null;
  company: {
    email: string;
  } | null;
};

const paymentStyles: Record<
  Inquiry["payment_status"],
  { bg: string; text: string; label: string }
> = {
  unpaid: {
    bg: "bg-slate-800",
    text: "text-slate-200",
    label: "unpaid",
  },
  invoiced: {
    bg: "bg-amber-500/20",
    text: "text-amber-200",
    label: "invoiced",
  },
  paid_simulated: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-200",
    label: "paid",
  },
};

export default function CreatorInquiries() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [inquiries, setInquiries] = useState<InquiryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadInquiries = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (!profileData) {
        router.replace("/auth/register");
        setLoading(false);
        return;
      }

      if (profileData.role !== "creator") {
        router.replace("/ip");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data, error } = await supabaseClient
        .from("inquiries")
        .select(
          `
            *,
            ip_assets:ip_id (
              id,
              title
            ),
            company:company_id (
              email
            )
          `,
        )
        .eq("creator_id", profileData.id)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setInquiries(data as InquiryWithRelations[]);
      setLoading(false);
    };

    loadInquiries();
  }, [router]);

  const updateStatus = async (id: string, status: InquiryStatus) => {
    if (!profile) {
      setMessage("Profile not loaded.");
      return;
    }

    setMessage(null);

    const { data: existing, error: fetchError } = await supabaseClient
      .from("inquiries")
      .select("status")
      .eq("id", id)
      .single<Pick<Inquiry, "status">>();

    if (fetchError || !existing) {
      setMessage("Unable to load inquiry status.");
      return;
    }

    const fromStatus = existing.status;

    try {
      const { error: updateError } = await supabaseClient
        .from("inquiries")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: eventError } = await supabaseClient
        .from("inquiry_events")
        .insert({
          inquiry_id: id,
          actor_id: profile.id,
          actor_role: "creator",
          from_status: fromStatus,
          to_status: status,
          note: "Status changed by creator",
        });

      if (eventError) {
        throw new Error(eventError.message);
      }

      setInquiries((prev) =>
        prev.map((inq) => (inq.id === id ? { ...inq, status } : inq)),
      );
      setMessage("Status updated.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (loading) {
    return <p className="mt-10 text-slate-300">Loading inquiries…</p>;
  }

  return (
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Inquiry inbox</p>
          <h1 className="text-3xl font-semibold text-white">
            {profile?.email}
          </h1>
        </div>
        <button
          onClick={async () => {
            await supabaseClient.auth.signOut();
            router.replace("/auth/login");
          }}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Log out
        </button>
      </div>
      {message && (
        <p className="text-sm text-amber-300" role="status">
          {message}
        </p>
      )}
      {inquiries.length === 0 ? (
        <p className="text-sm text-slate-400">
          No inquiries yet. Companies can submit from the IP detail page.
        </p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <article
              key={inquiry.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase text-slate-400">
                    {inquiry.ip_assets?.title ?? "Untitled IP"}
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {inquiry.company?.email ?? "Unknown company"}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    inquiry.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : inquiry.status === "rejected"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {inquiry.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full px-3 py-1 uppercase tracking-wide ${paymentStyles[inquiry.payment_status].bg} ${paymentStyles[inquiry.payment_status].text}`}
                >
                  Payment: {paymentStyles[inquiry.payment_status].label}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Purpose</dt>
                  <dd>{inquiry.purpose ?? "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Region</dt>
                  <dd>{inquiry.region ?? "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Period</dt>
                  <dd>{inquiry.period ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Budget</dt>
                  <dd>
                    {inquiry.budget ? `$${inquiry.budget.toLocaleString()}` : "—"}
                  </dd>
                </div>
              </dl>
              {inquiry.message && (
                <p className="mt-3 rounded-lg bg-slate-950/40 p-3 text-sm text-slate-200">
                  {inquiry.message}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/creator/inquiries/${inquiry.id}`}
                  className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-100"
                >
                  View details
                </Link>
                {inquiry.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatus(inquiry.id, "approved")}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(inquiry.id, "rejected")}
                      className="rounded-full border border-rose-500 px-4 py-2 text-sm text-rose-200"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
