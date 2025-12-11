import { createServerClient } from "@/lib/supabase/server";

type CountResult = { label: string; value: number };

async function safeCount(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  table: string,
  filter?: (query: any) => any,
): Promise<number> {
  const query = supabase.from(table).select("*", { count: "exact", head: true });
  const { count, error } = filter ? await filter(query) : await query;
  if (error) {
    console.error(`[analytics] count error on ${table}:`, error);
    return 0;
  }
  return count ?? 0;
}

function barWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max(4, Math.min(100, Math.round((value / max) * 100)))}%`;
}

export default async function AnalyticsPage() {
  const supabase = await createServerClient();

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

  const statusBars: CountResult[] = [
    { label: "Pending", value: pendingCount },
    { label: "Approved", value: approvedCount },
    { label: "Rejected", value: rejectedCount },
  ];

  const paymentBars: CountResult[] = [
    { label: "Unpaid", value: unpaidCount },
    { label: "Invoiced", value: invoicedCount },
    { label: "Paid (simulated)", value: paidSimulatedCount },
    { label: "Cancelled", value: cancelledCount },
  ];

  const maxStatus = Math.max(...statusBars.map((s) => s.value), 0);
  const maxPayment = Math.max(...paymentBars.map((s) => s.value), 0);

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-600">Investor/mentor snapshot with quick visuals.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[{ label: "Total creators", value: totalCreators },
          { label: "Total companies", value: totalCompanies },
          { label: "Total IP assets", value: totalAssets },
          { label: "Total inquiries", value: totalInquiries }].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
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

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">Inquiry status</h2>
          <div className="mt-3 space-y-3">
            {statusBars.map((row) => (
              <div key={row.label} className="space-y-1 text-sm text-neutral-800">
                <div className="flex items-center justify-between">
                  <span>{row.label}</span>
                  <span className="font-semibold text-neutral-900">{row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: barWidth(row.value, maxStatus) }}
                    aria-hidden
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-900">Payment status</h2>
        <div className="mt-3 space-y-3 text-sm text-neutral-800">
          {paymentBars.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span>{row.label}</span>
                <span className="font-semibold text-neutral-900">{row.value}</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-neutral-900"
                  style={{ width: barWidth(row.value, maxPayment) }}
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
