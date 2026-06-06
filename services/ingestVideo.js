const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { formatTimestamp } = require('./ingestAudio');

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) {
    throw new Error(`Command failed (${command}): ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} exited with code ${result.status}`);
  }
  return result.stdout.trim();
}

function getVideoDurationSec(filePath) {
  const output = runCommand('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return Math.max(1, Math.floor(Number(output)));
}

function extractFrames(filePath, outputDir, intervalSec) {
  fs.mkdirSync(outputDir, { recursive: true });

  runCommand('ffmpeg', [
    '-y',
    '-i', filePath,
    '-vf', `fps=1/${intervalSec}`,
    path.join(outputDir, 'frame_%04d.jpg'),
  ]);

  const frames = fs.readdirSync(outputDir)
    .filter((name) => name.endsWith('.jpg'))
    .sort()
    .map((name, index) => {
      const timestampSec = index * intervalSec;
      return {
        timestampSec,
        timestamp: formatTimestamp(timestampSec),
        framePath: path.join(outputDir, name),
        frameFile: name,
      };
    });

  return frames;
}

function detectSlideHint(framePath) {
  const result = spawnSync('tesseract', [framePath, 'stdout', '--psm', '6'], {
    encoding: 'utf8',
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  const match = result.stdout.match(/Slide\s*(\d+)/i);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function ingestVideo(filePath, meetingDir) {
  const framesDir = path.join(meetingDir, 'frames');
  const durationSec = getVideoDurationSec(filePath);
  const frames = extractFrames(filePath, framesDir, config.videoFrameIntervalSec);

  return frames.map((frame) => {
    const detectedSlide = detectSlideHint(frame.framePath);
    return {
      timestampSec: frame.timestampSec,
      timestamp: frame.timestamp,
      frameFile: frame.frameFile,
      detectedSlide: detectedSlide || null,
      notes: detectedSlide ? `Visible slide label: Slide ${detectedSlide}` : 'Screen recording frame',
    };
  }).concat([{ durationSec }]);
}

module.exports = { ingestVideo };
