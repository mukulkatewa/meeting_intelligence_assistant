#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing system packages..."
if command -v apt-get >/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y espeak-ng imagemagick ffmpeg tesseract-ocr git curl ca-certificates
fi

if ! command -v npm >/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]; then
  echo "Node.js 18+ required. Installing Node.js 20..."
  sudo apt-get remove -y nodejs npm 2>/dev/null || true
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v python3 >/dev/null; then
  sudo apt-get install -y python3 python3-venv python3-pip
elif ! python3 -m venv --help >/dev/null 2>&1; then
  sudo apt-get install -y python3-venv python3-pip
fi

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

echo "Installing Node dependencies..."
npm install

echo "Installing Python virtual environment..."
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install faster-whisper gTTS pydub pypdf

echo "Checking system tools..."
command -v ffmpeg >/dev/null
command -v ffprobe >/dev/null

if command -v tesseract >/dev/null; then
  echo "tesseract found"
else
  echo "Warning: tesseract not found. Video slide detection will be limited."
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Generating sample meeting files..."
npm run generate-sample

echo "Setup complete."
