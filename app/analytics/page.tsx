import { createServerClient } from "@/lib/supabase/server";

type Counts = {
  creators: number;
  totalIPs: number;
  choreography: number;
  voice: number;
  totalInquiries: number;
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  newIPs30d: number;
  newInquiries30d: number;
};

async function safeCount(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  filter?: (query: any) => any,
) {
  const query = supabase.from(table).select("*", { head: true, count: "exact" });
  const { count, error } = filter ? await filter(query) : await query;
  if (error) {
    console.error(`[analytics] count error on ${table}:`, error);
    return 0;
  }
  return count ?? 0;
}

export default async function AnalyticsPage() {
  const supabase = createServerClient();
  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    creators,
    totalIPs,
    choreography,
    voice,
    totalInquiries,
    pending,
    approved,
    rejected,
    paid,
    newIPs30d,
    newInquiries30d,
  ] = await Promise.all([
    safeCount(supabase, "users", (q) => q.eq("role", "creator")),
    safeCount(supabase, "ip_assets"),
    safeCount(supabase, "ip_assets", (q) => q.eq("asset_type", "choreography")),
    safeCount(supabase, "ip_assets", (q) => q.eq("asset_type", "voice")),
    safeCount(supabase, "inquiries"),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "pending")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "approved")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "rejected")),
    safeCount(supabase, "inquiries", (q) => q.eq("payment_status", "paid")),
    safeCount(supabase, "ip_assets", (q) => q.gte("created_at", since30Days)),
    safeCount(supabase, "inquiries", (q) => q.gte("created_at", since30Days)),
  ]);

  const metrics: Counts = {
    creators,
    totalIPs,
    choreography,
    voice,
    totalInquiries,
    pending,
    approved,
    rejected,
    paid,
    newIPs30d,
    newInquiries30d,
  };

  return (
    <section className="mx-auto max-w-5xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-600">
          Key activity metrics for IP Connect (creators, assets, and licensing pipeline).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Creators", value: metrics.creators },
          { label: "Total IPs", value: metrics.totalIPs },
          { label: "Total Inquiries", value: metrics.totalInquiries },
          { label: "Paid Licenses", value: metrics.paid },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-neutral-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: "Choreography IPs", value: metrics.choreography },
          { label: "Voice IPs", value: metrics.voice },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-neutral-200 bg-white p-4"
          >
            <p className="text-sm font-medium text-neutral-600">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Inquiry pipeline</h2>
        <div className="mt-4 space-y-3">
          {[
            { label: "Pending", value: metrics.pending },
            { label: "Approved", value: metrics.approved },
            { label: "Rejected", value: metrics.rejected },
            { label: "Paid", value: metrics.paid },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2"
            >
              <p className="text-sm text-neutral-700">{item.label}</p>
              <p className="text-lg font-semibold text-neutral-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Last 30 days</h2>
        <div className="mt-4 space-y-3">
          {[
            { label: "New IPs (30d)", value: metrics.newIPs30d },
            { label: "New inquiries (30d)", value: metrics.newInquiries30d },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2"
            >
              <p className="text-sm text-neutral-700">{item.label}</p>
              <p className="text-lg font-semibold text-neutral-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
