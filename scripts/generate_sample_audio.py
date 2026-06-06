#!/usr/bin/env python3
import json
import shutil
import subprocess
import sys
from pathlib import Path

LINES = [
    "Welcome everyone to the Q2 product planning meeting.",
    "On slide three, current pricing is forty nine dollars per month for the pro plan.",
    "When budget came up on slide four, we reviewed the one hundred twenty thousand dollar launch budget.",
    "I disagree with the eight week timeline on slide five. I propose ten weeks instead.",
    "Final decision: move pricing to fifty nine dollars and approve the ten week timeline.",
]


def run(cmd):
    subprocess.run(cmd, check=True)


def with_espeak(parts_dir: Path):
    speak = "espeak-ng" if shutil.which("espeak-ng") else "espeak"
    concat = parts_dir / "concat.txt"
    with concat.open("w", encoding="utf-8") as handle:
        for idx, line in enumerate(LINES, start=1):
            part = parts_dir / f"part_{idx}.wav"
            run([speak, "-s", "155", "-w", str(part), line])
            handle.write(f"file '{part}'\n")


def with_gtts(parts_dir: Path):
    from gtts import gTTS
    from pydub import AudioSegment

    combined = AudioSegment.empty()
    for idx, line in enumerate(LINES, start=1):
        mp3_path = parts_dir / f"part_{idx}.mp3"
        wav_path = parts_dir / f"part_{idx}.wav"
        gTTS(text=line, lang="en").save(str(mp3_path))
        segment = AudioSegment.from_mp3(str(mp3_path))
        segment.export(str(wav_path), format="wav")
        combined += segment
        combined += AudioSegment.silent(duration=400)
    return combined


def main():
    if len(sys.argv) < 2:
        print("output dir required", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(sys.argv[1])
    work_dir = output_dir / "work"
    work_dir.mkdir(parents=True, exist_ok=True)

    audio_wav = output_dir / "meeting_audio.wav"

    if shutil.which("espeak-ng") or shutil.which("espeak"):
        with_espeak(work_dir)
        concat = work_dir / "concat.txt"
        run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat), "-c", "copy", str(audio_wav),
        ])
    else:
        try:
            combined = with_gtts(work_dir)
            combined.export(str(audio_wav), format="wav")
        except ImportError:
            print(
                "Install espeak-ng or run: pip install gTTS pydub",
                file=sys.stderr,
            )
            sys.exit(1)

    print(json.dumps({"audio": str(audio_wav)}))


if __name__ == "__main__":
    main()
