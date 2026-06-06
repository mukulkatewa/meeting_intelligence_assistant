const uploadForm = document.getElementById('upload-form');
const askForm = document.getElementById('ask-form');
const statusText = document.getElementById('status-text');
const askBtn = document.getElementById('ask-btn');
const demoBtn = document.getElementById('demo-btn');
const answerSection = document.getElementById('answer-section');
const answerText = document.getElementById('answer-text');
const evidenceList = document.getElementById('evidence-list');
const questionInput = document.getElementById('question');

let meetingId = null;
let pollTimer = null;

function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = `status ${type || ''}`;
}

async function pollStatus() {
  if (!meetingId) {
    return;
  }

  const response = await fetch(`/api/meetings/${meetingId}/status`);
  const status = await response.json();

  if (status.status === 'ready') {
    clearInterval(pollTimer);
    pollTimer = null;
    setStatus(`Meeting ${meetingId} is ready.`, 'ready');
    askBtn.disabled = false;
    return;
  }

  if (status.status === 'failed') {
    clearInterval(pollTimer);
    pollTimer = null;
    setStatus(`Processing failed: ${status.message}`, 'error');
    askBtn.disabled = true;
    return;
  }

  setStatus(status.message || 'Processing meeting...', 'processing');
}

function startPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  pollTimer = setInterval(pollStatus, 2000);
  pollStatus();
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  askBtn.disabled = true;
  answerSection.hidden = true;

  const formData = new FormData(uploadForm);
  setStatus('Uploading files...', 'processing');

  const response = await fetch('/api/meetings', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    setStatus(payload.error || 'Upload failed', 'error');
    return;
  }

  meetingId = payload.meetingId;
  setStatus('Upload complete. Indexing meeting...', 'processing');
  startPolling();
});

demoBtn.addEventListener('click', async () => {
  askBtn.disabled = true;
  answerSection.hidden = true;
  setStatus('Loading demo meeting...', 'processing');

  const response = await fetch('/api/meetings/demo', { method: 'POST' });
  const payload = await response.json();

  if (!response.ok) {
    setStatus(payload.error || 'Demo load failed', 'error');
    return;
  }

  meetingId = payload.meetingId;
  startPolling();
});

askForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!meetingId) {
    setStatus('Load a meeting first (demo or upload).', 'error');
    return;
  }

  const question = questionInput.value.trim();
  if (!question) {
    return;
  }

  askBtn.disabled = true;
  setStatus('Generating grounded answer...', 'processing');

  try {
    const response = await fetch(`/api/meetings/${meetingId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error || 'Question failed', 'error');
      return;
    }

    let answer = payload.answer || 'No answer returned.';
    let evidence = payload.evidence || [];

    if (typeof answer === 'string' && answer.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(answer.trim());
        answer = parsed.answer || answer;
        if (Array.isArray(parsed.evidence) && parsed.evidence.length > 0) {
          evidence = parsed.evidence;
        }
      } catch (_error) {
        // keep server values
      }
    }

    answerText.textContent = answer;
    evidenceList.innerHTML = '';

    if (evidence.length === 0) {
      const item = document.createElement('li');
      item.textContent = 'No structured evidence returned.';
      evidenceList.appendChild(item);
    } else {
      for (const entry of evidence) {
        const item = document.createElement('li');
        const parts = [
          `[${entry.type || 'source'}]`,
          entry.ref ? `ref: ${entry.ref}` : null,
          entry.speaker ? `speaker: ${entry.speaker}` : null,
          entry.slideNumber ? `slide: ${entry.slideNumber}` : null,
          entry.quote ? `"${entry.quote}"` : null,
        ].filter(Boolean);
        item.textContent = parts.join(' | ');
        evidenceList.appendChild(item);
      }
    }

    answerSection.hidden = false;
    setStatus('Answer ready.', 'ready');
  } catch (error) {
    setStatus(error.message || 'Request failed. Is the app still running?', 'error');
  } finally {
    askBtn.disabled = false;
  }
});

for (const button of document.querySelectorAll('.example-q')) {
  button.addEventListener('click', () => {
    questionInput.value = button.textContent;
  });
}
