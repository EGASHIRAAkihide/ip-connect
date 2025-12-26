import os
import math
import tempfile
import time
import json
import urllib.request
import subprocess
import wave
import hashlib
from typing import Any, Dict, Optional

import whisper
import cv2
import mediapipe as mp
import numpy as np
from fastapi import Body
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Lab (Audio)", version="0.3.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "base"
_asr_model = None

_diar_pipeline = None
_diar_init_error: Optional[str] = None
_embed_inference = None
_embed_init_error: Optional[str] = None
EMBED_MODEL_ID = "pyannote/embedding"
EMBED_MODEL_ID = "pyannote/wespeaker-voxceleb-resnet34-LM"
_pose = None
_mmpose_detector = None
_mmpose_pose = None
_mmpose_init_error = None

MMPOSE_DET_CONFIG = "mmdet::yolox/yolox_tiny_8xb8-300e_coco.py"
MMPOSE_DET_CHECKPOINT = (
    "https://download.openmmlab.com/mmdetection/v3.0/yolox/"
    "yolox_tiny_8xb8-300e_coco/yolox_tiny_8xb8-300e_coco_20211124_171234-9f74a6e0.pth"
)
MMPOSE_POSE_CONFIG = (
    "mmpose::body_2d_keypoint/topdown_heatmap/coco/"
    "td-hm_mobilenetv2_8xb64-210e_coco-256x192.py"
)
MMPOSE_POSE_CHECKPOINT = (
    "https://download.openmmlab.com/mmpose/top_down/td-hm_mobilenetv2_8xb64-210e_coco-256x192/"
    "td-hm_mobilenetv2_8xb64-210e_coco-256x192-5d6d9f0a_20220930.pth"
)
MMPOSE_SCORE_THRESHOLD = 0.3


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    try:
        return int(raw) if raw is not None else default
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    try:
        return float(raw) if raw is not None else default
    except ValueError:
        return default


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


CHOREO_MIN_FRAMES = _int_env("CHOREO_MIN_FRAMES", 60)
CHOREO_MIN_POSE_RATE = _float_env("CHOREO_MIN_POSE_RATE", 0.6)
CHOREO_SIM_ALPHA = _float_env("CHOREO_SIM_ALPHA", 0.8)
CHOREO_TARGET_FPS = _float_env("CHOREO_TARGET_FPS", 15.0)
CHOREO_WEIGHT_ARMS = _float_env("CHOREO_WEIGHT_ARMS", 1.2)
CHOREO_WEIGHT_LEGS = _float_env("CHOREO_WEIGHT_LEGS", 1.0)
CHOREO_WEIGHT_TORSO = _float_env("CHOREO_WEIGHT_TORSO", 0.8)
CHOREO_DANGLE_WEIGHT = _float_env("CHOREO_DANGLE_WEIGHT", 1.5)
CHOREO_SMOOTH_WINDOW = _int_env("CHOREO_SMOOTH_WINDOW", 5)
CHOREO_TRIM_ENERGY = _float_env("CHOREO_TRIM_ENERGY", 0.05)
CHOREO_NORMALIZE_ROTATE = _bool_env("CHOREO_NORMALIZE_ROTATE", True)


def load_asr_model():
    global _asr_model
    if _asr_model is None:
        _asr_model = whisper.load_model(MODEL_NAME)
    return _asr_model


def load_diarization():
    global _diar_pipeline, _diar_init_error
    if _diar_pipeline or _diar_init_error:
        return _diar_pipeline

    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        _diar_init_error = "HF_TOKEN is not set"
        return None

    try:
        from pyannote.audio import Pipeline  # imported lazily

        _diar_pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
        return _diar_pipeline
    except Exception as exc:  # noqa: BLE001
        _diar_init_error = str(exc)
        return None


def load_embedding():
    global _embed_inference, _embed_init_error
    if _embed_inference:
        return _embed_inference
    if _embed_init_error:
        return None

    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        _embed_init_error = "HF_TOKEN is not set"
        return None

    try:
        from pyannote.audio import Inference, Model  # lazy import

        model = Model.from_pretrained(EMBED_MODEL_ID, use_auth_token=hf_token)
        inference = Inference(model, device=torch.device("cpu"), window="whole")
        _embed_inference = inference
        return _embed_inference
    except Exception as exc:  # noqa: BLE001
        _embed_init_error = f"{exc.__class__.__name__}: {exc}"
        _embed_inference = None
        return None


def load_pose():
    global _pose
    if _pose:
        return _pose
    _pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        smooth_landmarks=True,
    )
    return _pose


def load_mmpose_models():
    global _mmpose_detector, _mmpose_pose, _mmpose_init_error
    if _mmpose_detector and _mmpose_pose:
        return _mmpose_detector, _mmpose_pose
    if _mmpose_init_error:
        raise HTTPException(status_code=500, detail=f"MMPose init failed: {_mmpose_init_error}")
    try:
        from mmdet.apis import init_detector
        from mmpose.apis import init_model
    except Exception as exc:  # noqa: BLE001
        _mmpose_init_error = f"{exc.__class__.__name__}: {exc}"
        raise HTTPException(status_code=500, detail=f"MMPose import failed: {_mmpose_init_error}") from exc
    try:
        _mmpose_detector = init_detector(MMPOSE_DET_CONFIG, MMPOSE_DET_CHECKPOINT, device="cpu")
        _mmpose_pose = init_model(MMPOSE_POSE_CONFIG, MMPOSE_POSE_CHECKPOINT, device="cpu")
    except Exception as exc:  # noqa: BLE001
        _mmpose_init_error = f"{exc.__class__.__name__}: {exc}"
        raise HTTPException(status_code=500, detail=f"MMPose init failed: {_mmpose_init_error}") from exc
    return _mmpose_detector, _mmpose_pose


def _enabled_pose_backends():
    raw = os.getenv("POSE_BACKENDS", "mediapipe")
    return {item.strip() for item in raw.split(",") if item.strip()}


def _ensure_pose_backend(backend: str):
    if backend not in {"mediapipe", "mmpose", "openpose"}:
        raise HTTPException(status_code=400, detail="Unknown backend")
    if backend not in _enabled_pose_backends():
        raise HTTPException(status_code=501, detail="backend not enabled")
    if backend == "openpose":
        raise HTTPException(status_code=501, detail="backend not enabled")


