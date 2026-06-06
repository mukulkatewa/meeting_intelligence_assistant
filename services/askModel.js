const config = require('../config');
const { parseModelJson } = require('./parseModelJson');

async function askModel(question, contextBlock) {
  const systemPrompt = [
    'You are a meeting intelligence assistant.',
    'Use exact speaker names from the transcript lines.',
    'Combine slide, audio, and video evidence for cross-modal questions.',
    'Return valid JSON only:',
    '{"answer":"plain text answer","evidence":[{"type":"slide|audio|video","ref":"...","quote":"...","speaker":"optional","slideNumber":optional}]}',
    'Do not wrap JSON in markdown.',
    'Do not invent facts not in the context.',
  ].join(' ');

  const userPrompt = [
    'Use the meeting context below.',
    '',
    contextBlock,
    '',
    `QUESTION: ${question}`,
  ].join('\n');

  let response;
  try {
    response = await fetch(`${config.modelBaseUrl}/chat/completions`, {
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
        temperature: 0.1,
        max_tokens: 2048,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED' || error.message === 'fetch failed') {
      throw new Error('Model server is not ready yet. Wait for Nemotron to finish loading on port 8000.');
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const message = payload.choices?.[0]?.message || {};
  let content = message.content || message.reasoning_content || '';

  if (!content && payload.choices?.[0]?.text) {
    content = payload.choices[0].text;
  }

  content = content.replace(/[\s\S]*?<\/think>/gi, '').trim();

  return parseModelJson(content);
}

module.exports = { askModel };
