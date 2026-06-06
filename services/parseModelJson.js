function stripCodeFence(content) {
  return content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseModelJson(content) {
  const cleaned = stripCodeFence(content.trim());
  const candidates = [cleaned];

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    candidates.push(jsonMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        return {
          answer: parsed.answer || cleaned,
          evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
          raw: content,
        };
      }
    } catch (_error) {
      // try next candidate
    }
  }

  return {
    answer: cleaned,
    evidence: [],
    raw: content,
  };
}

module.exports = { parseModelJson };
