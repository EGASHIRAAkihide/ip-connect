import { createServerClient } from "@/lib/supabase/server";

type CountResult = { label: string; value: number };
type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;
type CountResponse = { count: number | null; error: { message?: string } | null };
type SupabaseCountQuery = ReturnType<ReturnType<SupabaseServerClient["from"]>["select"]>;

async function safeCount(
  supabase: SupabaseServerClient,
  table: string,
  filter?: (query: SupabaseCountQuery) => SupabaseCountQuery,
): Promise<number> {
  const baseQuery = supabase.from(table).select("*", { count: "exact", head: true });

  const finalQuery = filter ? filter(baseQuery) : baseQuery;
  const { count, error } = (await finalQuery) as CountResponse;
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
    newCount,
    inReviewCount,
    acceptedCount,
    rejectedCount,
  ] = await Promise.all([
    safeCount(supabase, "users", (q) => q.eq("role", "creator")),
    safeCount(supabase, "users", (q) => q.eq("role", "company")),
    safeCount(supabase, "ip_assets"),
    safeCount(supabase, "ip_assets", (q) => q.eq("type", "choreography")),
    safeCount(supabase, "ip_assets", (q) => q.eq("type", "voice")),
    safeCount(supabase, "inquiries"),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "new")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "in_review")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "accepted")),
    safeCount(supabase, "inquiries", (q) => q.eq("status", "rejected")),
  ]);

  const statusBars: CountResult[] = [
    { label: "未対応", value: newCount },
    { label: "検討中", value: inReviewCount },
    { label: "承認", value: acceptedCount },
    { label: "却下", value: rejectedCount },
  ];

  const maxStatus = Math.max(...statusBars.map((s) => s.value), 0);

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-neutral-900">指標ダッシュボード</h1>
        <p className="text-sm text-neutral-600">クリエイター・IP・問い合わせの簡易サマリーです。</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {[{ label: "クリエイター数", value: totalCreators },
          { label: "企業数", value: totalCompanies },
          { label: "IP登録数", value: totalAssets },
          { label: "問い合わせ数", value: totalInquiries }].map((item) => (
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
          <h2 className="text-base font-semibold text-neutral-900">IP内訳</h2>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span>振付</span>
              <span className="font-semibold text-neutral-900">{choreographyCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span>声</span>
              <span className="font-semibold text-neutral-900">{voiceCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">問い合わせステータス</h2>
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
    </section>
  );
}
