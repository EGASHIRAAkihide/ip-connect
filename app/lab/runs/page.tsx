import Link from "next/link";
import { requireLabAdmin } from "@/lib/lab";
import type { LabRun } from "@/lib/types";

function statusTone(status: LabRun["status"]) {
  switch (status) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "running":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "queued":
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
    case "failed":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-neutral-50 text-neutral-700 border-neutral-200";
  }
}

export default async function LabRunsPage() {
  const { supabase } = await requireLabAdmin();
  const { data: runs } = await supabase
    .from("lab_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <section className="mx-auto max-w-5xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Logs</p>
        <h1 className="text-3xl font-semibold text-neutral-900">実行履歴</h1>
        <p className="text-sm text-neutral-700">最新50件を表示しています。</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {runs?.map((run) => (
              <tr key={run.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/lab/runs/${run.id}`} className="underline">
                    {run.id.slice(0, 8)}…
                  </Link>
                </td>
                <td className="px-4 py-3">{run.type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(run.status)}`}>
                    {run.status}
                  </span>
                  {run.error_message && (
                    <span className="ml-2 text-xs text-rose-600 line-clamp-1">{run.error_message}</span>
                  )}
                </td>
                <td className="px-4 py-3">{run.duration_ms ? `${run.duration_ms} ms` : "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{new Date(run.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {runs?.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-sm text-neutral-600" colSpan={5}>
                  実行履歴がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
