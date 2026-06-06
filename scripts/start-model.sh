#!/usr/bin/env bash
set -euo pipefail

MODEL="${MODEL_NAME:-nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4}"
PORT="${MODEL_PORT:-8000}"
CONTAINER_NAME="${CONTAINER_NAME:-nemotron-omni}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running."
  exit 1
fi

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "Starting Nemotron (first run can take 15-30 minutes)..."
docker run -d \
  --gpus all \
  --ipc=host \
  --shm-size=16g \
  -p "${PORT}:8000" \
  -v /:/host \
  --name "${CONTAINER_NAME}" \
  --entrypoint /bin/bash \
  vllm/vllm-openai:v0.20.0 \
  -lc "pip install 'vllm[audio]==0.20.0' && vllm serve ${MODEL} \
    --host 0.0.0.0 \
    --port 8000 \
    --served-model-name nemotron \
    --max-model-len 32768 \
    --tensor-parallel-size 1 \
    --trust-remote-code \
    --video-pruning-rate 0.5 \
    --allowed-local-media-path /host \
    --media-io-kwargs '{\"video\": {\"fps\": 2, \"num_frames\": 128}}' \
    --reasoning-parser nemotron_v3 \
    --enable-auto-tool-choice \
    --tool-call-parser qwen3_coder \
    --kv-cache-dtype fp8"

sleep 3

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container running. Watch logs:"
  echo "  docker logs -f ${CONTAINER_NAME}"
else
  echo "Container exited. Logs:"
  docker logs "${CONTAINER_NAME}" || true
  exit 1
fi
