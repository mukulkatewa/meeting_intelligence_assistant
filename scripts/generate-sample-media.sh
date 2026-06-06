#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR="${1:-./sample_inputs/generated}"
mkdir -p "$OUTPUT_DIR"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="$ROOT_DIR/.venv/bin/python3"
if [ ! -x "$PYTHON" ]; then
  PYTHON="python3"
fi

AUDIO_WAV="$OUTPUT_DIR/meeting_audio.wav"
VIDEO_MP4="$OUTPUT_DIR/screen_recording.mp4"
WORK_DIR="$OUTPUT_DIR/work"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

"$PYTHON" "$(dirname "$0")/generate_sample_audio.py" "$OUTPUT_DIR"

create_slide_video() {
  local number="$1"
  local title="$2"
  local body="$3"
  local duration="$4"
  local out="$5"

  ffmpeg -y \
    -f lavfi -i "color=c=#f4f6f8:s=1280x720:d=${duration}" \
    -vf "drawtext=text='Slide ${number}':x=60:y=50:fontsize=42:fontcolor=#111111,\
drawtext=text='${title}':x=60:y=130:fontsize=34:fontcolor=#111111,\
drawtext=text='${body}':x=60:y=220:fontsize=26:fontcolor=#333333" \
    -pix_fmt yuv420p "$out" >/dev/null 2>&1
}

create_slide_video 1 "Product Planning Meeting" "Q2 Launch" 8 "$WORK_DIR/segment_1.mp4"
create_slide_video 2 "Agenda" "Pricing, Budget, Timeline" 10 "$WORK_DIR/segment_2.mp4"
create_slide_video 3 "Current Pricing" "Pro plan: 49 dollars per month" 12 "$WORK_DIR/segment_3.mp4"
create_slide_video 4 "Budget Discussion" "Launch budget: 120000 dollars" 12 "$WORK_DIR/segment_4.mp4"
create_slide_video 5 "Launch Timeline" "Initial proposal: 8 weeks" 12 "$WORK_DIR/segment_5.mp4"
create_slide_video 6 "Final Decisions" "Pricing 59 dollars, timeline 10 weeks" 13 "$WORK_DIR/segment_6.mp4"

> "$WORK_DIR/video_concat.txt"
for i in {1..6}; do
  echo "file '$WORK_DIR/segment_${i}.mp4'" >> "$WORK_DIR/video_concat.txt"
done

ffmpeg -y -f concat -safe 0 -i "$WORK_DIR/video_concat.txt" -i "$AUDIO_WAV" \
  -c:v copy -c:a aac -shortest "$VIDEO_MP4" >/dev/null 2>&1

echo "Generated:"
echo "  $AUDIO_WAV"
echo "  $VIDEO_MP4"
