const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const meetingsRouter = require('./routes/meetings');

const app = express();

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/meetings', meetingsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Meeting assistant running on http://0.0.0.0:${config.port}`);
});