def _extract_pose_frames(content: bytes, backend: str, sample_fps: int, max_seconds: int):
    if not content:
        raise HTTPException(status_code=400, detail="Empty input file")

    _ensure_pose_backend(backend)

    pose = load_pose() if backend == "mediapipe" else None
    if backend == "mediapipe" and pose is None:
        raise HTTPException(status_code=500, detail="Pose model unavailable")

    det_model = None
    pose_model = None
    if backend == "mmpose":
        det_model, pose_model = load_mmpose_models()

    warnings = []
    frames = []
    frames_processed = 0
    frames_with_pose = 0

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp:
        tmp.write(content)
        tmp.flush()

        cap = cv2.VideoCapture(tmp.name)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to open video file")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        stride = max(int(round(fps / sample_fps)), 1) if sample_fps > 0 else 1
        max_frames = int(max_seconds * fps) if max_seconds and max_seconds > 0 else 0
        frame_idx = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if max_frames and frame_idx >= max_frames:
                    break
                if frame_idx % stride != 0:
                    frame_idx += 1
                    continue
                frames_processed += 1
                landmarks = []
                if backend == "mediapipe":
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = pose.process(rgb)
                    if results.pose_landmarks:
                        frames_with_pose += 1
                        for idx, lm in enumerate(results.pose_landmarks.landmark):
                            name = (
                                POSE_LANDMARK_NAMES[idx]
                                if idx < len(POSE_LANDMARK_NAMES)
                                else f"idx_{idx}"
                            )
                            landmarks.append(
                                {
                                    "name": name,
                                    "x": float(lm.x),
                                    "y": float(lm.y),
                                    "score": float(getattr(lm, "visibility", 0.0)),
                                }
                            )
                else:
                    from mmdet.apis import inference_detector
                    from mmpose.apis import inference_topdown
                    from mmpose.structures import merge_data_samples

                    det_result = inference_detector(det_model, frame)
                    pred_instances = getattr(det_result, "pred_instances", None)
                    bboxes = []
                    if pred_instances is not None and len(pred_instances) > 0:
                        bboxes_raw = pred_instances.bboxes.detach().cpu().numpy()
                        scores_raw = pred_instances.scores.detach().cpu().numpy()
                        labels_raw = pred_instances.labels.detach().cpu().numpy()
                        for bbox, score, label in zip(bboxes_raw, scores_raw, labels_raw):
                            if int(label) != 0 or score < MMPOSE_SCORE_THRESHOLD:
                                continue
                            bboxes.append([*bbox.tolist(), float(score)])
                    if bboxes:
                        bboxes = sorted(bboxes, key=lambda x: x[4], reverse=True)[:1]
                        pose_results = inference_topdown(pose_model, frame, bboxes)
                        if pose_results:
                            data_sample = merge_data_samples(pose_results)
                            keypoints = data_sample.pred_instances.keypoints
                            keypoint_scores = data_sample.pred_instances.keypoint_scores
                            if keypoints is not None and len(keypoints) > 0:
                                frames_with_pose += 1
                                height, width = frame.shape[:2]
                                for idx, (point, score) in enumerate(
                                    zip(keypoints[0], keypoint_scores[0])
                                ):
                                    name = (
                                        COCO17_NAMES[idx]
                                        if idx < len(COCO17_NAMES)
                                        else f"idx_{idx}"
                                    )
                                    x_val = float(point[0]) / width if width else 0.0
                                    y_val = float(point[1]) / height if height else 0.0
                                    landmarks.append(
                                        {
                                            "name": name,
                                            "x": x_val,
                                            "y": y_val,
                                            "score": float(score),
                                        }
                                    )
                frames.append(
                    {
                        "t": round(frame_idx / fps, 3) if fps else 0.0,
                        "landmarks": landmarks,
                    }
                )
                frame_idx += 1
        finally:
            cap.release()

    if backend == "mmpose":
        warnings.append("coco17")
    if frames_processed == 0:
        warnings.append("NO_FRAMES")
    if frames_with_pose == 0:
        warnings.append("POSE_NOT_FOUND")

    vectors = _frames_to_vectors(frames)
    pose_success_rate = (
        round(frames_with_pose / frames_processed, 4) if frames_processed else 0.0
    )
    return {
        "meta": {
            "backend": backend,
            "sample_fps": sample_fps,
            "max_seconds": max_seconds,
            "frames": frames_processed,
            "pose_success_rate": pose_success_rate,
            "warnings": warnings,
        },
        "frames": frames,
        "vectors": vectors,
    }


def _normalize_points(landmarks, rotate: bool):
    if len(landmarks) < 25:
        return None
    lhip, rhip = landmarks[23], landmarks[24]
    lsho, rsho = landmarks[11], landmarks[12]
    center_x = (lhip.x + rhip.x) / 2
    center_y = (lhip.y + rhip.y) / 2
    center_z = (lhip.z + rhip.z) / 2
    shoulder_dist = math.hypot(lsho.x - rsho.x, lsho.y - rsho.y)
    scale = max(shoulder_dist, 1e-6)
    points = []
    for lm in landmarks:
        points.append(
            [
                (lm.x - center_x) / scale,
                (lm.y - center_y) / scale,
                (lm.z - center_z) / scale,
            ]
        )
    if rotate:
        lsho_p, rsho_p = points[11], points[12]
        angle = math.atan2(lsho_p[1] - rsho_p[1], lsho_p[0] - rsho_p[0])
        cos_val = math.cos(-angle)
        sin_val = math.sin(-angle)
        for p in points:
            x, y = p[0], p[1]
            p[0] = x * cos_val - y * sin_val
            p[1] = x * sin_val + y * cos_val
    return points


def _normalize_landmarks(landmarks):
    points = _normalize_points(landmarks, CHOREO_NORMALIZE_ROTATE)
    if not points:
        return None
    vec = []
    for x, y, z in points:
        vec.extend([x, y, z])
    return vec


def _angle(a, b, c):
    ab = (a[0] - b[0], a[1] - b[1])
    cb = (c[0] - b[0], c[1] - b[1])
    dot = ab[0] * cb[0] + ab[1] * cb[1]
    norm_ab = math.hypot(ab[0], ab[1])
    norm_cb = math.hypot(cb[0], cb[1])
    if norm_ab == 0 or norm_cb == 0:
        return None
    cos_val = max(-1.0, min(1.0, dot / (norm_ab * norm_cb)))
    return math.acos(cos_val)


def _torso_angle(points):
    lsho, rsho = points[11], points[12]
    lhip, rhip = points[23], points[24]
    shoulder_center = ((lsho[0] + rsho[0]) / 2, (lsho[1] + rsho[1]) / 2)
    hip_center = ((lhip[0] + rhip[0]) / 2, (lhip[1] + rhip[1]) / 2)
    vec = (shoulder_center[0] - hip_center[0], shoulder_center[1] - hip_center[1])
    norm = math.hypot(vec[0], vec[1])
    if norm == 0:
        return None
    vertical = (0.0, -1.0)
    cos_val = max(-1.0, min(1.0, (vec[0] * vertical[0] + vec[1] * vertical[1]) / norm))
    return math.acos(cos_val)


def _angles_from_points(points, vis):
    xy = [(p[0], p[1]) for p in points]
    angles = []
    joints = [
        (11, 13, 15),  # left elbow
        (12, 14, 16),  # right elbow
        (23, 25, 27),  # left knee
        (24, 26, 28),  # right knee
    ]
    for a, b, c in joints:
        angle = _angle(xy[a], xy[b], xy[c])
        if angle is None:
            return None
        weight = min(vis[a], vis[b], vis[c])
        angles.append(angle * weight)
    torso = _torso_angle(points)
    if torso is None:
        return None
    torso_vis = min(vis[11], vis[12], vis[23], vis[24])
    angles.append(torso * torso_vis)
    return angles


def _pool_vectors(vectors):
    if not vectors:
        return []
    dim = len(vectors[0])
    sums = [0.0] * dim
    count = 0
    for vec in vectors:
        if len(vec) != dim:
            continue
        count += 1
        for i, val in enumerate(vec):
            sums[i] += val
    if count == 0:
        return []
    return [s / count for s in sums]


def _smooth_series(series, window):
    if not series:
        return []
    size = max(int(window), 1)
    radius = size // 2
    dim = len(series[0])
    output = []
    for idx in range(len(series)):
        start = max(0, idx - radius)
        end = min(len(series), idx + radius + 1)
        count = end - start
        sums = [0.0] * dim
        for j in range(start, end):
            vec = series[j]
            if len(vec) != dim:
                continue
            for k, val in enumerate(vec):
                sums[k] += val
        output.append([s / count for s in sums])
    return output


def _smooth_scalar_series(values, window):
    if not values:
        return []
    size = max(int(window), 1)
    radius = size // 2
    output = []
    for idx in range(len(values)):
        start = max(0, idx - radius)
        end = min(len(values), idx + radius + 1)
        chunk = values[start:end]
        output.append(sum(chunk) / len(chunk))
    return output


def _trim_by_motion(energies, threshold):
    if not energies:
        return 0, -1
    start = None
    end = None
    for idx, value in enumerate(energies):
        if value >= threshold:
            start = idx
            break
    for idx in range(len(energies) - 1, -1, -1):
        if energies[idx] >= threshold:
            end = idx
            break
    if start is None or end is None or end < start:
        return 0, len(energies) - 1
    return start, end


def _mean_std(values):
    if not values:
        return 0.0, 0.0
    mean_val = sum(values) / len(values)
    variance = sum((val - mean_val) ** 2 for val in values) / len(values)
    return mean_val, math.sqrt(variance)


def _find_peaks(values, threshold, min_distance):
    if len(values) < 3:
        return []
    peaks = []
    last_idx = None
    for idx in range(1, len(values) - 1):
        if values[idx] < threshold:
            continue
        if values[idx] < values[idx - 1] or values[idx] < values[idx + 1]:
            continue
        if last_idx is None or idx - last_idx >= min_distance:
            peaks.append(idx)
            last_idx = idx
        else:
            if values[idx] > values[peaks[-1]]:
                peaks[-1] = idx
                last_idx = idx
    return peaks


POSE_LANDMARK_NAMES = [
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index",
]

COCO17_NAMES = [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]


