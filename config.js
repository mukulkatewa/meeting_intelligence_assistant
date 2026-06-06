require('dotenv').config();
const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,
  modelBaseUrl: process.env.MODEL_BASE_URL || 'http://127.0.0.1:8000/v1',
  modelName: process.env.MODEL_NAME || 'nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4',
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  whisperScript: path.resolve(process.env.WHISPER_SCRIPT || './scripts/transcribe_audio.py'),
  videoFrameIntervalSec: Number(process.env.VIDEO_FRAME_INTERVAL_SEC) || 5,
};
