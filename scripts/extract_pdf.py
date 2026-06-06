#!/usr/bin/env python3
import json
import re
import sys

from pypdf import PdfReader


def split_slide_text(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return ""

    if lines[0].lower().startswith("slide "):
        lines = lines[1:]

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "pdf path required"}))
        sys.exit(1)

    reader = PdfReader(sys.argv[1])
    slides = []

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        cleaned = split_slide_text(text)
        title_match = re.search(r"Slide\s+(\d+)", text, re.IGNORECASE)
        slide_number = int(title_match.group(1)) if title_match else index
        slides.append({
            "slideNumber": slide_number,
            "text": cleaned or text.strip(),
        })

    print(json.dumps({"slides": slides}))


if __name__ == "__main__":
    main()
