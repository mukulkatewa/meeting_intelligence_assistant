#!/usr/bin/env bash
set -euo pipefail

# Start Nemotron 3 Omni via vLLM on JarvisLabs GPU instance.
# Requires Docker and NVIDIA drivers.

MODEL="${MODEL_NAME:-nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4}"
PORT="${MODEL_PORT:-8000}"

docker run --rm -d \
  --gpus all \
  --ipc=host \
  --shm-size=16g \
  -p "${PORT}:8000" \
  -v /:/host \
  --name nemotron-omni \
  vllm/vllm-openai:v0.20.0 \
  bash -lc "pip install 'vllm[audio]==0.20.0' && vllm serve ${MODEL} \
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

echo "Nemotron vLLM server starting on port ${PORT}"
