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

function ingestPdf(filePath) {
  const scriptPath = path.resolve(__dirname, '../scripts/extract_pdf.py');
  const result = spawnSync(getPythonCommand(), [scriptPath, filePath], {
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(`Failed to extract PDF text: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || 'PDF extraction failed');
  }

  const payload = JSON.parse(result.stdout);
  return payload.slides;
}

module.exports = { ingestPdf };
