# Lab Guide: Choreo Pose Backend Switching

## Setup

- Copy `.env.lab.example` to `.env.lab`
- Fill `HF_TOKEN` if you use embeddings

## Run (default: mediapipe only)

docker compose -f docker-compose.lab.yml up --build

## Run with optional backends

- MMPose:
  - docker compose -f docker-compose.lab.yml --profile mmpose up --build
  - Set `AI_SERVICE_URL=http://localhost:8002` in `.env.local`
- OpenPose (stub):
  - docker compose -f docker-compose.lab.yml --profile openpose up --build
  - Set `AI_SERVICE_URL=http://localhost:8003` in `.env.local`

## Verify

- Visit `/lab/choreo/pose`
- Choose backend and run
- Check `lab_runs` and `/lab/runs/[id]` output

## P0検証手順

- `/lab/choreo/pose` を実行し、`/lab/runs/:id` で frames と vectors が表示されること
- `/lab/choreo/compare` を実行し、similarity が表示されること
- `/lab/choreo/compare-dtw` を実行し、vectors missing が再発しないこと
- `/lab/runs/:id/report` が壊れず表示されること
