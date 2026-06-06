#!/usr/bin/env python3
import json
import sys

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "audio path required"}))
        sys.exit(1)

    audio_path = sys.argv[1]

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            json.dumps({
                "error": "faster-whisper not installed. Run: pip install faster-whisper"
            }),
            file=sys.stderr,
        )
        sys.exit(1)

    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments_iter, _info = model.transcribe(audio_path, word_timestamps=False)

    segments = []
    for idx, segment in enumerate(segments_iter):
        segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "speaker": f"Speaker {idx % 3 + 1}",
            "text": segment.text.strip(),
        })

    print(json.dumps({"segments": segments}))

if __name__ == "__main__":
    main()
