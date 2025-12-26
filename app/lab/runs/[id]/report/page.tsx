export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { requireLabAdmin } from "@/lib/lab";
import type { LabRun } from "@/lib/types";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function SummarySection({ run }: { run: LabRun }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold">概要</h2>
      <div className="mt-2 text-sm text-neutral-700">
        <p>
          <span className="font-semibold text-neutral-900">Run ID:</span> {run.id}
        </p>
        <p>
          <span className="font-semibold text-neutral-900">Type:</span> {run.type}
        </p>
        <p>
          <span className="font-semibold text-neutral-900">Status:</span> {run.status}
        </p>
        <p>
          <span className="font-semibold text-neutral-900">Created:</span> {formatDate(run.created_at)}
        </p>
      </div>
    </section>
  );
}

function InputsSection({ input }: { input: any }) {
  const inputs = input ?? {};
  const items: { label: string; value: string }[] = [];
  if (inputs?.a?.path) items.push({ label: "Input A", value: `${inputs.a.bucket ?? "lab-inputs"}/${inputs.a.path}` });
  if (inputs?.b?.path) items.push({ label: "Input B", value: `${inputs.b.bucket ?? "lab-inputs"}/${inputs.b.path}` });

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold">入力</h2>
      <div className="mt-2 space-y-1 text-sm text-neutral-700">
        {items.map((item) => (
          <p key={item.label}>
            <span className="font-semibold text-neutral-900">{item.label}:</span> {item.value}
          </p>
        ))}
      </div>
    </section>
  );
}

function ChoreoDtwSection({ output }: { output: any }) {
  const meta = output?.meta ?? {};
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold">主要結果（DTW）</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">similarity</p>
          <p className="mt-1 text-2xl font-semibold">{Number(output.similarity ?? 0).toFixed(4)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">confidence</p>
          <p className="mt-1 text-2xl font-semibold">
            {typeof meta.confidence === "number" ? meta.confidence.toFixed(2) : "—"}{" "}
            <span className="text-sm text-neutral-600">({meta.label ?? "—"})</span>
          </p>
          {Array.isArray(meta.similarity_runs) && (
            <p className="mt-2 text-xs text-neutral-600">
              runs: {meta.similarity_runs.map((v: number) => Number(v).toFixed(4)).join(", ")}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 text-sm text-neutral-700 space-y-1">
        <p>
          <span className="font-semibold text-neutral-900">dtw_cost:</span> {String(output.dtw_cost ?? meta.dtw_cost ?? "—")}
        </p>
        <p className="text-xs text-amber-700">参考情報としてのスコアです。必ず人手で確認してください。</p>
      </div>
    </section>
  );
}

function PhraseCompareSection({ output }: { output: any }) {
  if (!Array.isArray(output?.matches)) return null;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold">フレーズマッチング（Top3）</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-3 py-2">Phrase A</th>
              <th className="px-3 py-2">Top Candidates (B)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {output.matches.map((m: any, idx: number) => (
              <tr key={`${m.start}-${m.end}-${idx}`} className="align-top">
                <td className="px-3 py-2 font-mono text-xs">
                  {m.start ?? "—"}s - {m.end ?? "—"}s
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-2">
                    {(m.candidates ?? []).slice(0, 3).map((c: any, cidx: number) => (
                      <div key={`${c.start}-${c.end}-${cidx}`} className="rounded-lg border border-neutral-200 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs">
                            {c.start ?? "—"}s - {c.end ?? "—"}s
                          </span>
                          <span className="text-xs">
                            similarity: <span className="font-semibold">{Number(c.similarity ?? 0).toFixed(4)}</span>
                          </span>
                        </div>
                        {c.parts && (
                          <p className="mt-1 text-xs text-neutral-600">
                            parts: upper {Number(c.parts.upper ?? 0).toFixed(2)}, core {Number(c.parts.core ?? 0).toFixed(2)}, lower{" "}
                            {Number(c.parts.lower ?? 0).toFixed(2)}
                          </p>
                        )}
                        {c.explain?.note && <p className="mt-1 text-xs text-neutral-700">explain: {c.explain.note}</p>}
                        {c.not_similar?.note && <p className="mt-1 text-xs text-rose-700">diff: {c.not_similar.note}</p>}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-amber-700">参考情報としてのマッチ結果です。必ず人手で確認してください。</p>
    </section>
  );
}

export default async function LabRunReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireLabAdmin();
  const { id } = await params;

  const { data: run } = await supabase.from("lab_runs").select("*").eq("id", id).maybeSingle<LabRun>();
  if (!run) return notFound();

  const payload = (run.output_json as any) ?? {};
  const input = payload.input ?? payload.inputs ?? null;
  const output = payload.output ?? payload ?? {};

  return (
    <main className="mx-auto max-w-4xl space-y-6 bg-white px-6 py-8 text-neutral-900">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          [data-report-results] { display: block !important; }
        }
      `}</style>

      <header className="space-y-2 border-b border-neutral-200 pb-4 print:border-none">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">AI Lab Run Report</p>
        <h1 className="text-2xl font-semibold">Run: {run.id}</h1>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold">免責</h2>
        <p className="mt-2 text-sm text-neutral-700">
          本レポートは参考情報であり、法的判断ではありません。最終的な判断は必ず人手で確認してください。
        </p>
      </section>

      <SummarySection run={run} />
      <InputsSection input={input} />

      {run.type === "choreo_compare_dtw" && (
        <div data-report-results>
          <ChoreoDtwSection output={output} />
          <div data-report-results-ready="true" style={{ position: "fixed", left: "-9999px", top: 0 }}>
            results-ready
          </div>
        </div>
      )}
      {run.type === "choreo_phrase_compare" && (
        <div data-report-results>
          <PhraseCompareSection output={output} />
          <div data-report-results-ready="true" style={{ position: "fixed", left: "-9999px", top: 0 }}>
            results-ready
          </div>
        </div>
      )}

      <div data-report-ready="true" style={{ position: "fixed", left: "-9999px", top: 0 }}>
        ready
      </div>
    </main>
  );
}
