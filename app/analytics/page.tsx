import { createServerClient } from "@/lib/supabase/server";

type InquiriesByStatus = {
  pending: number;
  approved: number;
  rejected: number;
};

type PaymentStatusCounts = {
  unpaid: number;
  invoiced: number;
  paid_simulated: number;
  cancelled: number;
};

async function safeCount(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  filter?: (query: any) => any,
) {
  const query = supabase.from(table).select("*", { count: "exact", head: true });
  const { count, error } = filter ? await filter(query) : await query;
  if (error) {
    console.error(`[analytics] count error on ${table}:`, error);
    return 0;
  }
  return count ?? 0;
}

export default async function AnalyticsPage() {
  const supabase = createServerClient();

  const [
    totalCreators,
    totalCompanies,
    totalAssets,
    choreographyCount,
    voiceCount,
    totalInquiries,
    pendingCount,
    approvedCount,
    rejectedCount,
    unpaidCount,
    invoicedCount,
    paidSimulatedCount,
    cancelledCount,
  ] = await Promise.all([
    safeCount(supabase, "users", (q) => q.eq("role", "creator")),
    safeCount(supabase, "users", (q) => q.eq("role", "company")),
    safeCount(supabase, "ip_assets"),
    safeCount(supabase, "ip_assets", (q) => q.eq("asset_type", "choreography")),
    safeCount(supabase, "ip_assets", (q) => q.eq("asset_type", "voice")),
    safeCount(supabase, "inquiries"),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "pending")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "approved")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "rejected")),
    safeCount(supabase, "inquiries", (q) => q.eq("payment_status", "unpaid")),
    safeCount(supabase, "inquiries", (q) => q.eq("payment_status", "invoiced")),
    safeCount(supabase, "inquiries", (q) => q.eq("payment_status", "paid_simulated")),
    safeCount(supabase, "inquiries", (q) => q.eq("payment_status", "cancelled")),
  ]);

  const inquiriesByStatus: InquiriesByStatus = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
  };

  const inquiriesByPaymentStatus: PaymentStatusCounts = {
    unpaid: unpaidCount,
    invoiced: invoicedCount,
    paid_simulated: paidSimulatedCount,
    cancelled: cancelledCount,
  };

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-600">
          Snapshot for investors and mentors
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total creators", value: totalCreators },
          { label: "Total companies", value: totalCompanies },
          { label: "Total IP assets", value: totalAssets },
          { label: "Total inquiries", value: totalInquiries },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-neutral-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">IP breakdown</h2>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span>Choreography</span>
              <span className="font-semibold text-neutral-900">{choreographyCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span>Voice</span>
              <span className="font-semibold text-neutral-900">{voiceCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">Inquiry status</h2>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            {(["pending", "approved", "rejected"] as const).map((status) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
              >
                <span className="capitalize">{status}</span>
                <span className="font-semibold text-neutral-900">
                  {inquiriesByStatus[status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-900">Payment status</h2>
        <div className="mt-3 space-y-2 text-sm text-neutral-700">
          {(["unpaid", "invoiced", "paid_simulated", "cancelled"] as const).map((status) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
            >
              <span className="capitalize">{status.replace("_", " ")}</span>
              <span className="font-semibold text-neutral-900">
                {inquiriesByPaymentStatus[status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
