"use client";

import { useState } from "react";

type Props = {
  data: Record<string, unknown> | null;
};

function toCsv(segments: any[]) {
  const header = ["speaker", "start", "end", "text"];
  const rows = segments.map((s) => {
    const speaker = s?.speaker ?? "";
    const start = s?.start ?? "";
    const end = s?.end ?? "";
    const text = s?.text ?? "";
    return [speaker, start, end, text]
      .map((v) => {
        const str = String(v ?? "");
        if (str.includes('"') || str.includes(",") || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function ExportButtons({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const json = data ?? {};
  const payload = json as any;
  const output = payload.output ?? payload ?? {};
  const segments = Array.isArray(output?.segments) ? output.segments : null;

  function downloadBlob(text: string, filename: string, type: string) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const handleJson = () => {
    downloadBlob(JSON.stringify(payload, null, 2), "output.json", "application/json");
  };

  const handleCsv = () => {
    if (!segments) return;
    downloadBlob(toCsv(segments), "segments.csv", "text/csv");
  };

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button
        type="button"
        onClick={handleJson}
        className="rounded-full border border-neutral-300 px-3 py-1 font-semibold text-neutral-800 hover:bg-neutral-100"
      >
        JSONダウンロード
      </button>
      {segments && (
        <button
          type="button"
          onClick={handleCsv}
          className="rounded-full border border-neutral-300 px-3 py-1 font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          CSVダウンロード
        </button>
      )}
    </div>
  );
}
