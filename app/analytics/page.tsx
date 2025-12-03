"use server";

import { createServerClient } from "@/lib/supabase/server";

type Counts = {
  creators: number;
  totalIPs: number;
  totalInquiries: number;
  paidLicenses: number;
  choreography: number;
  voice: number;
  inquiries: {
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
  };
  last30d: {
    newIPs: number;
    newInquiries: number;
  };
};

async function fetchCount(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  filter?: (query: any) => any,
) {
  const query = supabase.from(table).select("id", { count: "exact", head: true });
  const { count, error } = filter ? await filter(query) : await query;
  if (error) {
    console.error(`[analytics] ${table} count error:`, error);
    return 0;
  }
  return count ?? 0;
}

export default async function AnalyticsPage() {
  const supabase = createServerClient();
  const now = new Date();
  const since30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    creators,
    totalIPs,
    choreography,
    voice,
    totalInquiries,
    pendingInquiries,
    approvedInquiries,
    rejectedInquiries,
    paidInquiries,
    newIPs30d,
    newInquiries30d,
  ] = await Promise.all([
    fetchCount(supabase, "users", (q) => q.eq("role", "creator")),
    fetchCount(supabase, "ip_assets"),
    fetchCount(supabase, "ip_assets", (q) => q.eq("category", "choreography")),
    fetchCount(supabase, "ip_assets", (q) => q.eq("category", "voice")),
    fetchCount(supabase, "inquiries"),
    fetchCount(supabase, "inquiries", (q) => q.eq("status", "pending")),
    fetchCount(supabase, "inquiries", (q) => q.eq("status", "approved")),
    fetchCount(supabase, "inquiries", (q) => q.eq("status", "rejected")),
    fetchCount(
      supabase,
      "inquiries",
      (q) => q.in("payment_status", ["paid", "paid_simulated"]),
    ),
    fetchCount(supabase, "ip_assets", (q) => q.gte("created_at", since30Days)),
    fetchCount(supabase, "inquiries", (q) => q.gte("created_at", since30Days)),
  ]);

  const metrics: Counts = {
    creators,
    totalIPs,
    totalInquiries,
    paidLicenses: paidInquiries,
    choreography,
    voice,
    inquiries: {
      pending: pendingInquiries,
      approved: approvedInquiries,
      rejected: rejectedInquiries,
      paid: paidInquiries,
    },
    last30d: {
      newIPs: newIPs30d,
      newInquiries: newInquiries30d,
    },
  };

  return (
    <section className="mx-auto max-w-5xl space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
          Analytics
        </p>
        <h1 className="text-3xl font-semibold text-white">IP Connect Dashboard</h1>
        <p className="text-sm text-slate-400">
          Investor-ready snapshot of growth, supply, and deal flow.
        </p>
      </header>

      {/* Section 1: Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Creators", value: metrics.creators },
          { label: "Total IPs", value: metrics.totalIPs },
          { label: "Total Inquiries", value: metrics.totalInquiries },
          { label: "Paid Licenses", value: metrics.paidLicenses },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Section 2: Asset breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Asset breakdown</h2>
          <p className="text-sm text-slate-500">By category</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: "Choreography", value: metrics.choreography },
            { label: "Voice", value: metrics.voice },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Inquiry pipeline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Inquiry pipeline</h2>
          <p className="text-sm text-slate-500">Current status mix</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pending", value: metrics.inquiries.pending },
            { label: "Approved", value: metrics.inquiries.approved },
            { label: "Rejected", value: metrics.inquiries.rejected },
            { label: "Paid", value: metrics.inquiries.paid },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Last 30 days growth */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Last 30 days growth</h2>
          <p className="text-sm text-slate-500">Momentum snapshot</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: "New IPs (30d)", value: metrics.last30d.newIPs },
            { label: "New inquiries (30d)", value: metrics.last30d.newInquiries },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
