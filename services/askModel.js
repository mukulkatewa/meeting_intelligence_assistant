const config = require('../config');

async function askModel(question, contextBlock) {
  const systemPrompt = [
    'You are a meeting intelligence assistant.',
    'Answer using evidence from slides, transcript, and video notes.',
    'For cross-modal questions, combine at least two modalities when possible.',
    'Return valid JSON only with this shape:',
    '{"answer":"...", "evidence":[{"type":"slide|audio|video|timeline","ref":"...","quote":"...","speaker":"optional","slideNumber":optional}]}',
    'Do not invent facts not supported by the context.',
  ].join(' ');

  const userPrompt = [
    'Use the meeting context below to answer the question.',
    'Include grounded evidence with slide numbers, timestamps, or speaker names.',
    '',
    contextBlock,
    '',
    `QUESTION: ${question}`,
  ].join('\n');

  const response = await fetch(`${config.modelBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || '';

  return parseModelJson(content);
}

function parseModelJson(content) {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      answer: trimmed,
      evidence: [],
      raw: content,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      answer: parsed.answer || trimmed,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      raw: content,
    };
  } catch (_error) {
    return {
      answer: trimmed,
      evidence: [],
      raw: content,
    };
  }
}

module.exports = { askModel };
