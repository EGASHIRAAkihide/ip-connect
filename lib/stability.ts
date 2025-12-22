export type ConfidenceLabel = "High" | "Medium" | "Low";

export function computeConfidence(similarityRuns: number[]) {
  const values = similarityRuns.filter((v) => Number.isFinite(v));
  if (values.length === 0) {
    return {
      similarity_runs: [],
      mean: 0,
      std: 0,
      confidence: 0,
      label: "Low" as ConfidenceLabel,
    };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const confidence = Math.max(0, Math.min(1, 1 - std * 2));
  const label: ConfidenceLabel = confidence >= 0.85 ? "High" : confidence >= 0.7 ? "Medium" : "Low";

  return {
    similarity_runs: values,
    mean,
    std,
    confidence,
    label,
  };
}

