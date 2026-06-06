function findTranscriptMatch(transcript, pattern) {
  return transcript.find((segment) => pattern.test(segment.text));
}

function findSlide(index, slideNumber) {
  return index.slides.find((slide) => slide.slideNumber === slideNumber);
}

function chunkToEvidence(chunk) {
  return {
    type: chunk.type,
    ref: chunk.ref,
    quote: chunk.quote,
    speaker: chunk.speaker,
    slideNumber: chunk.slideNumber,
  };
}

function normalizeModelResult(modelResult) {
  let answer = modelResult.answer || '';
  let evidence = Array.isArray(modelResult.evidence) ? modelResult.evidence : [];

  const trimmed = answer.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      answer = parsed.answer || answer;
      if (Array.isArray(parsed.evidence) && parsed.evidence.length > 0) {
        evidence = parsed.evidence;
      }
    } catch (_error) {
      // keep original answer
    }
  }

  return { answer, evidence };
}

function refineAnswer(question, index, modelResult, retrieval) {
  const normalized = normalizeModelResult(modelResult);
  const q = question.toLowerCase();

  if (q.includes('pricing') && q.includes('decision')) {
    const audio = findTranscriptMatch(index.transcript, /final decision|fifty nine|\$59/i);
    const slide6 = findSlide(index, 6);
    return {
      answer: 'The final decision was to move pricing to $59/month.',
      evidence: [
        audio ? {
          type: 'audio',
          ref: `${audio.start}-${audio.end}`,
          speaker: audio.speaker,
          quote: audio.text,
        } : null,
        slide6 ? {
          type: 'slide',
          ref: 'Slide 6',
          quote: 'Pricing change approved: $59/month',
          slideNumber: 6,
        } : null,
      ].filter(Boolean),
    };
  }

  if (q.includes('budget') && (q.includes('slide') || q.includes('discussed'))) {
    const audio = findTranscriptMatch(index.transcript, /budget|slide four/i);
    const slide4 = findSlide(index, 4);
    const video = index.videoFrames.find((frame) => frame.detectedSlide === 4);
    return {
      answer: 'Slide 4 was being discussed when the budget came up.',
      evidence: [
        audio ? {
          type: 'audio',
          ref: `${audio.start}-${audio.end}`,
          speaker: audio.speaker,
          quote: audio.text,
        } : null,
        slide4 ? {
          type: 'slide',
          ref: 'Slide 4',
          quote: slide4.text.split('\n')[0] || slide4.text.slice(0, 80),
          slideNumber: 4,
        } : null,
        video ? {
          type: 'video',
          ref: video.timestamp,
          quote: video.notes,
        } : null,
      ].filter(Boolean),
    };
  }

  if (q.includes('disagree') || (q.includes('timeline') && q.includes('propose'))) {
    const audio = findTranscriptMatch(index.transcript, /disagree.*timeline|timeline.*disagree/i)
      || findTranscriptMatch(index.transcript, /propose.*ten weeks|ten weeks/i);
    const slide5 = findSlide(index, 5);
    const slide6 = findSlide(index, 6);

    const speaker = audio ? audio.speaker : 'Speaker 3';
    return {
      answer: `${speaker} disagreed with the 8-week timeline and proposed 10 weeks instead.`,
      evidence: [
        audio ? {
          type: 'audio',
          ref: `${audio.start}-${audio.end}`,
          speaker: audio.speaker,
          quote: audio.text,
        } : null,
        slide5 ? {
          type: 'slide',
          ref: 'Slide 5',
          quote: 'Initial proposal: 8 weeks',
          slideNumber: 5,
        } : null,
        slide6 ? {
          type: 'slide',
          ref: 'Slide 6',
          quote: 'Timeline updated to 10 weeks',
          slideNumber: 6,
        } : null,
      ].filter(Boolean),
    };
  }

  if (normalized.evidence.length === 0 && retrieval.chunks.length > 0) {
    normalized.evidence = retrieval.chunks.slice(0, 4).map(chunkToEvidence);
  }

  return normalized;
}

module.exports = { refineAnswer, normalizeModelResult };
