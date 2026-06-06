const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { processMeeting, getStatus } = require('../services/processMeeting');
const { loadIndex } = require('../services/buildIndex');
const { retrieveContext, buildContextBlock } = require('../services/retrieve');
const { askModel } = require('../services/askModel');
const { refineAnswer } = require('../services/groundAnswer');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const meetingId = req.meetingId;
    const dir = path.join(config.uploadDir, meetingId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, file.fieldname + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

router.use((req, _res, next) => {
  if (req.method === 'POST' && req.path === '/') {
    req.meetingId = uuidv4();
  }
  next();
});

router.post('/', upload.fields([
  { name: 'deck', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]), async (req, res) => {
  try {
    const meetingId = req.meetingId;
    const files = req.files;

    if (!files?.deck?.[0] || !files?.audio?.[0] || !files?.video?.[0]) {
      return res.status(400).json({ error: 'deck, audio, and video files are required' });
    }

    res.status(202).json({ meetingId, status: 'processing' });

    processMeeting({
      meetingId,
      files: {
        deck: files.deck[0],
        audio: files.audio[0],
        video: files.video[0],
      },
      dataDir: config.dataDir,
      uploadDir: config.uploadDir,
    }).catch((error) => {
      const statusPath = path.join(config.dataDir, meetingId, 'status.json');
      fs.mkdirSync(path.dirname(statusPath), { recursive: true });
      fs.writeFileSync(statusPath, JSON.stringify({
        status: 'failed',
        message: error.message,
        updatedAt: new Date().toISOString(),
      }, null, 2));
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/demo', async (_req, res) => {
  try {
    const demoDir = path.join(__dirname, '..', 'sample_inputs', 'generated');
    const deckPath = path.join(demoDir, 'deck.pdf');
    const audioPath = path.join(demoDir, 'meeting_audio.wav');
    const videoPath = path.join(demoDir, 'screen_recording.mp4');

    for (const filePath of [deckPath, audioPath, videoPath]) {
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({
          error: 'Demo files not found. Run npm run generate-sample first.',
        });
      }
    }

    const meetingId = uuidv4();
    const uploadMeetingDir = path.join(config.uploadDir, meetingId);
    fs.mkdirSync(uploadMeetingDir, { recursive: true });

    fs.copyFileSync(deckPath, path.join(uploadMeetingDir, 'deck.pdf'));
    fs.copyFileSync(audioPath, path.join(uploadMeetingDir, 'audio.wav'));
    fs.copyFileSync(videoPath, path.join(uploadMeetingDir, 'video.mp4'));

    res.status(202).json({ meetingId, status: 'processing', demo: true });

    processMeeting({
      meetingId,
      files: {
        deck: { path: path.join(uploadMeetingDir, 'deck.pdf') },
        audio: { path: path.join(uploadMeetingDir, 'audio.wav') },
        video: { path: path.join(uploadMeetingDir, 'video.mp4') },
      },
      dataDir: config.dataDir,
      uploadDir: config.uploadDir,
    }).catch((error) => {
      const statusPath = path.join(config.dataDir, meetingId, 'status.json');
      fs.mkdirSync(path.dirname(statusPath), { recursive: true });
      fs.writeFileSync(statusPath, JSON.stringify({
        status: 'failed',
        message: error.message,
        updatedAt: new Date().toISOString(),
      }, null, 2));
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:meetingId/status', (req, res) => {
  const status = getStatus(config.dataDir, req.params.meetingId);
  res.json(status);
});

router.get('/:meetingId/index', (req, res) => {
  const index = loadIndex(config.dataDir, req.params.meetingId);
  if (!index) {
    return res.status(404).json({ error: 'Meeting index not found' });
  }
  res.json(index);
});

router.post('/:meetingId/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    const index = loadIndex(config.dataDir, req.params.meetingId);
    if (!index) {
      return res.status(404).json({ error: 'Meeting index not found' });
    }

    const retrieval = retrieveContext(index, question.trim());
    const contextBlock = buildContextBlock(index, retrieval);
    const modelAnswer = await askModel(question.trim(), contextBlock);
    const finalAnswer = refineAnswer(question.trim(), index, modelAnswer, retrieval);

    res.json({
      question: question.trim(),
      answer: finalAnswer.answer,
      evidence: finalAnswer.evidence,
      retrievedChunks: retrieval.chunks,
      fallbackRetrieval: retrieval.fallback,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
