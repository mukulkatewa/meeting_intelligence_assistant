#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Installing system packages..."
if command -v apt-get >/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y espeak-ng imagemagick ffmpeg tesseract-ocr
fi

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
