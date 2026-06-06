const fs = require('fs');
const path = require('path');
const { ingestPdf } = require('./ingestPdf');
const { ingestAudio } = require('./ingestAudio');
const { ingestVideo } = require('./ingestVideo');
const { buildIndex, saveIndex } = require('./buildIndex');

async function processMeeting({ meetingId, files, dataDir, uploadDir }) {
  const meetingUploadDir = path.join(uploadDir, meetingId);
  const meetingDataDir = path.join(dataDir, meetingId);
  fs.mkdirSync(meetingDataDir, { recursive: true });

  updateStatus(dataDir, meetingId, 'processing', 'Starting ingestion');

  const slides = await ingestPdf(files.deck.path);

  updateStatus(dataDir, meetingId, 'processing', 'Transcribing meeting audio');

  const transcript = ingestAudio(files.audio.path);

  updateStatus(dataDir, meetingId, 'processing', 'Extracting video frames');

  const videoFrames = ingestVideo(files.video.path, meetingDataDir);

  const index = buildIndex({
    meetingId,
    slides,
    transcript,
    videoFrames,
    sourceFiles: {
      deck: path.basename(files.deck.path),
      audio: path.basename(files.audio.path),
      video: path.basename(files.video.path),
    },
  });

  saveIndex(dataDir, index);

  updateStatus(dataDir, meetingId, 'ready', 'Meeting indexed successfully');

  return index;
}

function updateStatus(dataDir, meetingId, status, message) {
  const statusPath = path.join(dataDir, meetingId, 'status.json');
  fs.mkdirSync(path.dirname(statusPath), { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify({
    status,
    message,
    updatedAt: new Date().toISOString(),
  }, null, 2));
}

function getStatus(dataDir, meetingId) {
  const statusPath = path.join(dataDir, meetingId, 'status.json');
  if (!fs.existsSync(statusPath)) {
    return { status: 'unknown', message: 'Meeting not found' };
  }
  return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
}

module.exports = { processMeeting, updateStatus, getStatus };
