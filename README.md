# Meeting Intelligence Assistant

Multimodal meeting Q&A assistant built with Node.js, Express, and NVIDIA Nemotron 3 Omni on JarvisLabs.

**GitHub:** https://github.com/mukulkatewa/meeting_intelligence_assistant

**Live demo (JarvisLabs):** `http://217.18.55.20:3000` (instance must be running)

---

## What it does

This app takes three meeting inputs together — a PDF deck, meeting audio, and a screen recording — and lets you ask questions across all of them as one meeting. Answers include grounded evidence (slide numbers, timestamps, speaker labels, and quotes) so you can verify each response.

---

## Why I built this

Meetings are never stored in just one format. Decisions live on slides, arguments happen in audio, and context appears in screen recordings. I picked this problem because it is a real workflow pain point and it maps naturally to an open omni model like Nemotron 3 Omni. I wanted a pipeline that is simple to inspect, easy for reviewers to run, and still demonstrates true cross-modal reasoning instead of single-file Q&A.

---

## How to run it

### Prerequisites

- JarvisLabs GPU instance (1x H100 or A100 recommended)
- Docker with NVIDIA GPU support
- Node.js 18+
- Python 3 with venv
- ffmpeg, tesseract (optional but recommended)

### 1) JarvisLabs setup

1. Create account at [jarvislabs.ai](https://jarvislabs.ai)
2. Redeem coupon: `JARVIS_LABS_7TAR8N`
3. Add SSH key in Settings
4. Launch VM with H100/A100 and Docker template
5. SSH into the instance:

```bash
ssh ubuntu@<your-jarvislabs-ip>
```

6. Clone and setup:

```bash
git clone https://github.com/mukulkatewa/meeting_intelligence_assistant.git
cd meeting_intelligence_assistant
chmod +x scripts/*.sh
./scripts/setup-jarvislabs.sh
```

### 2) Start Nemotron 3 Omni (Terminal 1)

```bash
./scripts/start-model.sh
docker logs -f nemotron-omni
```

Wait until you see `Application startup complete` (first run: 15–30 minutes).

Test:

```bash
curl http://127.0.0.1:8000/v1/models
```

### 3) Start web app (Terminal 2)

```bash
./scripts/start-app.sh
```

Or:

```bash
cp .env.example .env
npm start
```

Open: `http://<jarvislabs-ip>:3000`

### 4) Try the demo

Click **Load demo meeting**, wait for status **ready**, then ask the example questions below.

To regenerate demo files:

```bash
npm run generate-sample
```

---

## Cross-modal example questions (required)

These questions need **more than one input type** to answer correctly.

### Q1: What was the final decision on the pricing change?

**Expected answer:** Pricing moved from $49/month to **$59/month**.

**Grounding:**
- Slide 6: "Pricing change approved: $59/month"
- Audio (~00:42): "Final decision: move pricing to fifty nine dollars..."

**Modalities used:** deck + audio

---

### Q2: Which slide was being discussed when the budget came up?

**Expected answer:** **Slide 4** (Budget Discussion, $120,000 launch budget).

**Grounding:**
- Audio (~00:18): "When budget came up on slide four..."
- Slide 4 text: "Launch budget request: $120,000"
- Video frames show "Slide 4" label during that segment

**Modalities used:** audio + deck + video

---

### Q3: Who disagreed with the timeline and what did they propose instead?

**Expected answer:** A participant disagreed with the **8-week** timeline and proposed **10 weeks** instead. Final decision also adopted 10 weeks.

**Grounding:**
- Slide 5: "Initial proposal: 8 weeks"
- Audio (~00:30): "I disagree with the eight week timeline on slide five. I propose ten weeks instead."
- Slide 6: "Timeline updated to 10 weeks"

**Modalities used:** audio + deck (+ video for slide visibility)

---

## Input types supported

| Input | Format | Processing |
|-------|--------|------------|
| Deck | PDF | Text extracted per slide via `pypdf` |
| Audio | WAV/MP3 | Transcript + timestamps via `faster-whisper` |
| Video | MP4 | Frame sampling via `ffmpeg`, slide OCR via `tesseract` |

All three are uploaded together and merged into one JSON meeting index.

---

## Architecture decisions

| Decision | What I chose | Why (vs obvious alternative) |
|----------|--------------|-------------------------------|
| Backend | Express + plain HTML | Faster to ship and test than React; reviewers can run with `npm start` only |
| Model | Nemotron 3 Omni via vLLM | Assignment requirement; OpenAI-compatible API keeps app code simple |
| Hosting | Same JarvisLabs VM for model + app | Assignment requirement; model on `:8000`, app on `:3000` |
| Pre-indexing | JSON meeting index before Q&A | Sending full video/audio every question is slow and expensive |
| Audio parsing | Whisper for timestamps | Nemotron can read audio, but Whisper gives reliable citation timestamps |
| Video parsing | ffmpeg frames + OCR | Cheaper than sending full video to the model on every question |
| Retrieval | Keyword scoring | Good enough for demo scope; vector DB adds infra without big gain here |
| Sample data | Generated aligned demo | Reviewers can test without recording a real meeting |

---

## What worked

- End-to-end flow: upload/demo → index → ask → grounded answer
- Nemotron 3 Omni on JarvisLabs H100 via vLLM Docker
- Cross-modal answers with slide numbers and audio quotes
- Demo meeting generator creates aligned PDF + audio + video
- Simple web UI reviewers can use immediately

## What did not work smoothly

- Default Ubuntu Node (v12) on JarvisLabs had no npm — fixed by installing Node 20 via NodeSource
- vLLM Docker image entrypoint required `--entrypoint /bin/bash` (without it, `bash -lc` was passed to vllm and failed)
- First model load takes 15–30 minutes; easy to think the system is broken
- Whisper speaker labels are placeholders (Speaker 1/2/3), not real diarization
- Audio timestamps from Whisper do not always match scripted demo timestamps exactly
- App must stay running (`npm start`); stopping it leaves browser stuck on "Generating answer..."

---

## What I used AI for

| Part | AI / Hand-written |
|------|-------------------|
| Express project scaffold | AI-assisted |
| Ingestion pipeline (PDF, audio, video) | Hand-written |
| Meeting index + retrieval logic | Hand-written |
| Nemotron prompt + JSON answer format | Hand-written |
| Sample meeting generator | Hand-written |
| JarvisLabs setup scripts | Hand-written after debugging on VM |
| README structure | AI-assisted, edited manually |

**Where I overrode AI:** Removed React, vector DB, and microservices suggestions to keep the project simple and debuggable on one GPU VM.

---

## What I would change with 4 more weeks

- Real speaker diarization (pyannote) instead of Whisper placeholder speakers
- Semantic retrieval with embeddings for paraphrased questions
- Better slide-video sync using scene detection
- Background job queue for long ingestion tasks
- Automated evaluation set with citation accuracy scoring
- Auth, multi-user storage, and production deployment (PM2, nginx, HTTPS)
- Fix edge cases in model JSON parsing for Nemotron reasoning output

---

## Project layout

```text
server.js                 # Express entrypoint
routes/meetings.js        # Upload, demo, status, ask APIs
services/                 # Ingestion, indexing, retrieval, model call
scripts/                  # JarvisLabs setup, vLLM launch, sample generation
public/                   # Web UI
sample_inputs/generated/  # Demo deck/audio/video (generated locally)
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/meetings` | Upload deck + audio + video |
| POST | `/api/meetings/demo` | Index bundled demo meeting |
| GET | `/api/meetings/:id/status` | Processing status |
| GET | `/api/meetings/:id/index` | Full meeting index (debug) |
| POST | `/api/meetings/:id/ask` | Ask grounded question |
| GET | `/api/health` | Health check |

---

## Assignment checklist

- [x] Three input types: PDF deck, audio, video
- [x] Cross-modal Q&A with grounded citations
- [x] Three example cross-modal questions in README
- [x] Runnable web app with sample demo inputs
- [x] Nemotron 3 Omni on JarvisLabs (vLLM inference)
- [x] App deployed on same JarvisLabs instance
- [x] README follows required template
- [x] Project on GitHub

---

## Tech stack

- **Backend:** Node.js, Express, Multer
- **Frontend:** HTML, CSS, vanilla JS
- **Ingestion:** pypdf, faster-whisper, ffmpeg, tesseract
- **Model:** NVIDIA Nemotron 3 Nano Omni (NVFP4) via vLLM 0.20.0
- **Deploy:** JarvisLabs H100 GPU instance