def _process_pose_bytes(file_bytes: bytes, sample_fps: float, max_seconds: float):
    pose = load_pose()
    if pose is None:
        raise HTTPException(status_code=500, detail="Pose model unavailable")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp:
        tmp.write(file_bytes)
        tmp.flush()

        cap = cv2.VideoCapture(tmp.name)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to open video file")

        started = time.time()
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            stride = max(int(round(fps / sample_fps)), 1) if sample_fps > 0 else 1
            max_frames = int(max_seconds * fps) if max_seconds and max_seconds > 0 else 0

            frame_idx = 0
            frames_processed = 0
            frames_with_pose = 0
            pose_frames = []
            vectors = []
            angle_series = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if max_frames and frame_idx >= max_frames:
                    break
                if frame_idx % stride != 0:
                    frame_idx += 1
                    continue

                frames_processed += 1
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb)
                if results.pose_landmarks:
                    frames_with_pose += 1
                    landmarks = [
                        {
                            "x": float(lm.x),
                            "y": float(lm.y),
                            "z": float(lm.z),
                            "v": float(lm.visibility),
                        }
                        for lm in results.pose_landmarks.landmark
                    ]
                    pose_frames.append({"t": round(frame_idx / fps, 3), "landmarks": landmarks})
                    normalized_points = _normalize_points(
                        results.pose_landmarks.landmark,
                        CHOREO_NORMALIZE_ROTATE,
                    )
                    if normalized_points:
                        vec = []
                        for x, y, z in normalized_points:
                            vec.extend([x, y, z])
                        vectors.append(vec)
                        vis = [float(getattr(lm, "visibility", 0.0)) for lm in results.pose_landmarks.landmark]
                        angles = _angles_from_points(normalized_points, vis)
                        if angles:
                            angle_series.append(angles)

                frame_idx += 1
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
        finally:
            cap.release()

    duration_ms = int((time.time() - started) * 1000)
    truncated = len(pose_frames) > 50
    pose_frames_light = pose_frames[:50]
    all_vis = [lm.get("v", 0.0) for frame in pose_frames_light for lm in frame.get("landmarks", [])]
    avg_vis = sum(all_vis) / len(all_vis) if all_vis else None
    seconds_used = round((min(frame_idx, max_frames) if max_frames else frame_idx) / fps, 3) if fps else None

    summary = {
        "frames_processed": frames_processed,
        "frames_with_pose": frames_with_pose,
        "frames_with_pose_ratio": round(frames_with_pose / frames_processed, 4) if frames_processed else 0.0,
        "returned_frames": len(pose_frames_light),
    }
    smoothed_angles = _smooth_series(angle_series, CHOREO_SMOOTH_WINDOW)
    raw_d_angles = []
    for idx, angles in enumerate(smoothed_angles):
        if idx == 0:
            raw_d_angles.append([0.0 for _ in angles])
            continue
        raw_d_angles.append([a - b for a, b in zip(angles, smoothed_angles[idx - 1])])
    smoothed_d_angles = _smooth_series(raw_d_angles, CHOREO_SMOOTH_WINDOW)
    motion_energy = [sum(abs(val) for val in frame) for frame in smoothed_d_angles]
    trim_start, trim_end = _trim_by_motion(motion_energy, CHOREO_TRIM_ENERGY)
    if trim_end < trim_start:
        trim_start, trim_end = 0, len(smoothed_angles) - 1
    trimmed_d_angles = (
        smoothed_d_angles[trim_start:trim_end + 1] if smoothed_d_angles else []
    )
    trimmed_motion = (
        motion_energy[trim_start:trim_end + 1] if motion_energy else []
    )
    features = []
    for idx in range(trim_start, trim_end + 1):
        angles = smoothed_angles[idx]
        d_angles = smoothed_d_angles[idx] if idx < len(smoothed_d_angles) else [0.0 for _ in angles]
        weighted_d_angles = [val * CHOREO_DANGLE_WEIGHT for val in d_angles]
        features.append(angles + weighted_d_angles)

    feature_stats = {"avg_visibility": round(avg_vis, 4) if avg_vis is not None else None}
    meta = {
        "fps": round(fps, 3),
        "sample_fps": sample_fps,
        "max_seconds": max_seconds,
        "processing_ms": duration_ms,
        "pose_frames_total": len(pose_frames),
        "pose_frames_returned": len(pose_frames_light),
        "truncated": truncated,
        "seconds_used": seconds_used,
    }
    trim_meta = {
        "start_frame": trim_start if smoothed_angles else None,
        "end_frame": trim_end if smoothed_angles else None,
    }

    return {
        "pose_frames": pose_frames_light,
        "meta": meta,
        "summary": summary,
        "feature_stats": feature_stats,
        "vectors": vectors,
        "features": features,
        "trim": trim_meta,
        "d_angles": trimmed_d_angles,
        "motion_energy": trimmed_motion,
        "seconds_used": seconds_used,
        "processing_ms": duration_ms,
    }


def _downsample_vectors(vectors, max_frames=300):
    if len(vectors) <= max_frames:
        return vectors
    step = math.ceil(len(vectors) / max_frames)
    return vectors[::step][:max_frames]


def _has_invalid_vectors(vectors):
    for vec in vectors or []:
        for val in vec:
            if not math.isfinite(val):
                return True
    return False


def _feature_distance(vec_a, vec_b, weights):
    if len(vec_a) != len(vec_b):
        return float("inf")
    arms = weights.get("arms", 1.0)
    legs = weights.get("legs", 1.0)
    torso = weights.get("torso", 1.0)
    weight_map = [
        arms,
        arms,
        legs,
        legs,
        torso,
        arms,
        arms,
        legs,
        legs,
        torso,
    ]
    total = 0.0
    for idx, (a, b) in enumerate(zip(vec_a, vec_b)):
        w = weight_map[idx] if idx < len(weight_map) else 1.0
        diff = (a - b) * w
        total += diff * diff
    return math.sqrt(total)


def _build_io_meta(storage_path: Optional[str], sha256: str, pose_result: Optional[Dict[str, Any]]):
    summary = pose_result.get("summary", {}) if pose_result else {}
    meta = pose_result.get("meta", {}) if pose_result else {}
    return {
        "storage_path": storage_path,
        "sha256": sha256,
        "duration_s": pose_result.get("seconds_used") if pose_result else None,
        "fps": meta.get("fps"),
        "frames": summary.get("frames_processed"),
        "pose_success_rate": summary.get("frames_with_pose_ratio"),
    }


def _dtw_cost(seq_a, seq_b, band: int, dist_fn=None):
    len_a, len_b = len(seq_a), len(seq_b)
    if len_a == 0 or len_b == 0:
        return float("inf")
    band = max(band, abs(len_a - len_b))
    inf = float("inf")
    prev = [inf] * (len_b + 1)
    curr = [inf] * (len_b + 1)
    prev[0] = 0.0

    for i in range(1, len_a + 1):
        curr[0] = inf
        start = max(1, i - band)
        end = min(len_b, i + band)
        for j in range(start, end + 1):
            if dist_fn:
                dist = dist_fn(seq_a[i - 1], seq_b[j - 1])
            else:
                dist = 1 - _cosine_similarity(seq_a[i - 1], seq_b[j - 1])
            best = min(prev[j], curr[j - 1], prev[j - 1])
            curr[j] = dist + best
        prev, curr = curr, [inf] * (len_b + 1)

    return prev[len_b]


def _cosine_similarity(a, b):
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


PART_MAP = {
    "upper": [11, 12, 13, 14, 15, 16],  # shoulders / arms
    "core": [11, 12, 23, 24],  # shoulders + hips
    "lower": [23, 24, 25, 26, 27, 28, 31, 32],  # hips + legs
}

_PART_LABELS_JA = {"upper": "上半身", "core": "体幹", "lower": "下半身", "timing": "タイミング"}


def _part_similarity(vec_a, vec_b):
    def slice_part(vec, idxs):
        out = []
        for idx in idxs:
            base = idx * 3
            out.extend(vec[base : base + 3])
        return out

    parts = {}
    for name, idxs in PART_MAP.items():
        pa = slice_part(vec_a, idxs)
        pb = slice_part(vec_b, idxs)
        parts[name] = _cosine_similarity(pa, pb) if pa and pb else 0.0
    return parts


def _not_similar_explain(parts: Dict[str, float], mid_a: float, mid_b: float):
    # "Not similar" = weakest body part + optional timing mismatch.
    sorted_parts = sorted(parts.items(), key=lambda x: x[1])
    min_part = sorted_parts[0][0] if sorted_parts else "core"
    dominant_parts = [min_part]

    if abs(mid_a - mid_b) >= 1.5:
        dominant_parts.append("timing")

    part_ja = _PART_LABELS_JA.get(min_part, "体幹")
    if "timing" in dominant_parts:
        note = f"{part_ja}の動きに差分があり、タイミングにずれがある可能性（参考情報）"
    else:
        note = f"{part_ja}の動きに差分がある可能性（参考情報）"

    return {"dominant_parts": dominant_parts, "note": note}


