const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const config = require('../config');

function getPythonCommand() {
  const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python3');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python3';
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ingestAudio(filePath) {
  if (!fs.existsSync(config.whisperScript)) {
    throw new Error(`Whisper script not found at ${config.whisperScript}`);
  }

  const result = spawnSync(getPythonCommand(), [config.whisperScript, filePath], {
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(`Failed to run whisper script: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Whisper transcription failed');
  }

  const payload = JSON.parse(result.stdout);
  return payload.segments.map((segment) => ({
    startSec: segment.start,
    endSec: segment.end,
    start: formatTimestamp(segment.start),
    end: formatTimestamp(segment.end),
    speaker: segment.speaker || 'Speaker',
    text: segment.text.trim(),
  }));
}

module.exports = { ingestAudio, formatTimestamp };
