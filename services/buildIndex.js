const fs = require('fs');
const path = require('path');

function buildIndex({ meetingId, slides, transcript, videoFrames, sourceFiles }) {
  const durationEntry = videoFrames.find((item) => item.durationSec !== undefined);
  const frames = videoFrames.filter((item) => item.timestampSec !== undefined);

  const timeline = transcript.map((segment) => {
    const nearestFrame = frames.reduce((best, frame) => {
      const diff = Math.abs(frame.timestampSec - segment.startSec);
      if (!best || diff < best.diff) {
        return { frame, diff };
      }
      return best;
    }, null);

    return {
      startSec: segment.startSec,
      endSec: segment.endSec,
      start: segment.start,
      end: segment.end,
      speaker: segment.speaker,
      text: segment.text,
      nearestVideoTimestamp: nearestFrame ? nearestFrame.frame.timestamp : null,
      detectedSlide: nearestFrame ? nearestFrame.frame.detectedSlide : null,
    };
  });

  return {
    meetingId,
    createdAt: new Date().toISOString(),
    sourceFiles,
    slides,
    transcript,
    videoFrames: frames,
    durationSec: durationEntry ? durationEntry.durationSec : null,
    timeline,
  };
}

function saveIndex(dataDir, index) {
  const meetingDir = path.join(dataDir, index.meetingId);
  fs.mkdirSync(meetingDir, { recursive: true });
  const indexPath = path.join(meetingDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return indexPath;
}

function loadIndex(dataDir, meetingId) {
  const indexPath = path.join(dataDir, meetingId, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

module.exports = { buildIndex, saveIndex, loadIndex };
