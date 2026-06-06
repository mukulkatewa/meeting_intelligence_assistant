# Meeting Intelligence Assistant

Multimodal meeting Q&A assistant built with Node.js, Express, and NVIDIA Nemotron 3 Omni.

## What it does

This app ingests a meeting deck (PDF), meeting audio, and a screen recording together, then answers natural-language questions across all three sources. Responses include grounded evidence such as slide numbers, timestamps, speaker references, and short quotes so answers can be verified.

## Why I built this

Meetings rarely live in one format: decisions appear in slides, debate happens in audio, and context is visible in screen recordings. I picked this problem because cross-modal retrieval is a practical real-world need, and it maps well to an open omni model like Nemotron 3 Omni. The goal was to keep the pipeline simple and inspectable while still demonstrating true multimodal reasoning.

## How to run it

### 1) JarvisLabs setup

1. Redeem coupon code: `JARVIS_LABS_7TAR8N`
2. Launch a GPU instance (recommended: 1x A100/H100 with enough VRAM for Nemotron 3 Nano Omni)
3. Clone this repo on the instance
4. Run setup:

```bash
chmod +x scripts/*.sh
./scripts/setup-jarvislabs.sh
```

### 2) Start Nemotron 3 Omni (vLLM)

```bash
./scripts/start-model.sh
```

This starts an OpenAI-compatible vLLM server on port `8000`.

### 3) Start the web app

```bash
cp .env.example .env
npm start
```

Open `http://<jarvislabs-public-ip>:3000`.

### 4) Try the demo meeting

In the UI, click **Load demo meeting** (or run `npm run generate-sample` first if files are missing).

Then ask:

1. `What was the final decision on the pricing change?`
2. `Which slide was being discussed when the budget came up?`
3. `Who disagreed with the timeline and what did they propose instead?`

These require combining slide content, transcript timing, and video/slide alignment.

## Architecture decisions

- **Express + plain HTML frontend**: Chosen for fast setup and easy reviewer testing. A React frontend would add build complexity without improving core assignment goals.
- **Pre-index meeting inputs before Q&A**: Raw 30-60 minute media is expensive to send on every question. I preprocess once into a JSON meeting index and retrieve relevant chunks per question.
- **Whisper (`faster-whisper`) for audio grounding**: Nemotron can consume audio directly, but Whisper gives reliable timestamped transcript segments for citation and timeline alignment.
- **ffmpeg frame extraction + optional OCR for video grounding**: Video is sampled every N seconds; OCR reads visible "Slide X" labels to link spoken moments to deck pages.
- **Keyword retrieval instead of vector DB**: For this scope, lightweight retrieval over indexed chunks is enough and keeps dependencies minimal.
- **Nemotron 3 Omni via vLLM OpenAI API**: Matches assignment model requirement and keeps inference isolated behind a stable HTTP interface.

## What I used AI for

- AI helped scaffold initial Express route/service structure and README wording.
- I wrote ingestion logic, retrieval format, grounded JSON response contract, and sample-meeting generation script by hand.
- I overrode AI suggestions to remove unnecessary abstractions (no microservices, no vector DB, no React) to keep the project simple and assignment-focused.

## What I would change with 4 more weeks

- Add true speaker diarization (pyannote) instead of placeholder speaker labels.
- Improve slide-video alignment using scene-change detection and stronger OCR/layout parsing.
- Add semantic retrieval (embeddings) for better recall on paraphrased questions.
- Add meeting upload progress, retryable background jobs, and persistent storage.
- Add evaluation harness with labeled Q&A pairs and citation accuracy scoring before shipping to real users.

## Project layout

```text
server.js                 # Express entrypoint
routes/meetings.js        # Upload, demo, status, ask APIs
services/                 # Ingestion, indexing, retrieval, model call
scripts/                  # JarvisLabs setup, vLLM launch, sample generation
public/                   # Minimal web UI
sample_inputs/generated/  # Generated demo deck/audio/video
```

## API endpoints

- `POST /api/meetings` - upload deck/audio/video
- `POST /api/meetings/demo` - index bundled demo meeting
- `GET /api/meetings/:id/status` - processing status
- `POST /api/meetings/:id/ask` - ask grounded question

## Requirements

- Node.js 18+
- Python 3 + `faster-whisper`
- ffmpeg, ffprobe
- Optional: `tesseract` for slide label OCR
- Docker + NVIDIA GPU runtime for Nemotron vLLM server

## Sample input generation

If demo files are missing:

```bash
npm run generate-sample
```

This creates:

- `sample_inputs/generated/deck.pdf`
- `sample_inputs/generated/meeting_audio.wav`
- `sample_inputs/generated/screen_recording.mp4`

Dependencies for generation: `ffmpeg` plus either `espeak-ng` or Python packages `gTTS` and `pydub`.
