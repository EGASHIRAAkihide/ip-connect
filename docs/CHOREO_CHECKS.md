# Choreo Checks (PoC)

## result_json sample

```json
{
  "overall_similarity": null,
  "confidence": "low",
  "explanation": {
    "similar_reason": "骨格推定が不安定なため参考値です",
    "different_reason": "全身が映る動画/明るい環境で再試行してください"
  },
  "phrases": [],
  "meta": {
    "input": {
      "storage_path": "company-id/1730000000000-uuid-input.mp4",
      "sha256": "abc123...",
      "duration_s": 12.3,
      "fps": 29.97,
      "frames": 80,
      "pose_success_rate": 0.52
    },
    "reference": {
      "storage_path": "creator-id/1730000000000-uuid-ref.mp4",
      "sha256": "def456...",
      "duration_s": 14.1,
      "fps": 30.0,
      "frames": 90,
      "pose_success_rate": 0.72
    },
    "processing": {
      "algorithm": "dtw-exp",
      "processing_ms": 3120,
      "warnings": ["POSE_LOW_CONFIDENCE", "FRAMES_TOO_FEW"],
      "distance": 0.84,
      "alpha": 0.8
    }
  }
}
```

## env

```text
CHOREO_MIN_FRAMES=60
CHOREO_MIN_POSE_RATE=0.6
CHOREO_SIM_ALPHA=0.8
CHOREO_TARGET_FPS=15
CHOREO_WEIGHT_ARMS=1.2
CHOREO_WEIGHT_LEGS=1.0
CHOREO_WEIGHT_TORSO=0.8
```
