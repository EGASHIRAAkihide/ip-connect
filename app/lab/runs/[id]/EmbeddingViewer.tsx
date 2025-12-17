"use client";

import { useState } from "react";

type Props = {
  embedding: number[];
  dim: number;
  returned: number;
  trimmed?: boolean;
};

export function EmbeddingViewer({ embedding, dim, returned, trimmed }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(embedding));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-neutral-700">
        <p>
          dim: {dim} / returned: {returned} {trimmed ? "(先頭のみ表示)" : ""}
        </p>
        <p className="text-amber-700 text-xs">
          本人一致を保証しない参考情報です。用途に応じて必ず人手で確認してください。
        </p>
      </div>
      <details className="rounded-lg border border-neutral-200 bg-neutral-50">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">埋め込みを表示</summary>
        <div className="space-y-2 px-3 pb-3">
          <pre className="overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-50">
            {JSON.stringify(embedding, null, 2)}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
          >
            {copied ? "コピーしました" : "コピー"}
          </button>
        </div>
      </details>
    </div>
  );
}
