#!/usr/bin/env bash
set -euo pipefail

echo "=== Environment check ==="

check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "[ok] $1: $($1 --version 2>/dev/null | head -1 || echo found)"
  else
    echo "[missing] $1"
  fi
}

check node
check npm
check python3
check ffmpeg
check ffprobe
check docker
check tesseract

if [ -d .venv ]; then
  echo "[ok] .venv exists"
else
  echo "[missing] .venv"
fi

if [ -d node_modules ]; then
  echo "[ok] node_modules exists"
else
  echo "[missing] node_modules"
fi

if [ -f sample_inputs/generated/deck.pdf ]; then
  echo "[ok] demo files exist"
else
  echo "[missing] demo files"
fi

if [ -f .env ]; then
  echo "[ok] .env exists"
else
  echo "[missing] .env"
fi

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q nemotron-omni; then
  echo "[ok] nemotron-omni container running"
else
  echo "[missing] nemotron-omni container not running"
fi

if curl -s http://127.0.0.1:8000/v1/models >/dev/null 2>&1; then
  echo "[ok] model API on port 8000"
else
  echo "[missing] model API on port 8000"
fi

if curl -s http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "[ok] web app on port 3000"
else
  echo "[missing] web app on port 3000"
fi

echo "=== Done ==="