def _moving_average(values, window: int):
  """Simple moving average for smoothing energy."""
  if window <= 1:
    return values
  smoothed = []
  half = window // 2
  for i in range(len(values)):
    start = max(0, i - half)
    end = min(len(values), i + half + 1)
    smoothed.append(sum(values[start:end]) / (end - start))
  return smoothed


def _frames_to_vectors(frames):
    vectors = []
    for frame in frames or []:
        landmarks = frame.get("landmarks") or []
        if not landmarks:
            continue
        vec = []
        for lm in landmarks:
            x = float(lm.get("x", 0.0))
            y = float(lm.get("y", 0.0))
            score = lm.get("score")
            if score is None:
                score = lm.get("visibility", 0.0)
            vec.extend([x, y, float(score or 0.0)])
        vectors.append(vec)
    return vectors


def _assign_speakers(asr_segments, diar_segments):
    assigned = []
    for seg in asr_segments:
        start, end = seg.get("start", 0.0), seg.get("end", 0.0)
        best_speaker = "unknown"
        best_overlap = 0.0
        for diar in diar_segments:
            ds, de = diar["start"], diar["end"]
            overlap = max(0.0, min(end, de) - max(start, ds))
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = diar["speaker"]
        assigned.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "speaker": best_speaker,
                "text": seg.get("text", ""),
            }
        )
    return assigned


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/asr")
async def asr(
    file: UploadFile = File(...),
    language: str = Form("auto"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    model = load_asr_model()

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
            result: Dict[str, Any] = model.transcribe(
                tmp.name,
                language=None if language == "auto" else language,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        duration_ms = int((time.time() - started) * 1000)

    segments = result.get("segments") or []
    transcript = result.get("text") or ""
    meta: Dict[str, Optional[Any]] = {
        "language": result.get("language"),
        "duration": result.get("duration"),
        "model": MODEL_NAME,
        "processing_ms": duration_ms,
    }

    return {
        "transcript": transcript.strip(),
        "segments": segments,
        "meta": meta,
    }


@app.post("/diarize")
async def diarize(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    pipeline = load_diarization()
    if _diar_init_error:
        raise HTTPException(status_code=500, detail=f"Pipeline init failed: {_diar_init_error}")
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Diarization pipeline unavailable")

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
          # pyannote uses torch; keep payload minimal
            diarization = pipeline(tmp.name)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        duration_ms = int((time.time() - started) * 1000)

    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append(
            {
                "speaker": speaker,
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
            }
        )

    return {
        "meta": {"processing_ms": duration_ms, "speakers_count": len({s['speaker'] for s in segments})},
        "segments": segments,
    }


@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    inference = load_embedding()
    if _embed_init_error:
        raise HTTPException(status_code=500, detail=f"Embedding init failed: {_embed_init_error}")
    if inference is None:
        raise HTTPException(status_code=500, detail="Embedding model unavailable")

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
            emb = inference(tmp.name)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        duration_ms = int((time.time() - started) * 1000)

    # emb is numpy array; convert to list and optionally trim if very long
    embedding_list = emb.tolist()
    dim = len(embedding_list)
    max_dim = 256
    trimmed = False
    if dim > max_dim:
        embedding_list = embedding_list[:max_dim]
        trimmed = True

    return {
        "meta": {"processing_ms": duration_ms, "dim": dim, "trimmed": trimmed, "returned": len(embedding_list)},
        "embedding": embedding_list,
    }


@app.post("/compare")
async def compare(fileA: UploadFile = File(...), fileB: UploadFile = File(...)):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    inference = load_embedding()
    if _embed_init_error:
        raise HTTPException(status_code=500, detail=f"Embedding init failed: {_embed_init_error}")
    if inference is None:
        raise HTTPException(status_code=500, detail="Embedding model unavailable")

    def infer_file(upload: UploadFile):
        with tempfile.NamedTemporaryFile(suffix=upload.filename, delete=True) as tmp:
            content = upload.file.read()
            if not content:
                raise HTTPException(status_code=400, detail=f"{upload.filename} is empty")
            tmp.write(content)
            tmp.flush()
            return inference(tmp.name)

    started = time.time()
    try:
        emb_a = infer_file(fileA)
        emb_b = infer_file(fileB)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    list_a = emb_a.tolist()
    list_b = emb_b.tolist()
    dim = min(len(list_a), len(list_b))
    sim = _cosine_similarity(list_a[:dim], list_b[:dim])

    return {
        "meta": {"processing_ms": duration_ms, "dim": dim},
        "similarity": sim,
    }


@app.post("/asr_diarize")
async def asr_diarize(file: UploadFile = File(...), language: str = Form("auto")):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    asr_model = load_asr_model()
    diar_pipeline = load_diarization()
    if _diar_init_error:
        raise HTTPException(status_code=500, detail=f"Pipeline init failed: {_diar_init_error}")
    if diar_pipeline is None:
        raise HTTPException(status_code=500, detail="Diarization pipeline unavailable")

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
            diarization = diar_pipeline(tmp.name)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

        try:
            asr_result: Dict[str, Any] = asr_model.transcribe(
                tmp.name,
                language=None if language == "auto" else language,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
        duration_ms = int((time.time() - started) * 1000)

    diar_segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        diar_segments.append(
            {
                "speaker": speaker,
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
            }
        )

    asr_segments_raw = asr_result.get("segments") or []
    asr_segments = [
        {"start": float(s.get("start", 0.0)), "end": float(s.get("end", 0.0)), "text": s.get("text", "").strip()}
        for s in asr_segments_raw
    ]
    assigned = _assign_speakers(asr_segments, diar_segments)

    transcript = asr_result.get("text", "").strip()
    meta: Dict[str, Any] = {
        "processing_ms": duration_ms,
        "language": asr_result.get("language"),
        "model": MODEL_NAME,
        "speakers_count": len({d["speaker"] for d in diar_segments}),
    }

    return {
        "meta": meta,
        "segments": assigned,
        "transcript": transcript,
    }


@app.post("/choreo/pose")
async def choreo_pose(
    file: UploadFile = File(...),
    backend: str = Form("mediapipe"),
    sample_fps: int = Form(15),
    max_seconds: int = Form(30),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    content = await file.read()
    try:
        result = _extract_pose_frames(content, backend, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

    return {
        "meta": result["meta"],
        "frames": result["frames"],
        # Return vectors here to keep pose cache + downstream compute stable without a separate /pose/extract call.
        "vectors": result.get("vectors") or [],
        "success_rate": result["meta"]["pose_success_rate"],
    }


@app.post("/pose/extract")
async def pose_extract(
    file: UploadFile = File(...),
    backend: str = Form("mediapipe"),
    sample_fps: int = Form(15),
    max_seconds: int = Form(30),
):
    content = await file.read()
    return _extract_pose_frames(content, backend, sample_fps, max_seconds)


@app.post("/choreo/compare")
async def choreo_compare(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    backend: str = Form("mediapipe"),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
):
    if backend != "mediapipe":
        raise HTTPException(status_code=501, detail="backend not enabled")
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    started = time.time()
    try:
        result_a = _process_pose_bytes(content_a, sample_fps, max_seconds)
        result_b = _process_pose_bytes(content_b, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    warnings = []
    features_a = result_a.get("features") or []
    features_b = result_b.get("features") or []
    if not features_a or not features_b:
        warnings.append("EXTRACT_FAILED")
    if _has_invalid_vectors(features_a) or _has_invalid_vectors(features_b):
        warnings.append("EXTRACT_FAILED")

    seq_a = _downsample_vectors(features_a, 300) if features_a else []
    seq_b = _downsample_vectors(features_b, 300) if features_b else []
    dtw_cost = None
    distance = None
    similarity = 0.0
    if seq_a and seq_b and not warnings:
        weights = {
            "arms": CHOREO_WEIGHT_ARMS,
            "legs": CHOREO_WEIGHT_LEGS,
            "torso": CHOREO_WEIGHT_TORSO,
        }
        dtw_cost = _dtw_cost(seq_a, seq_b, 10, lambda a, b: _feature_distance(a, b, weights))
        norm = max(len(seq_a), len(seq_b))
        distance = dtw_cost / norm if norm > 0 else None
        if distance is not None and math.isfinite(distance):
            similarity = math.exp(-CHOREO_SIM_ALPHA * distance)
            similarity = max(0.0, min(1.0, similarity))

    meta = {
        "backend": backend,
        "feature": "angles+delta+smooth+trim",
        "target_fps": sample_fps,
        "normalize": {
            "translate": True,
            "scale": True,
            "rotate": CHOREO_NORMALIZE_ROTATE,
        },
        "distance": distance,
        "warnings": warnings,
        "processing_ms": duration_ms,
    }

    return {
        "similarity": similarity,
        "dtw_cost": dtw_cost,
        "meta": meta,
    }


@app.post("/choreo/compare_dtw")
async def choreo_compare_dtw(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    backend: str = Form("mediapipe"),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
    band: int = Form(10),
):
    if backend != "mediapipe":
        raise HTTPException(status_code=501, detail="backend not enabled")
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    started = time.time()
    try:
        result_a = _process_pose_bytes(content_a, sample_fps, max_seconds)
        result_b = _process_pose_bytes(content_b, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    vectors_a = result_a.get("vectors") or []
    vectors_b = result_b.get("vectors") or []
    if not vectors_a or not vectors_b:
        raise HTTPException(status_code=400, detail="Pose landmarks not found in one of the videos")

    fps_a = result_a.get("meta", {}).get("sample_fps") or sample_fps or 10
    fps_b = result_b.get("meta", {}).get("sample_fps") or sample_fps or 10
    segs_a = _segment_from_vectors(vectors_a, fps_a)
    segs_b = _segment_from_vectors(vectors_b, fps_b)
    if not segs_a:
        segs_a = [{"start": 0.0, "end": result_a.get("seconds_used") or 0.0, "reason": "full"}]
    if not segs_b:
        segs_b = [{"start": 0.0, "end": result_b.get("seconds_used") or 0.0, "reason": "full"}]

    def to_indices(seg, fps_val, total):
        start_idx = max(0, int(float(seg.get("start", 0.0)) * fps_val))
        end_idx = min(total, int(float(seg.get("end", 0.0)) * fps_val))
        if end_idx <= start_idx:
            end_idx = min(total, start_idx + max(1, int(0.5 * fps_val)))
        return start_idx, end_idx

    def pool_segment(vecs, start_idx, end_idx):
        clip = vecs[start_idx:end_idx] if end_idx > start_idx else []
        return _pool_vectors(clip) if clip else []

    phrases = []
    total_weight = 0.0
    total_similarity = 0.0
    total_cost = 0.0

    for idx, seg_a in enumerate(segs_a):
        start_idx_a, end_idx_a = to_indices(seg_a, fps_a, len(vectors_a))
        clip_a = vectors_a[start_idx_a:end_idx_a]
        if not clip_a:
            continue
        mid_a = (float(seg_a.get("start", 0.0)) + float(seg_a.get("end", 0.0))) / 2
        closest_b = min(
            segs_b,
            key=lambda seg_b: abs(
                (float(seg_b.get("start", 0.0)) + float(seg_b.get("end", 0.0))) / 2 - mid_a
            ),
        )
        start_idx_b, end_idx_b = to_indices(closest_b, fps_b, len(vectors_b))
        clip_b = vectors_b[start_idx_b:end_idx_b]
        if not clip_b:
            continue

        cost = _dtw_cost(clip_a, clip_b, band)
        norm = max(len(clip_a), len(clip_b))
        similarity = math.exp(-cost / norm) if norm > 0 else 0.0
        similarity = max(0.0, min(1.0, similarity))

        pooled_a = pool_segment(vectors_a, start_idx_a, end_idx_a)
        pooled_b = pool_segment(vectors_b, start_idx_b, end_idx_b)
        parts = _part_similarity(pooled_a, pooled_b) if pooled_a and pooled_b else {}
        sorted_parts = sorted(parts.items(), key=lambda x: x[1], reverse=True)
        key_joints = []
        for name, _ in sorted_parts[:2]:
            if name == "upper":
                key_joints.append("arms")
            elif name == "lower":
                key_joints.append("legs")
            else:
                key_joints.append("core")

        confidence = "Low"
        if similarity >= 0.8:
            confidence = "High"
        elif similarity >= 0.6:
            confidence = "Medium"

        duration = max(0.0, float(seg_a.get("end", 0.0)) - float(seg_a.get("start", 0.0)))
        total_weight += duration
        total_similarity += similarity * duration
        total_cost += cost * duration

        phrases.append(
            {
                "phrase_id": f"p{idx + 1}",
                "start": float(seg_a.get("start", 0.0)),
                "end": float(seg_a.get("end", 0.0)),
                "similarity": similarity,
                "key_joints": key_joints,
                "confidence": confidence,
            }
        )

    if total_weight <= 0:
        total_weight = max(1.0, float(result_a.get("seconds_used") or 1.0))

    similarity = total_similarity / total_weight if total_weight else 0.0
    dtw_cost = total_cost / total_weight if total_weight else 0.0

    meta = {
        "processing_ms": duration_ms,
        "framesA": len(vectors_a),
        "framesB": len(vectors_b),
        "band": band,
        "sample_fps": sample_fps,
        "seconds_used": min(result_a.get("seconds_used") or 0.0, result_b.get("seconds_used") or 0.0),
        "backend": backend,
    }

    return {
        "meta": meta,
        "similarity": similarity,
        "dtw_cost": dtw_cost,
        "phrases": phrases,
    }


@app.post("/choreo/segment")
async def choreo_segment(
    file: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    started = time.time()
    try:
        result = _process_pose_bytes(content, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    vectors = result.get("vectors") or []
    if len(vectors) < 2:
        raise HTTPException(status_code=400, detail="Pose landmarks not found or too short")

    energies = []
    for i in range(1, len(vectors)):
        diff = [a - b for a, b in zip(vectors[i], vectors[i - 1])]
        norm = sum(d * d for d in diff) ** 0.5
        energies.append(norm / max(len(diff), 1))
    smooth = _moving_average(energies, 5)

    fps = result.get("meta", {}).get("sample_fps") or sample_fps or 10
    min_seg_frames = max(1, int(2.0 * fps))
    mean_energy = sum(smooth) / len(smooth)
    low_thresh = 0.5 * mean_energy if mean_energy > 0 else 0.0
    high_thresh = 1.2 * mean_energy if mean_energy > 0 else 0.0

    segments = []
    last_cut = 0
    reason = "init"
    for idx, val in enumerate(smooth):
        if idx - last_cut < min_seg_frames:
            continue
        if val < low_thresh:
            reason = "low_energy"
            segments.append((last_cut, idx, reason))
            last_cut = idx
        elif val > high_thresh and idx + 1 < len(smooth) and smooth[idx + 1] < val * 0.6:
            reason = "peak_drop"
            segments.append((last_cut, idx, reason))
            last_cut = idx
    if last_cut < len(smooth):
        segments.append((last_cut, len(smooth), "tail"))

    segment_secs = []
    for start, end, why in segments:
        if end - start < min_seg_frames:
            continue
        segment_secs.append(
            {
                "start": round(start / fps, 3),
                "end": round(end / fps, 3),
                "reason": why,
            }
        )

    energy_preview = smooth[:200]
    meta = {
        "processing_ms": duration_ms,
        "frames": len(vectors),
        "sample_fps": sample_fps,
        "duration_sec": result.get("seconds_used"),
    }

    return {
        "segments": segment_secs,
        "energy_preview": energy_preview,
        "meta": meta,
    }


def _segment_from_vectors(vectors, fps):
    segments, _ = _segment_with_energy(vectors, fps)
    return segments


def _segment_with_energy(vectors, fps):
    energies = []
    for i in range(1, len(vectors)):
        diff = [a - b for a, b in zip(vectors[i], vectors[i - 1])]
        norm = sum(d * d for d in diff) ** 0.5
        energies.append(norm / max(len(diff), 1))
    smooth = _moving_average(energies, 5)

    min_seg_frames = max(1, int(2.0 * fps))
    mean_energy = sum(smooth) / len(smooth)
    low_thresh = 0.5 * mean_energy if mean_energy > 0 else 0.0
    high_thresh = 1.2 * mean_energy if mean_energy > 0 else 0.0

    segments = []
    last_cut = 0
    for idx, val in enumerate(smooth):
        if idx - last_cut < min_seg_frames:
            continue
        if val < low_thresh:
            segments.append((last_cut, idx, "low_energy"))
            last_cut = idx
        elif val > high_thresh and idx + 1 < len(smooth) and smooth[idx + 1] < val * 0.6:
            segments.append((last_cut, idx, "peak_drop"))
            last_cut = idx
    if last_cut < len(smooth):
        segments.append((last_cut, len(smooth), "tail"))

    segment_secs = []
    for start, end, why in segments:
        if end - start < min_seg_frames:
            continue
        segment_secs.append(
            {
                "start": round(start / fps, 3),
                "end": round(end / fps, 3),
                "reason": why,
            }
        )

    return segment_secs, smooth


def _load_pose_json(url: str):
    try:
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
        return json.loads(data.decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Failed to fetch pose json: {exc}") from exc


def _detect_peaks(series, min_distance=3, max_peaks=200):
    if not series:
        return []
    mean = sum(series) / len(series)
    var = sum((x - mean) ** 2 for x in series) / max(len(series), 1)
    std = var**0.5
    thresh = mean + 0.5 * std

    peaks = []
    last = -10**9
    for i in range(1, len(series) - 1):
        if i - last < min_distance:
            continue
        if series[i] > thresh and series[i] >= series[i - 1] and series[i] >= series[i + 1]:
            peaks.append(i)
            last = i
            if len(peaks) >= max_peaks:
                break
    return peaks


def _audio_peaks_from_video_bytes(video_bytes: bytes, max_seconds: float, max_peaks: int = 200):
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp_video:
        tmp_video.write(video_bytes)
        tmp_video.flush()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp_wav:
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                tmp_video.name,
                "-t",
                str(max_seconds),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                tmp_wav.name,
            ]
            try:
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=f"ffmpeg_failed: {exc}") from exc

            try:
                with wave.open(tmp_wav.name, "rb") as wf:
                    sr = wf.getframerate()
                    n = wf.getnframes()
                    raw = wf.readframes(n)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=f"wav_read_failed: {exc}") from exc

    if not raw:
        return {"peaks_ms": [], "duration_ms": 0}

    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    duration_ms = int(len(samples) / max(sr, 1) * 1000)

    win = int(sr * 0.05)
    hop = int(sr * 0.025)
    if win <= 0 or hop <= 0 or len(samples) < win:
        return {"peaks_ms": [], "duration_ms": duration_ms}

    rms = []
    for start in range(0, len(samples) - win, hop):
        chunk = samples[start : start + win]
        rms.append(float(np.sqrt(np.mean(chunk * chunk))))

    peak_idxs = _detect_peaks(rms, min_distance=3, max_peaks=max_peaks)
    peaks_ms = [int(i * (hop / sr) * 1000) for i in peak_idxs]
    return {"peaks_ms": peaks_ms, "duration_ms": duration_ms}


def _motion_peaks_from_video_bytes(video_bytes: bytes, max_seconds: float, max_peaks: int = 200, sample_fps: float = 10):
    result = _process_pose_bytes(video_bytes, sample_fps, max_seconds)
    vectors = result.get("vectors") or []
    if len(vectors) < 2:
        return {"peaks_ms": [], "frames": len(vectors), "sample_fps": sample_fps, "duration_ms": int((result.get("seconds_used") or 0) * 1000)}

    energies = []
    for i in range(1, len(vectors)):
        prev = vectors[i - 1]
        cur = vectors[i]
        per_lm = []
        for lm in range(33):
            b = lm * 3
            dx = cur[b] - prev[b]
            dy = cur[b + 1] - prev[b + 1]
            dz = cur[b + 2] - prev[b + 2]
            per_lm.append((dx * dx + dy * dy + dz * dz) ** 0.5)
        energies.append(sum(per_lm) / len(per_lm))

    smoothed = _moving_average(energies, 5)
    peak_idxs = _detect_peaks(smoothed, min_distance=2, max_peaks=max_peaks)
    peaks_ms = [int(i / max(sample_fps, 1e-6) * 1000) for i in peak_idxs]
    duration_ms = int((result.get("seconds_used") or 0) * 1000)
    return {"peaks_ms": peaks_ms, "frames": len(vectors), "sample_fps": sample_fps, "duration_ms": duration_ms}


def _mode_lag_ms(audio_peaks_ms, motion_peaks_ms):
    if not audio_peaks_ms or not motion_peaks_ms:
        return 0
    diffs = []
    for ta in audio_peaks_ms[:200]:
        for tm in motion_peaks_ms[:200]:
            d = tm - ta
            if abs(d) <= 2000:
                diffs.append(d)
    if not diffs:
        return 0
    bin_ms = 50
    buckets = {}
    for d in diffs:
        k = int(round(d / bin_ms))
        buckets[k] = buckets.get(k, 0) + 1
    best_k = max(buckets.items(), key=lambda x: x[1])[0]
    return int(best_k * bin_ms)


def _match_rate(a_ms, b_ms, tolerance_ms, lag_ms=0):
    if not a_ms or not b_ms:
        return 0.0
    b_used = [False] * len(b_ms)
    matches = 0
    for ta in a_ms:
        best_j = None
        best_dt = None
        for j, tb in enumerate(b_ms):
            if b_used[j]:
                continue
            dt = abs((tb - lag_ms) - ta)
            if dt <= tolerance_ms and (best_dt is None or dt < best_dt):
                best_dt = dt
                best_j = j
        if best_j is not None:
            b_used[best_j] = True
            matches += 1
    return matches / max(len(a_ms), len(b_ms), 1)


@app.post("/choreo/phrase_compare")
async def choreo_phrase_compare(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(60),
    top_k: int = Form(3),
):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    started = time.time()
    try:
        result_a = _process_pose_bytes(content_a, sample_fps, max_seconds)
        result_b = _process_pose_bytes(content_b, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    vectors_a = result_a.get("vectors") or []
    vectors_b = result_b.get("vectors") or []
    if len(vectors_a) < 2 or len(vectors_b) < 2:
        raise HTTPException(status_code=400, detail="Pose landmarks not found or too short")

    fps_a = result_a.get("meta", {}).get("sample_fps") or sample_fps or 10
    fps_b = result_b.get("meta", {}).get("sample_fps") or sample_fps or 10

    segs_a = _segment_from_vectors(vectors_a, fps_a)
    segs_b = _segment_from_vectors(vectors_b, fps_b)

    def pool_segment(vecs, start_sec, end_sec, fps_val):
        start_idx = int(start_sec * fps_val)
        end_idx = int(end_sec * fps_val)
        clip = vecs[start_idx:end_idx] if end_idx > start_idx else []
        return _pool_vectors(clip) if clip else []

    emb_a = [pool_segment(vectors_a, s["start"], s["end"], fps_a) for s in segs_a]
    emb_b = [pool_segment(vectors_b, s["start"], s["end"], fps_b) for s in segs_b]

    matches = []
    for seg, vec in zip(segs_a, emb_a):
        cands = []
        mid_a = (float(seg.get("start", 0.0)) + float(seg.get("end", 0.0))) / 2
        for seg_b, vec_b in zip(segs_b, emb_b):
            sim = _cosine_similarity(vec, vec_b) if vec and vec_b else 0.0
            parts = _part_similarity(vec, vec_b) if vec and vec_b else {"upper": 0.0, "core": 0.0, "lower": 0.0}
            sorted_parts_desc = sorted(parts.items(), key=lambda x: x[1], reverse=True)
            dominant = [name for name, _ in sorted_parts_desc[:2]]
            best = _PART_LABELS_JA.get(sorted_parts_desc[0][0], "上半身")
            worst = _PART_LABELS_JA.get(sorted_parts_desc[-1][0], "下半身")
            note = f"{best}の一致が強く、{worst}は差分あり（参考値）"
            mid_b = (float(seg_b.get("start", 0.0)) + float(seg_b.get("end", 0.0))) / 2
            not_similar = _not_similar_explain(parts, mid_a, mid_b)
            cands.append(
                {
                    **seg_b,
                    "similarity": sim,
                    "parts": parts,
                    "explain": {"dominant_parts": dominant, "note": note},
                    "not_similar": not_similar,
                }
            )
        cands_sorted = sorted(cands, key=lambda x: x["similarity"], reverse=True)[: (top_k or 3)]
        matches.append({**seg, "candidates": cands_sorted})

    meta = {
        "processing_ms": duration_ms,
        "segmentsA": len(segs_a),
        "segmentsB": len(segs_b),
    }

    return {
        "matches": matches,
        "meta": meta,
    }


@app.post("/choreo/check")
async def choreo_check(
    file: UploadFile = File(...),
    reference: UploadFile = File(...),
    input_path: Optional[str] = Form(None),
    reference_path: Optional[str] = Form(None),
    sample_fps: float = Form(15),
    max_seconds: float = Form(30),
):
    content = await file.read()
    ref_content = await reference.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty input file")
    if not ref_content:
        raise HTTPException(status_code=400, detail="Empty reference file")

    start_ts = time.time()
    warnings = []
    input_hash = hashlib.sha256(content).hexdigest()
    ref_hash = hashlib.sha256(ref_content).hexdigest()
    if input_hash == ref_hash:
        warnings.append("SAME_VIDEO_HASH")

    target_fps = sample_fps or CHOREO_TARGET_FPS
    pose_input = None
    pose_ref = None
    try:
        pose_input = _process_pose_bytes(content, target_fps, max_seconds)
    except Exception:  # noqa: BLE001
        warnings.append("EXTRACT_FAILED")
    try:
        pose_ref = _process_pose_bytes(ref_content, target_fps, max_seconds)
    except Exception:  # noqa: BLE001
        warnings.append("EXTRACT_FAILED")

    input_meta = _build_io_meta(input_path, input_hash, pose_input)
    ref_meta = _build_io_meta(reference_path, ref_hash, pose_ref)

    pose_rate_input = input_meta.get("pose_success_rate") or 0.0
    pose_rate_ref = ref_meta.get("pose_success_rate") or 0.0

    features_a = pose_input.get("features") if pose_input else []
    features_b = pose_ref.get("features") if pose_ref else []
    if not features_a or not features_b or _has_invalid_vectors(features_a) or _has_invalid_vectors(features_b):
        warnings.append("EXTRACT_FAILED")
    frames_input_raw = input_meta.get("frames") or 0
    frames_ref_raw = ref_meta.get("frames") or 0
    effective_frames_input = len(features_a)
    effective_frames_ref = len(features_b)
    frames_input = (
        min(frames_input_raw or effective_frames_input, effective_frames_input)
        if effective_frames_input
        else frames_input_raw
    )
    frames_ref = (
        min(frames_ref_raw or effective_frames_ref, effective_frames_ref)
        if effective_frames_ref
        else frames_ref_raw
    )

    if frames_input < CHOREO_MIN_FRAMES or frames_ref < CHOREO_MIN_FRAMES:
        warnings.append("FRAMES_TOO_FEW")
    if pose_rate_input < CHOREO_MIN_POSE_RATE or pose_rate_ref < CHOREO_MIN_POSE_RATE:
        warnings.append("POSE_LOW_CONFIDENCE")

    overall_similarity = None
    confidence = "low"
    distance = None
    if not warnings or warnings == ["SAME_VIDEO_HASH"]:
        seq_a = _downsample_vectors(features_a, 300)
        seq_b = _downsample_vectors(features_b, 300)
        if seq_a and seq_b:
            weights = {"arms": CHOREO_WEIGHT_ARMS, "legs": CHOREO_WEIGHT_LEGS, "torso": CHOREO_WEIGHT_TORSO}
            cost = _dtw_cost(seq_a, seq_b, 10, lambda a, b: _feature_distance(a, b, weights))
            norm = max(len(seq_a), len(seq_b))
            distance = (cost / norm) if norm > 0 else None
            if distance is not None and math.isfinite(distance):
                overall_similarity = math.exp(-CHOREO_SIM_ALPHA * distance)
                overall_similarity = max(0.0, min(1.0, overall_similarity))
                confidence = "high" if overall_similarity >= 0.8 else "medium" if overall_similarity >= 0.5 else "low"
        else:
            warnings.append("EXTRACT_FAILED")

    phrases = []
    phrase_count = 0
    if features_a and features_b:
        d_angles_a = pose_input.get("d_angles") if pose_input else []
        d_angles_b = pose_ref.get("d_angles") if pose_ref else []
        motion_energy = pose_input.get("motion_energy") if pose_input else []
        if d_angles_a and d_angles_b and motion_energy:
            smoothed_energy = _smooth_scalar_series(motion_energy, 5)
            mean_val, std_val = _mean_std(smoothed_energy)
            threshold = mean_val + 0.5 * std_val
            peaks = _find_peaks(smoothed_energy, threshold, 10)
            if len(peaks) >= 2:
                for start_idx, end_idx in zip(peaks, peaks[1:]):
                    if end_idx <= start_idx:
                        continue
                    end_idx = min(end_idx, len(d_angles_a), len(d_angles_b))
                    if end_idx <= start_idx:
                        continue
                    seg_a = d_angles_a[start_idx:end_idx]
                    seg_b = d_angles_b[start_idx:end_idx]
                    if not seg_a or not seg_b:
                        continue
                    cost = _dtw_cost(seg_a, seg_b, 10, lambda a, b: _feature_distance(a, b, {"arms": 1.0, "legs": 1.0, "torso": 1.0}))
                    norm = max(len(seg_a), len(seg_b))
                    if norm <= 0:
                        continue
                    dist = cost / norm
                    if not math.isfinite(dist):
                        continue
                    similarity = math.exp(-CHOREO_SIM_ALPHA * dist)
                    phrases.append(
                        {
                            "start": round(start_idx / target_fps, 3),
                            "end": round(end_idx / target_fps, 3),
                            "similarity": max(0.0, min(1.0, similarity)),
                        }
                    )
        phrase_count = len(phrases)

    warnings = list(dict.fromkeys(warnings))
    processing_ms = int((time.time() - start_ts) * 1000)
    meta = {
        "input": input_meta,
        "reference": ref_meta,
        "processing": {
            "algorithm": "dtw-exp",
            "processing_ms": processing_ms,
            "warnings": warnings,
            "distance": distance,
            "alpha": CHOREO_SIM_ALPHA,
            "feature": "angles+delta+smooth+trim",
            "target_fps": target_fps,
            "normalize": {
                "translate": True,
                "scale": True,
                "rotate": CHOREO_NORMALIZE_ROTATE,
            },
            "trim": {
                "input": pose_input.get("trim") if pose_input else None,
                "reference": pose_ref.get("trim") if pose_ref else None,
            },
            "weights": {
                "arms": CHOREO_WEIGHT_ARMS,
                "legs": CHOREO_WEIGHT_LEGS,
                "torso": CHOREO_WEIGHT_TORSO,
                "d_angle": CHOREO_DANGLE_WEIGHT,
            },
            "smooth_window": CHOREO_SMOOTH_WINDOW,
            "trim_energy_threshold": CHOREO_TRIM_ENERGY,
            "dtw_distance_raw": distance,
            "phrase_count": phrase_count,
            "phrase_algorithm": "motion-energy-peak",
        },
    }

    explanation = {
        "similar_reason": "Similarity is estimated from pose comparison.",
        "different_reason": "Differences are summarized from pose trajectories.",
    }
    if overall_similarity is None:
        explanation = {
            "similar_reason": "骨格推定が不安定なため参考値です",
            "different_reason": "全身が映る動画/明るい環境で再試行してください",
        }

    return {
        "overall_similarity": overall_similarity,
        "confidence": confidence,
        "explanation": explanation,
        "phrases": phrases,
        "meta": meta,
    }


@app.post("/choreo/compute")
async def choreo_compute(payload: Dict[str, Any] = Body(...)):
    mode = payload.get("mode")
    poseA_url = payload.get("poseA_url")
    poseB_url = payload.get("poseB_url")
    top_k = int(payload.get("top_k", 3))
    band = int(payload.get("band", 10))

    if mode not in {"compare", "compare_dtw", "segment", "phrase_compare"}:
        raise HTTPException(status_code=400, detail="Invalid mode")

    pose_a = _load_pose_json(poseA_url) if poseA_url else None
    pose_b = _load_pose_json(poseB_url) if poseB_url else None

    start_ts = time.time()
    try:
        vectors_a = pose_a.get("vectors") if pose_a else None
        vectors_b = pose_b.get("vectors") if pose_b else None

        if mode in {"compare", "compare_dtw", "phrase_compare"}:
            if not vectors_a or not vectors_b:
                raise HTTPException(status_code=400, detail="Pose vectors missing")
        if mode == "segment" and not vectors_a:
            raise HTTPException(status_code=400, detail="Pose vectors missing")

        if mode == "compare":
            vec_a = _pool_vectors(vectors_a)
            vec_b = _pool_vectors(vectors_b)
            similarity = _cosine_similarity(vec_a, vec_b) if vec_a and vec_b else 0.0
            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "framesA": len(vectors_a),
                "framesB": len(vectors_b),
            }
            return {"meta": meta, "similarity": similarity}

        if mode == "compare_dtw":
            seq_a = _downsample_vectors(vectors_a, 300)
            seq_b = _downsample_vectors(vectors_b, 300)
            cost = _dtw_cost(seq_a, seq_b, band)
            norm = max(len(seq_a), len(seq_b))
            similarity = math.exp(-cost / norm) if norm > 0 else 0.0
            similarity = max(0.0, min(1.0, similarity))
            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "framesA": len(seq_a),
                "framesB": len(seq_b),
                "band": band,
            }
            return {"meta": meta, "similarity": similarity, "dtw_cost": cost}

        if mode == "segment":
            fps_a = pose_a.get("meta", {}).get("sample_fps") or 10
            segments, energy = _segment_with_energy(vectors_a, fps_a)
            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "frames": len(vectors_a),
                "sample_fps": fps_a,
                "duration_sec": pose_a.get("seconds_used") or pose_a.get("meta", {}).get("max_seconds"),
            }
            return {
                "segments": segments,
                "energy_preview": energy[:200],
                "meta": meta,
            }

        if mode == "phrase_compare":
            fps_a = pose_a.get("meta", {}).get("sample_fps") or 10
            fps_b = pose_b.get("meta", {}).get("sample_fps") or 10
            segs_a = _segment_from_vectors(vectors_a, fps_a)
            segs_b = _segment_from_vectors(vectors_b, fps_b)

            def pool_segment(vecs, start_sec, end_sec, fps_val):
                start_idx = int(start_sec * fps_val)
                end_idx = int(end_sec * fps_val)
                clip = vecs[start_idx:end_idx] if end_idx > start_idx else []
                return _pool_vectors(clip) if clip else []

            emb_a = [pool_segment(vectors_a, s["start"], s["end"], fps_a) for s in segs_a]
            emb_b = [pool_segment(vectors_b, s["start"], s["end"], fps_b) for s in segs_b]

            matches = []
            for seg, vec in zip(segs_a, emb_a):
                cands = []
                mid_a = (float(seg.get("start", 0.0)) + float(seg.get("end", 0.0))) / 2
                for seg_b, vec_b in zip(segs_b, emb_b):
                    sim = _cosine_similarity(vec, vec_b) if vec and vec_b else 0.0
                    parts = _part_similarity(vec, vec_b) if vec and vec_b else {"upper": 0.0, "core": 0.0, "lower": 0.0}
                    sorted_parts = sorted(parts.items(), key=lambda x: x[1], reverse=True)
                    dominant = [name for name, _ in sorted_parts[:2]]
                    best = _PART_LABELS_JA.get(sorted_parts[0][0], "上半身")
                    worst = _PART_LABELS_JA.get(sorted_parts[-1][0], "下半身")
                    note = f"{best}の一致が強く、{worst}は差分あり（参考値）"
                    mid_b = (float(seg_b.get("start", 0.0)) + float(seg_b.get("end", 0.0))) / 2
                    not_similar = _not_similar_explain(parts, mid_a, mid_b)
                    cands.append(
                        {
                            **seg_b,
                            "similarity": sim,
                            "parts": parts,
                            "explain": {"dominant_parts": dominant, "note": note},
                            "not_similar": not_similar,
                        }
                    )
                cands_sorted = sorted(cands, key=lambda x: x["similarity"], reverse=True)[: (top_k or 3)]
                matches.append({**seg, "candidates": cands_sorted})

            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "segmentsA": len(segs_a),
                "segmentsB": len(segs_b),
            }
            return {"matches": matches, "meta": meta}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc


@app.post("/multimodal/align")
async def multimodal_align(
    file: UploadFile = File(...),
    max_seconds: float = Form(60),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    max_seconds = float(max_seconds) if max_seconds and max_seconds > 0 else 60.0
    tolerance_ms = 150

    started = time.time()
    try:
        audio = _audio_peaks_from_video_bytes(content, max_seconds, 200)
        motion = _motion_peaks_from_video_bytes(content, max_seconds, 200, 10)
        lag_ms = _mode_lag_ms(audio["peaks_ms"], motion["peaks_ms"])
        sync_score = _match_rate(audio["peaks_ms"], motion["peaks_ms"], tolerance_ms, lag_ms)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

    processing_ms = int((time.time() - started) * 1000)
    meta = {
        "processing_ms": processing_ms,
        "frames": motion.get("frames"),
        "sample_fps": motion.get("sample_fps"),
        "duration_sec": round(min(max_seconds, (motion.get("duration_ms") or 0) / 1000), 3),
        "max_seconds": max_seconds,
        "tolerance_ms": tolerance_ms,
    }

    return {
        "meta": meta,
        "audio_peaks": audio["peaks_ms"][:200],
        "motion_peaks": motion["peaks_ms"][:200],
        "sync_score": round(sync_score, 4),
        "lag_ms": lag_ms,
    }


@app.post("/multimodal/compare")
async def multimodal_compare(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    max_seconds: float = Form(60),
):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    max_seconds = float(max_seconds) if max_seconds and max_seconds > 0 else 60.0
    tolerance_ms = 150

    started = time.time()
    try:
        audio_a = _audio_peaks_from_video_bytes(content_a, max_seconds, 200)
        motion_a = _motion_peaks_from_video_bytes(content_a, max_seconds, 200, 10)
        lag_a = _mode_lag_ms(audio_a["peaks_ms"], motion_a["peaks_ms"])
        sync_a = _match_rate(audio_a["peaks_ms"], motion_a["peaks_ms"], tolerance_ms, lag_a)

        audio_b = _audio_peaks_from_video_bytes(content_b, max_seconds, 200)
        motion_b = _motion_peaks_from_video_bytes(content_b, max_seconds, 200, 10)
        lag_b = _mode_lag_ms(audio_b["peaks_ms"], motion_b["peaks_ms"])
        sync_b = _match_rate(audio_b["peaks_ms"], motion_b["peaks_ms"], tolerance_ms, lag_b)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

    # Similarity via near-match ratio on normalized peaks.
    def _norm(peaks_ms, duration_ms):
        denom = max(duration_ms, 1)
        return [p / denom for p in peaks_ms]

    def _match_norm(a_norm, b_norm, tol):
        if not a_norm or not b_norm:
            return 0.0
        used = [False] * len(b_norm)
        matches = 0
        for x in a_norm:
            best_j = None
            best_dt = None
            for j, y in enumerate(b_norm):
                if used[j]:
                    continue
                dt = abs(y - x)
                if dt <= tol and (best_dt is None or dt < best_dt):
                    best_dt = dt
                    best_j = j
            if best_j is not None:
                used[best_j] = True
                matches += 1
        return matches / max(len(a_norm), len(b_norm), 1)

    audio_similarity = _match_norm(
        _norm(audio_a["peaks_ms"], audio_a["duration_ms"]),
        _norm(audio_b["peaks_ms"], audio_b["duration_ms"]),
        0.02,
    )
    motion_similarity = _match_norm(
        _norm(motion_a["peaks_ms"], motion_a["duration_ms"]),
        _norm(motion_b["peaks_ms"], motion_b["duration_ms"]),
        0.03,
    )

    if audio_similarity >= 0.7 and motion_similarity >= 0.7:
        interpretation = "音声と動きのピークパターンが近い可能性があります（参考値）"
    elif audio_similarity >= 0.7:
        interpretation = "音声のピークパターンは近い一方、動きのピークは差分がある可能性があります（参考値）"
    elif motion_similarity >= 0.7:
        interpretation = "動きのピークパターンは近い一方、音声ピークは差分がある可能性があります（参考値）"
    else:
        interpretation = "音声/動きのピークパターンに差分がある可能性があります（参考値）"

    processing_ms = int((time.time() - started) * 1000)
    meta = {"processing_ms": processing_ms, "max_seconds": max_seconds, "tolerance_ms": tolerance_ms}

    return {
        "meta": meta,
        "audio_similarity": round(audio_similarity, 4),
        "motion_similarity": round(motion_similarity, 4),
        "interpretation": interpretation,
        "A": {"audio_peaks": audio_a["peaks_ms"][:200], "motion_peaks": motion_a["peaks_ms"][:200], "sync_score": round(sync_a, 4), "lag_ms": lag_a},
        "B": {"audio_peaks": audio_b["peaks_ms"][:200], "motion_peaks": motion_b["peaks_ms"][:200], "sync_score": round(sync_b, 4), "lag_ms": lag_b},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
