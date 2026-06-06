#!/usr/bin/env bash
set -euo pipefail

# Fixes common JarvisLabs setup issues: old Node, missing npm, incomplete setup.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Step 1: Install Node.js 20 ==="
NODE_MAJOR="$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo 0)"
if ! command -v npm >/dev/null || [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "Replacing old Node (found: $(node -v 2>/dev/null || echo none))..."
  sudo apt-get remove -y nodejs npm 2>/dev/null || true
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "Node: $(node -v)"
echo "npm: $(npm -v)"

echo "=== Step 2: Install system packages ==="
sudo apt-get update -qq
sudo apt-get install -y ffmpeg tesseract-ocr espeak-ng python3-venv python3-pip git curl ca-certificates

echo "=== Step 3: Check Docker (do not reinstall if already working) ==="
if docker info >/dev/null 2>&1; then
  echo "Docker is working."
else
  echo "Docker not available. Use JarvisLabs GPU template with Docker preinstalled."
  echo "If needed, ask JarvisLabs support instead of installing docker.io manually."
  exit 1
fi

echo "=== Step 4: Project setup ==="
npm install

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --upgrade pip
.venv/bin/pip install faster-whisper gTTS pydub pypdf

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -f sample_inputs/generated/deck.pdf ]; then
  npm run generate-sample
fi

echo "=== Step 5: Quick checks ==="
curl -s http://127.0.0.1:3000/api/health >/dev/null 2>&1 && echo "App already running" || echo "App not running yet (expected)"
curl -s http://127.0.0.1:8000/v1/models >/dev/null 2>&1 && echo "Model already running" || echo "Model not running yet (expected)"

echo ""
echo "Fix complete."
echo "Next:"
echo "  Terminal 1: ./scripts/start-model.sh"
echo "  Terminal 2: ./scripts/start-app.sh"
