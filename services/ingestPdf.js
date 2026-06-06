const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

function splitIntoSlides(text) {
  const chunks = text
    .split(/\f|\n(?=Slide\s+\d+)/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const slideSize = 8;
    const slides = [];
    for (let i = 0; i < lines.length; i += slideSize) {
      slides.push(lines.slice(i, i + slideSize).join('\n'));
    }
    return slides.length ? slides : [text.trim()];
  }

  return chunks;
}

async function ingestPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(buffer);
  const slideTexts = splitIntoSlides(parsed.text || '');

  return slideTexts.map((text, index) => ({
    slideNumber: index + 1,
    text,
  }));
}

module.exports = { ingestPdf };
