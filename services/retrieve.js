function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function scoreText(queryTokens, text) {
  const docTokens = new Set(tokenize(text));
  let score = 0;
  for (const token of queryTokens) {
    if (docTokens.has(token)) {
      score += 1;
    }
  }
  return score;
}

function retrieveContext(index, question, limit = 8) {
  const queryTokens = tokenize(question);
  const hits = [];

  for (const slide of index.slides) {
    const score = scoreText(queryTokens, slide.text);
    if (score > 0) {
      hits.push({
        score,
        type: 'slide',
        ref: `Slide ${slide.slideNumber}`,
        quote: slide.text.slice(0, 280),
        slideNumber: slide.slideNumber,
      });
    }
  }

  for (const segment of index.transcript) {
    const score = scoreText(queryTokens, `${segment.speaker} ${segment.text}`);
    if (score > 0) {
      hits.push({
        score,
        type: 'audio',
        ref: `${segment.start}-${segment.end}`,
        speaker: segment.speaker,
        quote: segment.text,
        startSec: segment.startSec,
        endSec: segment.endSec,
      });
    }
  }

  for (const frame of index.videoFrames) {
    const score = scoreText(queryTokens, frame.notes || '');
    if (score > 0) {
      hits.push({
        score,
        type: 'video',
        ref: frame.timestamp,
        quote: frame.notes,
        detectedSlide: frame.detectedSlide,
        timestampSec: frame.timestampSec,
      });
    }
  }

  for (const item of index.timeline) {
    const score = scoreText(queryTokens, `${item.speaker} ${item.text}`) * 0.8;
    if (score > 0) {
      hits.push({
        score,
        type: 'timeline',
        ref: `${item.start}-${item.end}`,
        speaker: item.speaker,
        quote: item.text,
        detectedSlide: item.detectedSlide,
        nearestVideoTimestamp: item.nearestVideoTimestamp,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);

  const topHits = hits.slice(0, limit);
  if (topHits.length === 0) {
    return {
      chunks: [
        ...index.slides.slice(0, 2).map((slide) => ({
          type: 'slide',
          ref: `Slide ${slide.slideNumber}`,
          quote: slide.text.slice(0, 200),
        })),
        ...index.transcript.slice(0, 3).map((segment) => ({
          type: 'audio',
          ref: `${segment.start}-${segment.end}`,
          speaker: segment.speaker,
          quote: segment.text,
        })),
      ],
      fallback: true,
    };
  }

  return { chunks: topHits, fallback: false };
}

function buildContextBlock(index, retrieval) {
  const lines = [];
  lines.push('MEETING SLIDES:');
  for (const slide of index.slides) {
    lines.push(`[Slide ${slide.slideNumber}] ${slide.text}`);
  }

  lines.push('\nMEETING TRANSCRIPT:');
  for (const segment of index.transcript) {
    lines.push(`[${segment.start}-${segment.end}] ${segment.speaker}: ${segment.text}`);
  }

  lines.push('\nVIDEO FRAME NOTES:');
  for (const frame of index.videoFrames) {
    lines.push(`[${frame.timestamp}] ${frame.notes}`);
  }

  lines.push('\nRETRIEVED RELEVANT CHUNKS:');
  for (const chunk of retrieval.chunks) {
    lines.push(`- (${chunk.type}) ${chunk.ref}: ${chunk.quote}`);
  }

  return lines.join('\n');
}

module.exports = { retrieveContext, buildContextBlock };
